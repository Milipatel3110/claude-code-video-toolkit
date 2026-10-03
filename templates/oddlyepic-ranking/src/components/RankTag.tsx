/**
 * Rank number + reaction label, top-left under the meter.
 * The number arrives with the clip; the label slams in on the payoff,
 * in sync with the meter snap. #1 gets the hot colour, a bigger slam and shake.
 */
import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { brand } from '../config/brand';
import { fonts } from '../config/fonts';
import { SAFE, UI, WIDTH } from '../config/layout';
import { mix } from '../color';
import type { RankSegment } from '../timeline';

export const RankTag: React.FC<{ seg: RankSegment; colors: [string, string]; replay: boolean }> = ({ seg, colors, replay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tint = mix(colors[0], colors[1], seg.level / 100);

  const enter = spring({ frame, fps, config: { damping: 14, stiffness: 180 } });
  const sinceLabel = frame - seg.payoffFrame;
  const slam = sinceLabel >= 0 ? spring({ frame: sinceLabel, fps, config: { damping: seg.isTop ? 9 : 13, stiffness: 260 } }) : 0;
  const shake = seg.isTop && sinceLabel >= 0 && sinceLabel < 12 ? Math.sin(sinceLabel * 3) * (12 - sinceLabel) * 0.9 : 0;
  const numberSize = seg.isTop ? 150 : 128;

  return (
    <div
      style={{
        position: 'absolute',
        left: SAFE.left - 4,
        top: UI.rankTagY,
        maxWidth: WIDTH - SAFE.left - SAFE.right,
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 18,
        transform: `translateX(${interpolate(enter, [0, 1], [-60, 0]) + shake}px)`,
        opacity: enter,
      }}
    >
      <div
        style={{
          fontFamily: fonts.display,
          fontSize: numberSize,
          lineHeight: 0.9,
          color: seg.isTop ? tint : brand.colors.paper,
          textShadow: `6px 6px 0 ${seg.isTop ? brand.colors.ink : tint}, 0 10px 40px rgba(0,0,0,0.5)`,
          letterSpacing: -4,
        }}
      >
        #{seg.rank}
      </div>
      {sinceLabel >= 0 && (
        <div
          style={{
            fontFamily: fonts.display,
            fontSize: seg.isTop ? 58 : 48,
            lineHeight: 1,
            padding: '12px 20px 10px',
            background: tint,
            color: brand.colors.ink,
            borderRadius: 8,
            transform: `skewX(-8deg) scale(${interpolate(slam, [0, 1], [1.7, 1])}) rotate(${interpolate(slam, [0, 1], [-6, -2])}deg)`,
            transformOrigin: 'left center',
            opacity: Math.min(1, slam * 3),
            boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
            whiteSpace: 'nowrap',
          }}
        >
          {seg.label}
        </div>
      )}
      {replay && (
        <div
          style={{
            flexBasis: '100%',
            fontFamily: fonts.mono,
            fontWeight: 700,
            fontSize: 24,
            letterSpacing: 5,
            color: brand.colors.paper,
            opacity: 0.55 + 0.45 * Math.abs(Math.sin(frame / 6)),
          }}
        >
          ◀◀ REPLAY
        </div>
      )}
    </div>
  );
};
