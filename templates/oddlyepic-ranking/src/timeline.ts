/**
 * Timeline engine — turns ranking.json (+ prepare.py's state) into frame-exact
 * segments, per-rank playback pieces, meter keyframes and SFX cues.
 *
 * Everything visual reads from the object this returns, so the composition
 * itself never does time arithmetic.
 */
import type { Caption, Entry, PreparedState, RankingConfig, TimeValue } from './config/types';
import { FPS, TRANSITION } from './config/layout';
import { presetLabel, resolveMeter, type ResolvedMeter } from './config/meters';

export const parseTime = (t: TimeValue | null | undefined): number | null => {
  if (t === null || t === undefined || t === '') return null;
  if (typeof t === 'number') return t;
  const parts = t.trim().split(':').map(Number);
  if (parts.some((p) => Number.isNaN(p))) throw new Error(`Bad timestamp "${t}" — use seconds or m:ss.s`);
  return parts.reduce((acc, p) => acc * 60 + p, 0);
};

const sec = (s: number) => Math.max(1, Math.round(s * FPS));

// ---------------------------------------------------------------------------
// Pieces: how one rank's clip is played back (play / slowmo / freeze / replay)
// ---------------------------------------------------------------------------

export type PieceKind = 'play' | 'slowmo' | 'freeze' | 'replay';

export interface Piece {
  kind: PieceKind;
  /** Clip-relative seconds (0 = cutIn). */
  srcStart: number;
  srcEnd: number;
  rate: number;
  /** Local frame within the rank segment. */
  from: number;
  frames: number;
}

export interface Window {
  from: number;
  to: number;
  scale: number;
}

export interface TimedCaption {
  from: number;
  frames: number;
  text: string;
  emphasis?: string;
}

export interface RankSegment {
  kind: 'rank';
  index: number; // 0 = lowest rank shown first
  rank: number;
  entry: Entry;
  label: string;
  level: number;
  prevLevel: number;
  clipSeconds: number;
  pieces: Piece[];
  payoffFrame: number;
  punches: Window[];
  captions: TimedCaption[];
  file: string | null;
  isTop: boolean;
}

export interface BasicSegment {
  kind: 'hook' | 'title' | 'cta';
}

export type Segment = (RankSegment | BasicSegment) & { from: number; frames: number; transitionIn: number };

const buildPieces = (entry: Entry, clipSeconds: number, payoff: number, isTop: boolean, cutIn: number) => {
  const rel = (t: TimeValue | null | undefined) => {
    const v = parseTime(t);
    return v === null ? null : Math.min(Math.max(v - cutIn, 0), clipSeconds);
  };
  const speed = entry.speed ?? 1;

  // 1. main flow, split around an optional slow-mo window
  type Raw = Omit<Piece, 'from' | 'frames'>;
  let flow: Raw[] = [{ kind: 'play', srcStart: 0, srcEnd: clipSeconds, rate: speed }];
  if (entry.slowmo) {
    const a = rel(entry.slowmo.at)!;
    const b = Math.min(a + entry.slowmo.seconds, clipSeconds);
    flow = [
      { kind: 'play' as const, srcStart: 0, srcEnd: a, rate: speed },
      { kind: 'slowmo' as const, srcStart: a, srcEnd: b, rate: entry.slowmo.rate ?? 0.5 },
      { kind: 'play' as const, srcStart: b, srcEnd: clipSeconds, rate: speed },
    ].filter((p) => p.srcEnd - p.srcStart > 0.02);
  }

  // 2. freeze — explicit, or automatic 0.3s on the payoff for #1 (set freeze: null to disable)
  const freeze =
    entry.freeze === undefined ? (isTop ? { at: payoff, seconds: 0.3, relative: true } : null) : entry.freeze;
  let freezeSeconds = 0;
  if (freeze) {
    const f = 'relative' in freeze ? (freeze.at as number) : rel(freeze.at)!;
    freezeSeconds = freeze.seconds;
    const out: Raw[] = [];
    for (const p of flow) {
      if (f > p.srcStart && f < p.srcEnd) {
        out.push({ ...p, srcEnd: f });
        out.push({ kind: 'freeze', srcStart: f, srcEnd: f, rate: 1 });
        out.push({ ...p, srcStart: f });
      } else if (f === p.srcStart && !out.some((o) => o.kind === 'freeze')) {
        out.push({ kind: 'freeze', srcStart: f, srcEnd: f, rate: 1 });
        out.push(p);
      } else out.push(p);
    }
    flow = out;
  }

  // 3. replay after the clip
  if (entry.replay) {
    const a = rel(entry.replay.at)!;
    flow.push({
      kind: 'replay',
      srcStart: a,
      srcEnd: Math.min(a + entry.replay.seconds, clipSeconds),
      rate: entry.replay.rate ?? 0.5,
    });
  }

  let cursor = 0;
  const pieces: Piece[] = flow.map((p) => {
    const frames = p.kind === 'freeze' ? sec(freezeSeconds) : sec((p.srcEnd - p.srcStart) / p.rate);
    const piece = { ...p, from: cursor, frames };
    cursor += frames;
    return piece;
  });

  /** Clip-relative time → first local frame showing it (main flow, not replay). */
  const map = (t: number) => {
    for (const p of pieces) {
      if (p.kind === 'replay') continue;
      if (p.kind === 'freeze' && Math.abs(p.srcStart - t) < 1e-6) return p.from;
      if (p.kind !== 'freeze' && t >= p.srcStart && t <= p.srcEnd) {
        return p.from + Math.round(((t - p.srcStart) / p.rate) * FPS);
      }
    }
    return cursor - 1;
  };

  return { pieces, frames: cursor, map, rel };
};

// ---------------------------------------------------------------------------
// Whole video
// ---------------------------------------------------------------------------

export interface MeterKey {
  frame: number;
  level: number;
  /** snap = jump with overshoot (payoff); ease = smooth glide. */
  mode: 'snap' | 'ease';
}

export interface SfxCue {
  frame: number;
  name: 'whoosh' | 'tick' | 'pop' | 'riser' | 'impact' | 'rewind';
  volume: number;
}

export interface Timeline {
  meter: ResolvedMeter;
  title: string;
  question: string;
  segments: Segment[];
  ranks: RankSegment[];
  meterKeys: MeterKey[];
  sfx: SfxCue[];
  totalFrames: number;
  hookFile: string | null;
  hookRank: RankSegment;
  loop: boolean;
  draft: boolean;
  issues: string[];
}

export const buildTimeline = (cfg: RankingConfig, prep: PreparedState): Timeline => {
  const meter = resolveMeter(cfg.meter);
  // Show in countdown order: highest rank number first, #1 last.
  const entries = [...cfg.entries].sort((a, b) => b.rank - a.rank);
  const n = entries.length;
  const topRank = Math.min(...entries.map((e) => e.rank));

  let prevLevel = 0;
  const ranks: RankSegment[] = entries.map((entry, index) => {
    const cutIn = parseTime(entry.clip.cutIn) ?? 0;
    const cutOut = parseTime(entry.clip.cutOut) ?? cutIn + 3;
    const prepared = prep.clips[String(entry.rank)];
    const clipSeconds = prepared ? prepared.seconds : Math.max(0.5, cutOut - cutIn);
    const isTop = entry.rank === topRank;
    const payoffAbs = parseTime(entry.payoffAt) ?? cutIn + clipSeconds * 0.65;
    const payoff = Math.min(Math.max(payoffAbs - cutIn, 0), clipSeconds);

    const { pieces, frames, map, rel } = buildPieces(entry, clipSeconds, payoff, isTop, cutIn);
    const payoffFrame = map(payoff);

    const punches: Window[] = [];
    const punch = entry.punchIn === undefined && isTop ? { at: payoffAbs, seconds: 1.1, scale: 1.18 } : entry.punchIn;
    if (punch) {
      const a = rel(punch.at)!;
      const from = map(a);
      // Extend across any freeze sitting inside the window.
      const to = Math.max(map(Math.min(a + punch.seconds, clipSeconds)), from + sec(punch.seconds));
      punches.push({ from, to, scale: punch.scale ?? 1.25 });
    }
    for (const p of pieces) if (p.kind === 'replay') punches.push({ from: p.from, to: p.from + p.frames, scale: 1.14 });

    const captions: TimedCaption[] = (entry.captions ?? []).map((c: Caption) => ({
      from: map(rel(c.at)!),
      frames: sec(c.seconds ?? 1.4),
      text: c.text,
      emphasis: c.emphasis,
    }));

    const level = entry.meterLevel ?? Math.round((100 * (index + 1)) / n);
    const seg: RankSegment = {
      kind: 'rank',
      index,
      rank: entry.rank,
      entry,
      label: (entry.label ?? presetLabel(meter, index, n)).toUpperCase(),
      level,
      prevLevel,
      clipSeconds,
      pieces,
      payoffFrame,
      punches,
      captions,
      file: prepared ? prepared.file : null,
      isTop,
    };
    prevLevel = level;
    return seg;
  });

  const hookRank = ranks.find((r) => r.rank === (cfg.hook.fromRank ?? topRank)) ?? ranks[ranks.length - 1];
  const hookFrames = sec(prep.hook?.seconds ?? cfg.hook.seconds ?? 1.0);
  const titleFrames = sec(cfg.titleSeconds ?? 1.0);
  const ctaFrames = sec(cfg.cta.seconds ?? 1.7);

  // Assemble with transition overlaps (TransitionSeries semantics).
  const raw: Array<{ seg: RankSegment | BasicSegment; frames: number; transitionIn: number }> = [
    { seg: { kind: 'hook' }, frames: hookFrames, transitionIn: 0 },
    { seg: { kind: 'title' }, frames: titleFrames, transitionIn: TRANSITION.hookToTitle },
    ...ranks.map((r, i) => ({
      seg: r,
      frames: r.pieces.reduce((a, p) => a + p.frames, 0),
      // title → first rank is a hard continuation (title sits on that clip's first frame)
      transitionIn: i === 0 ? 0 : r.isTop ? TRANSITION.intoNumberOne : TRANSITION.betweenRanks,
    })),
    { seg: { kind: 'cta' }, frames: ctaFrames, transitionIn: 0 },
  ];
  let cursor = 0;
  const segments: Segment[] = raw.map(({ seg, frames, transitionIn }, i) => {
    const t = Math.min(transitionIn, frames - 1, i > 0 ? raw[i - 1].frames - 1 : 0);
    const from = i === 0 ? 0 : cursor - t;
    cursor = from + frames;
    return { ...seg, from, frames, transitionIn: t } as Segment;
  });
  const totalFrames = cursor;
  const startOf = (r: RankSegment) => segments.find((s) => s.kind === 'rank' && (s as RankSegment).rank === r.rank)!.from;

  // Meter: tease at the hook rank's level → rewind to 0 under the title →
  // creep toward each level before the payoff → snap at the payoff → hold max to the end.
  const hookSeg = segments[0];
  const titleSeg = segments[1];
  const meterKeys: MeterKey[] = [
    { frame: 0, level: hookRank.level, mode: 'snap' },
    { frame: titleSeg.from, level: hookRank.level, mode: 'ease' },
    { frame: titleSeg.from + titleSeg.frames, level: 0, mode: 'ease' },
  ];
  const sfx: SfxCue[] = [{ frame: titleSeg.from, name: 'rewind', volume: 0.55 }];
  ranks.forEach((r, i) => {
    const start = startOf(r);
    const payoff = start + r.payoffFrame;
    const creep = r.prevLevel + (r.level - r.prevLevel) * 0.3;
    meterKeys.push({ frame: start, level: r.prevLevel, mode: 'ease' });
    meterKeys.push({ frame: payoff, level: creep, mode: 'ease' });
    meterKeys.push({ frame: payoff, level: r.level, mode: 'snap' });
    if (i > 0) sfx.push({ frame: start, name: 'whoosh', volume: 0.35 });
    sfx.push({ frame: payoff, name: 'tick', volume: 0.5 });
    sfx.push({ frame: payoff + 2, name: 'pop', volume: 0.3 });
    if (r.isTop) {
      sfx.push({ frame: Math.max(0, start - 36), name: 'riser', volume: 0.32 });
      sfx.push({ frame: payoff, name: 'impact', volume: 0.6 });
    }
  });
  const cta = segments[segments.length - 1];
  sfx.push({ frame: cta.from, name: 'pop', volume: 0.35 });
  sfx.push({ frame: hookSeg.from + Math.max(0, hookFrames - 3), name: 'tick', volume: 0.35 });

  const issues = [...prep.gate.issues];
  if (!prep.prepared) issues.unshift('Clips not prepared — run `npm run prepare-draft` (placeholders shown).');

  return {
    meter,
    title: cfg.title,
    question: cfg.cta.question ?? meter.question.replace('1–5', n === 5 ? '1–5' : `1–${n}`),
    segments,
    ranks,
    meterKeys: meterKeys.sort((a, b) => a.frame - b.frame || (a.mode === 'snap' ? 1 : -1)),
    sfx: sfx.filter((s) => s.frame >= 0 && s.frame < totalFrames),
    totalFrames,
    hookFile: prep.hook?.file ?? null,
    hookRank,
    loop: cfg.loop ?? true,
    draft: !prep.gate.final,
    issues,
  };
};

/** Meter level + frames since the most recent snap, at a global frame. */
export const meterAt = (keys: MeterKey[], frame: number): { level: number; sinceSnap: number; snapLevel: number } => {
  let level = keys[0]?.level ?? 0;
  let sinceSnap = Infinity;
  let snapLevel = 0;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (k.frame > frame) {
      const prev = keys[i - 1];
      if (prev && k.mode === 'ease' && k.frame > prev.frame) {
        const t = (frame - prev.frame) / (k.frame - prev.frame);
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        level = prev.level + (k.level - prev.level) * eased;
      }
      break;
    }
    level = k.level;
    if (k.mode === 'snap') {
      sinceSnap = frame - k.frame;
      snapLevel = k.level;
    }
  }
  return { level, sinceSnap, snapLevel };
};
