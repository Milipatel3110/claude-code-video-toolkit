/**
 * Stand-in for an unprepared clip. Shows what footage the slot needs and how
 * it will be cut, so the whole Short can be previewed before sourcing.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { brand } from '../config/brand';
import { fonts } from '../config/fonts';
import { FPS } from '../config/layout';
import { alpha } from '../color';
import type { RankSegment } from '../timeline';

export const Placeholder: React.FC<{ seg: RankSegment; accent: string }> = ({ seg, accent }) => {
  const frame = useCurrentFrame();
  const piece = seg.pieces.find((p) => frame >= p.from && frame < p.from + p.frames);
  const plan = seg.pieces
    .map((p) => `${p.kind}${p.kind === 'freeze' ? ` ${(p.frames / FPS).toFixed(1)}s` : ` ${(p.srcEnd - p.srcStart).toFixed(1)}s`}${p.rate !== 1 && p.kind !== 'freeze' ? ` @${p.rate}x` : ''}`)
    .join('  →  ');
  return (
    <AbsoluteFill
      style={{
        background: `repeating-linear-gradient(-45deg, ${alpha(accent, 0.07)} 0 40px, transparent 40px 80px), radial-gradient(circle at 50% 45%, #23232b, ${brand.colors.ink} 75%)`,
        backgroundPosition: `${frame * 2}px 0, 0 0`,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 110,
        textAlign: 'center',
        color: brand.colors.paper,
      }}
    >
      <div style={{ fontFamily: fonts.mono, fontSize: 30, letterSpacing: 6, color: accent }}>CLIP NEEDED · #{seg.rank}</div>
      <div style={{ fontFamily: fonts.body, fontWeight: 800, fontSize: 54, lineHeight: 1.15, marginTop: 28 }}>
        {seg.entry.description ?? 'Describe the moment in ranking.json → entries[].description'}
      </div>
      <div style={{ fontFamily: fonts.mono, fontSize: 24, marginTop: 40, color: brand.colors.muted, lineHeight: 1.6 }}>{plan}</div>
      {piece && piece.kind !== 'play' && (
        <div style={{ marginTop: 34, fontFamily: fonts.mono, fontSize: 34, padding: '8px 22px', border: `2px solid ${accent}`, color: accent, borderRadius: 10 }}>
          {piece.kind.toUpperCase()}
        </div>
      )}
      {/* moving marker so motion/punch-ins read in preview */}
      <div style={{ position: 'absolute', bottom: 560, left: `${10 + ((frame * 3) % 80)}%`, width: 26, height: 26, borderRadius: 13, background: accent }} />
    </AbsoluteFill>
  );
};
