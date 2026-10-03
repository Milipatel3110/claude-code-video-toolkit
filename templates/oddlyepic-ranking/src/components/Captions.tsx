/**
 * Reaction captions: short, word-by-word pop, one accent word.
 * Sits above the platform's bottom overlay and clear of the right action rail.
 */
import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { brand } from '../config/brand';
import { fonts } from '../config/fonts';
import { SAFE, UI, WIDTH } from '../config/layout';
import type { TimedCaption } from '../timeline';

const STROKE = '0 0 2px #000, 0 3px 0 #000, 3px 0 0 #000, -3px 0 0 #000, 0 -3px 0 #000, 0 8px 24px rgba(0,0,0,0.6)';

export const Captions: React.FC<{ captions: TimedCaption[]; accent: string }> = ({ captions, accent }) => {
  const frame = useCurrentFrame();
  const active = captions.filter((c) => frame >= c.from && frame < c.from + c.frames);
  if (!active.length) return null;
  const c = active[active.length - 1];
  const t = frame - c.from;
  const out = interpolate(t, [c.frames - 5, c.frames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const words = c.text.split(/\s+/);
  const emph = c.emphasis?.toLowerCase();

  return (
    <div
      style={{
        position: 'absolute',
        left: SAFE.left,
        width: WIDTH - SAFE.left - SAFE.railWidth,
        top: UI.captionY,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '0 18px',
        opacity: out,
      }}
    >
      {words.map((w, i) => {
        const wt = t - i * 2;
        const pop = interpolate(wt, [0, 4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const hit = emph && w.toLowerCase().replace(/[^\p{L}\p{N}.?!]/gu, '') === emph.replace(/[^\p{L}\p{N}.?!]/gu, '');
        return (
          <span
            key={i}
            style={{
              fontFamily: fonts.body,
              fontWeight: 800,
              fontSize: hit ? 76 : 66,
              lineHeight: 1.2,
              color: hit ? accent : brand.colors.paper,
              textShadow: STROKE,
              opacity: pop,
              transform: `translateY(${(1 - pop) * 18}px) scale(${0.85 + pop * 0.15})`,
              display: 'inline-block',
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};
