/**
 * OddlyEpic RankReel — the reusable ranking Short.
 *
 *   hook (≈1s, a fragment of #1, meter MAXED)
 *   → title (≈1s, meter rewinds to 0)
 *   → #5 … #1 (meter creeps, snaps at each payoff, overloads at #1)
 *   → CTA question + rank ladder (≈1.7s) → dissolves back into the hook frame
 *
 * Footage layers run in a TransitionSeries (shared lib/transitions); the meter,
 * rank tags, captions, SFX and safety overlays sit above it on the global clock.
 * Content comes from ranking.json, media state from src/generated/prepared.json.
 */
import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { TransitionSeries, linearTiming, type TransitionPresentation } from '@remotion/transitions';
import { glitch, rgbSplit, zoomBlur } from '../../../lib/transitions';
import ranking from '../ranking.json';
import prepared from './generated/prepared.json';
import type { PreparedState, RankingConfig } from './config/types';
import { brand } from './config/brand';
import { buildTimeline, type RankSegment, type Segment } from './timeline';
import { Meter } from './components/Meter';
import { RankClip } from './components/Clip';
import { RankTag } from './components/RankTag';
import { Captions } from './components/Captions';
import { CtaScene, DraftBand, Flash, HookScene, SafeZones, TitleScene } from './components/Scenes';
import { mix } from './color';

export type RankReelProps = { showSafeZones: boolean };

const cfg = ranking as unknown as RankingConfig;
const prep = prepared as unknown as PreparedState;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const presentationFor = (seg: Segment): TransitionPresentation<any> => {
  if (seg.kind === 'title') return glitch({ intensity: 0.75, slices: 10 });
  if (seg.kind === 'rank' && (seg as RankSegment).isTop) return rgbSplit({ direction: 'diagonal', displacement: 42 });
  return zoomBlur({ blurAmount: 16, scaleAmount: 1.1 });
};

export const RankReel: React.FC<RankReelProps> = ({ showSafeZones }) => {
  const tl = buildTimeline(cfg, prep);
  const frame = useCurrentFrame();
  const clipVolume = cfg.audio.clipVolume ?? 1;
  const [cold, hot] = tl.meter.colors;
  const rankSegs = tl.segments.filter((s): s is Segment & RankSegment => s.kind === 'rank');
  const next = (s: Segment) => tl.segments[tl.segments.indexOf(s) + 1];
  const musicVol = cfg.audio.musicVolume ?? 0.1;

  return (
    <AbsoluteFill style={{ backgroundColor: brand.colors.ink }}>
      {/* ---------------- footage ---------------- */}
      <TransitionSeries>
        {tl.segments.flatMap((seg, i) => {
          const items = [];
          if (i > 0 && seg.transitionIn > 0) {
            items.push(
              <TransitionSeries.Transition
                key={`t${i}`}
                presentation={presentationFor(seg)}
                timing={linearTiming({ durationInFrames: seg.transitionIn })}
              />,
            );
          }
          items.push(
            <TransitionSeries.Sequence key={`s${i}`} durationInFrames={seg.frames}>
              {seg.kind === 'hook' && <HookScene tl={tl} clipVolume={clipVolume} />}
              {seg.kind === 'title' && <TitleScene tl={tl} />}
              {seg.kind === 'rank' && (
                <RankClip
                  seg={seg as RankSegment}
                  clipVolume={clipVolume}
                  ducked={!!(seg as RankSegment).entry.voiceover}
                  accent={mix(cold, hot, (seg as RankSegment).level / 100)}
                />
              )}
              {seg.kind === 'cta' && <CtaScene tl={tl} />}
            </TransitionSeries.Sequence>,
          );
          return items;
        })}
      </TransitionSeries>

      {/* ---------------- rank overlays (global clock) ---------------- */}
      {rankSegs.map((seg) => {
        const until = next(seg)?.from ?? tl.totalFrames;
        const accent = mix(cold, hot, seg.level / 100);
        const local = frame - seg.from;
        const inReplay = seg.pieces.some((p) => p.kind === 'replay' && local >= p.from && local < p.from + p.frames);
        return (
          <Sequence key={seg.rank} from={seg.from} durationInFrames={until - seg.from} layout="none">
            <RankTag seg={seg} colors={tl.meter.colors} replay={inReplay} />
            <Captions captions={seg.captions} accent={accent} />
            {seg.isTop && <Flash at={seg.payoffFrame} color={hot} />}
            {seg.entry.voiceover && <Audio src={staticFile(seg.entry.voiceover)} />}
          </Sequence>
        );
      })}

      {/* ---------------- the meter: always on ---------------- */}
      <Meter meter={tl.meter} keys={tl.meterKeys} />

      {/* ---------------- sound design ---------------- */}
      {prep.sfx && cfg.audio.sfx !== false &&
        tl.sfx.map((cue, i) => (
          <Sequence key={`sfx${i}`} from={cue.frame} layout="none">
            <Audio src={staticFile(`sfx/${cue.name}.wav`)} volume={cue.volume * (cfg.audio.sfxVolume ?? 0.5) * 2} />
          </Sequence>
        ))}
      {cfg.audio.music && (
        <Audio
          src={staticFile(cfg.audio.music)}
          loop
          volume={(f) =>
            musicVol *
            interpolate(f, [0, 10, tl.totalFrames - 12, tl.totalFrames], [0, 1, 1, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })
          }
        />
      )}

      {/* ---------------- safety + guides ---------------- */}
      {tl.draft && <DraftBand issues={tl.issues} />}
      {showSafeZones && <SafeZones />}
    </AbsoluteFill>
  );
};
