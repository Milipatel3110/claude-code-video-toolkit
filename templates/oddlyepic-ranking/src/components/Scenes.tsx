/**
 * Hook, title and CTA scenes. None of them use a logo or a card background:
 * each sits on real footage (or the placeholder) so the video never stops
 * looking like the video.
 */
import React from 'react';
import { AbsoluteFill, Freeze, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { brand } from '../config/brand';
import { fonts } from '../config/fonts';
import { FPS, HEIGHT, SAFE, WIDTH } from '../config/layout';
import { mix } from '../color';
import type { RankSegment, Timeline } from '../timeline';
import { Framed } from './Clip';
import { Placeholder } from './Placeholder';

/** A single still frame of a rank's clip (clip-relative frame), placeholder if unprepared. */
export const Still: React.FC<{ seg: RankSegment; atFrame: number; accent: string }> = ({ seg, atFrame, accent }) => (
  <Freeze frame={seg.file ? 0 : atFrame}>
    <AbsoluteFill>
      {seg.file ? (
        <Framed file={seg.file} framing={seg.entry.framing} trimBefore={Math.max(0, atFrame)} muted />
      ) : (
        <Placeholder seg={seg} accent={accent} />
      )}
    </AbsoluteFill>
  </Freeze>
);

/** Clip-relative frame shown at a rank's payoff (accounts for speed/slowmo). */
const payoffSourceFrame = (seg: RankSegment) => {
  const p = seg.pieces.find((x) => seg.payoffFrame >= x.from && seg.payoffFrame < x.from + x.frames) ?? seg.pieces[0];
  const t = p.kind === 'freeze' ? p.srcStart : p.srcStart + ((seg.payoffFrame - p.from) / FPS) * p.rate;
  return Math.round(t * FPS);
};

export const HookScene: React.FC<{ tl: Timeline; clipVolume: number }> = ({ tl, clipVolume }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const push = interpolate(frame, [0, durationInFrames], [1.04, 1.14]);
  const seg = tl.hookRank;
  const fx = (seg.entry.framing?.focusX ?? 0.5) * 100;
  const fy = (seg.entry.framing?.focusY ?? 0.5) * 100;
  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: `${fx}% ${fy}%` }}>
        {tl.hookFile ? (
          <Framed file={tl.hookFile} framing={seg.entry.framing} trimBefore={0} volume={clipVolume} />
        ) : (
          <Placeholder seg={seg} accent={tl.meter.colors[1]} />
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const TitleScene: React.FC<{ tl: Timeline }> = ({ tl }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const first = tl.ranks[0];
  const dim = interpolate(frame, [0, 4, durationInFrames - 6, durationInFrames], [0.25, 0.62, 0.62, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const words = tl.title.split(/\s+/);
  const textOut = interpolate(frame, [durationInFrames - 6, durationInFrames], [1, 0], { extrapolateLeft: 'clamp' });
  return (
    <AbsoluteFill>
      <Still seg={first} atFrame={0} accent={tl.meter.colors[0]} />
      <AbsoluteFill style={{ backgroundColor: `rgba(0,0,0,${dim})` }} />
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          padding: `0 ${SAFE.left + 20}px`,
          paddingBottom: 140,
          opacity: textOut,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 26px' }}>
          {words.map((w, i) => {
            const t = interpolate(frame - i * 2, [0, 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            return (
              <span
                key={i}
                style={{
                  fontFamily: fonts.display,
                  fontSize: words.length > 5 ? 96 : 112,
                  lineHeight: 1.02,
                  color: brand.colors.paper,
                  textShadow: '0 6px 0 #000, 0 14px 40px rgba(0,0,0,0.6)',
                  opacity: t,
                  transform: `translateY(${(1 - t) * 40}px)`,
                  display: 'inline-block',
                  textAlign: 'center',
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const CtaScene: React.FC<{ tl: Timeline }> = ({ tl }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const top = tl.ranks[tl.ranks.length - 1];
  const [cold, hot] = tl.meter.colors;
  const inT = interpolate(frame, [0, 6], [0, 1], { extrapolateRight: 'clamp' });
  // Loop: the final frames dissolve into the opening hook frame.
  const loopMix = tl.loop ? interpolate(frame, [durationInFrames - 9, durationInFrames - 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
  return (
    <AbsoluteFill>
      <Still seg={top} atFrame={payoffSourceFrame(top)} accent={hot} />
      <AbsoluteFill style={{ backgroundColor: `rgba(0,0,0,${0.62 * inT})` }} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: `0 ${SAFE.left + 10}px`, paddingBottom: 180 }}>
        <div
          style={{
            fontFamily: fonts.display,
            fontSize: 92,
            lineHeight: 1.05,
            textAlign: 'center',
            color: brand.colors.paper,
            textShadow: '0 6px 0 #000',
            transform: `scale(${interpolate(inT, [0, 1], [1.25, 1])})`,
            opacity: inT,
          }}
        >
          {/* keep vote ranges like "1–5?" from splitting across lines */}
          {tl.question.split(/(\d+\s*[–-]\s*\d+\??)/).map((part, i) =>
            i % 2 ? (
              <span key={i} style={{ whiteSpace: 'nowrap' }}>
                {part}
              </span>
            ) : (
              part
            ),
          )}
        </div>
        <div style={{ marginTop: 46, display: 'flex', flexDirection: 'column', gap: 10, width: WIDTH - 2 * (SAFE.left + 90) }}>
          {tl.ranks.map((r, i) => {
            const t = interpolate(frame - 3 - i * 2, [0, 5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            return (
              <div
                key={r.rank}
                style={{
                  display: 'flex',
                  gap: 18,
                  alignItems: 'baseline',
                  fontFamily: fonts.mono,
                  fontWeight: 700,
                  fontSize: 30,
                  color: mix(cold, hot, r.level / 100),
                  opacity: t,
                  transform: `translateX(${(1 - t) * -30}px)`,
                }}
              >
                <span style={{ minWidth: 70 }}>#{r.rank}</span>
                <span style={{ color: brand.colors.paper }}>{r.label}</span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      {loopMix > 0 && (
        <AbsoluteFill style={{ opacity: loopMix }}>
          <LoopFrame tl={tl} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

const LoopFrame: React.FC<{ tl: Timeline }> = ({ tl }) => {
  const seg = tl.hookRank;
  const fx = (seg.entry.framing?.focusX ?? 0.5) * 100;
  const fy = (seg.entry.framing?.focusY ?? 0.5) * 100;
  return (
    <Freeze frame={0}>
      <AbsoluteFill style={{ transform: 'scale(1.04)', transformOrigin: `${fx}% ${fy}%`, backgroundColor: '#000' }}>
        {tl.hookFile ? (
          <Framed file={tl.hookFile} framing={seg.entry.framing} trimBefore={0} muted />
        ) : (
          <Placeholder seg={seg} accent={tl.meter.colors[1]} />
        )}
      </AbsoluteFill>
    </Freeze>
  );
};

/** #1 payoff flash. */
export const Flash: React.FC<{ at: number; color: string }> = ({ at, color }) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0 || t > 8) return null;
  return <AbsoluteFill style={{ backgroundColor: color, opacity: interpolate(t, [0, 8], [0.55, 0]), mixBlendMode: 'screen' }} />;
};

export const DraftBand: React.FC<{ issues: string[] }> = ({ issues }) => (
  <AbsoluteFill style={{ pointerEvents: 'none' }}>
    <div
      style={{
        position: 'absolute',
        top: HEIGHT / 2 - 40,
        left: -200,
        width: WIDTH + 400,
        transform: 'rotate(-28deg)',
        background: 'rgba(220, 20, 40, 0.78)',
        color: '#fff',
        fontFamily: fonts.mono,
        fontWeight: 700,
        fontSize: 34,
        letterSpacing: 4,
        textAlign: 'center',
        padding: '14px 0',
      }}
    >
      DRAFT · RIGHTS NOT CLEARED · DO NOT PUBLISH
    </div>
    <div style={{ position: 'absolute', bottom: 40, left: 40, right: 40, fontFamily: fonts.mono, fontSize: 18, color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.55)', padding: 12, borderRadius: 8 }}>
      {issues.slice(0, 4).map((i) => (
        <div key={i}>• {i}</div>
      ))}
      {issues.length > 4 && <div>…+{issues.length - 4} more (npm run check)</div>}
    </div>
  </AbsoluteFill>
);

export const SafeZones: React.FC = () => {
  const zone = { position: 'absolute' as const, background: 'rgba(255,0,90,0.22)', border: '2px dashed rgba(255,0,90,0.8)' };
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ ...zone, top: 0, left: 0, right: 0, height: SAFE.top }} />
      <div style={{ ...zone, bottom: 0, left: 0, right: 0, height: SAFE.bottom }} />
      <div style={{ ...zone, top: SAFE.railTop, right: 0, width: SAFE.railWidth, bottom: SAFE.bottom }} />
      <div style={{ position: 'absolute', top: SAFE.top + 4, right: 12, fontFamily: fonts.mono, fontSize: 20, color: '#ff4f8b' }}>SAFE-ZONE GUIDE (not rendered)</div>
    </AbsoluteFill>
  );
};
