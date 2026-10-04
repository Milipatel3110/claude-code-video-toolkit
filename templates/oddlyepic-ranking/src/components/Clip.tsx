/**
 * Footage layer for one rank: plays its pieces (play / slowmo / freeze /
 * replay), applies 9:16 framing (cover crop toward the focus point, or
 * blurfill for wide shots) and punch-ins. Falls back to a placeholder card
 * when the clip hasn't been prepared, so the format previews with no footage.
 */
import React from 'react';
import { AbsoluteFill, Freeze, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import type { Framing } from '../config/types';
import { FPS } from '../config/layout';
import type { RankSegment, Window } from '../timeline';
import { Placeholder } from './Placeholder';

export const Framed: React.FC<{
  file: string;
  framing?: Framing;
  trimBefore: number;
  rate?: number;
  muted?: boolean;
  volume?: number;
}> = ({ file, framing, trimBefore, rate = 1, muted = false, volume = 1 }) => {
  const fx = (framing?.focusX ?? 0.5) * 100;
  const fy = (framing?.focusY ?? 0.5) * 100;
  const src = staticFile(file);
  const common = { src, trimBefore, playbackRate: rate } as const;
  if (framing?.mode === 'blurfill') {
    return (
      <AbsoluteFill>
        <OffthreadVideo
          {...common}
          muted
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(38px) brightness(0.55) saturate(1.2)', transform: 'scale(1.2)' }}
        />
        <OffthreadVideo {...common} muted={muted} volume={volume} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
      </AbsoluteFill>
    );
  }
  return (
    <OffthreadVideo
      {...common}
      muted={muted}
      volume={volume}
      style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${fx}% ${fy}%` }}
    />
  );
};

/** Punch-in envelope: 5-frame ease in, hold, 6-frame ease out. */
export const punchScale = (windows: Window[], frame: number) => {
  let s = 1;
  for (const w of windows) {
    if (frame < w.from - 1 || frame > w.to + 6) continue;
    const env = interpolate(frame, [w.from, w.from + 5, w.to, w.to + 6], [0, 1, 1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    s = Math.max(s, 1 + (w.scale - 1) * env);
  }
  return s;
};

export const RankClip: React.FC<{ seg: RankSegment; clipVolume: number; ducked: boolean; accent: string }> = ({
  seg,
  clipVolume,
  ducked,
  accent,
}) => {
  const frame = useCurrentFrame();
  const framing = seg.entry.framing;
  const scale = punchScale(seg.punches, frame) * (framing?.zoom ?? 1);
  const origin = `${(framing?.focusX ?? 0.5) * 100}% ${(framing?.focusY ?? 0.5) * 100}%`;
  const vol = clipVolume * (ducked ? 0.35 : 1);

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: origin }}>
        {seg.file ? (
          seg.pieces.map((p, i) => (
            <Sequence key={i} from={p.from} durationInFrames={p.frames} layout="none">
              {p.kind === 'freeze' ? (
                <Freeze frame={0}>
                  <AbsoluteFill>
                    <Framed file={seg.file!} framing={framing} trimBefore={Math.round(p.srcStart * FPS)} muted />
                  </AbsoluteFill>
                </Freeze>
              ) : (
                <AbsoluteFill>
                  <Framed
                    file={seg.file!}
                    framing={framing}
                    trimBefore={Math.round(p.srcStart * FPS)}
                    rate={p.rate}
                    // Slowed / replayed audio sounds broken — let SFX carry those moments.
                    muted={p.rate < 0.95 || p.kind === 'replay'}
                    volume={vol}
                  />
                </AbsoluteFill>
              )}
            </Sequence>
          ))
        ) : (
          <Placeholder seg={seg} accent={accent} />
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
