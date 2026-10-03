/**
 * THE ODDLYEPIC METER
 *
 * A compact HUD strip in the top safe band. 20 skewed segments light up
 * cold → hot. Between payoffs it creeps (anticipation); on each payoff it snaps
 * with a flash and a readout bump; at 100% it overloads (MAXED, glow, shake).
 *
 * Signature loop: the Short opens with the meter already MAXED (teasing #1),
 * rewinds to 0% under the title, climbs back, and ends maxed again — so the
 * last frame matches the first.
 */
import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { brand } from '../config/brand';
import { fonts } from '../config/fonts';
import { SAFE, UI, WIDTH } from '../config/layout';
import { alpha, mix } from '../color';
import { meterAt, type MeterKey } from '../timeline';
import type { ResolvedMeter } from '../config/meters';

const SEGMENTS = 20;

export const Meter: React.FC<{ meter: ResolvedMeter; keys: MeterKey[] }> = ({ meter, keys }) => {
  const frame = useCurrentFrame();
  const { level, sinceSnap, snapLevel } = meterAt(keys, frame);
  const [cold, hot] = meter.colors;
  const maxed = level >= 99.5;
  const lit = (level / 100) * SEGMENTS;

  // Snap feedback decays over ~10 frames.
  const snap = sinceSnap < 12 ? interpolate(sinceSnap, [0, 12], [1, 0], { extrapolateRight: 'clamp' }) : 0;
  const overload = maxed ? 0.55 + 0.45 * Math.abs(Math.sin(frame / 5)) : 0;
  const shake = maxed && sinceSnap < 14 && snapLevel >= 99.5 ? Math.sin(sinceSnap * 2.6) * (14 - sinceSnap) * 0.7 : 0;
  const readoutColor = mix(cold, hot, level / 100);

  return (
    <div
      style={{
        position: 'absolute',
        left: SAFE.left,
        width: WIDTH - SAFE.left - SAFE.right,
        top: UI.meterY,
        height: UI.meterHeight,
        transform: `translateX(${shake}px)`,
        display: 'flex',
        alignItems: 'center',
        gap: 22,
        padding: '0 26px',
        borderRadius: 20,
        background: brand.colors.glass,
        border: `2px solid ${maxed ? alpha(hot, 0.5 + overload * 0.5) : brand.colors.glassBorder}`,
        boxShadow: maxed ? `0 0 ${30 + overload * 40}px ${alpha(hot, 0.45 * overload)}` : '0 8px 30px rgba(0,0,0,0.35)',
        backdropFilter: 'blur(14px)',
      }}
    >
      <div
        style={{
          fontFamily: fonts.mono,
          fontWeight: 700,
          fontSize: 28,
          letterSpacing: 3,
          color: brand.colors.paper,
          whiteSpace: 'nowrap',
          lineHeight: 1.05,
        }}
      >
        {meter.name}
        <div style={{ fontSize: 17, letterSpacing: 5, color: maxed ? hot : brand.colors.muted, fontWeight: 500 }}>
          {maxed && Math.floor(frame / 4) % 4 !== 0 ? 'MAXED' : 'METER'}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 5, height: 30, alignItems: 'stretch' }}>
        {Array.from({ length: SEGMENTS }, (_, i) => {
          const fill = Math.min(Math.max(lit - i, 0), 1);
          const c = mix(cold, hot, i / (SEGMENTS - 1));
          const fresh = snap > 0 && i < (snapLevel / 100) * SEGMENTS && i >= ((snapLevel - 20) / 100) * SEGMENTS;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                transform: `skewX(-14deg) scaleY(${fresh ? 1 + snap * 0.35 : 1})`,
                borderRadius: 3,
                background: brand.colors.track,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: `${fill * 100}%`,
                  background: fresh ? mix(c, '#ffffff', snap * 0.8) : c,
                  boxShadow: fill > 0 ? `0 0 12px ${alpha(c, 0.55 + overload * 0.4)}` : undefined,
                }}
              />
            </div>
          );
        })}
      </div>

      <div
        style={{
          fontFamily: fonts.mono,
          fontWeight: 700,
          fontSize: 38,
          minWidth: 112,
          textAlign: 'right',
          color: readoutColor,
          transform: `scale(${1 + snap * 0.28})`,
          transformOrigin: 'right center',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {String(Math.round(level)).padStart(3, '0')}%
      </div>
    </div>
  );
};
