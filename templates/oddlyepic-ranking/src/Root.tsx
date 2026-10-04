import { Composition, Freeze } from 'remotion';
import { RankReel, type RankReelProps } from './RankReel';
import { buildTimeline, type RankSegment } from './timeline';
import { FPS, HEIGHT, WIDTH } from './config/layout';
import ranking from '../ranking.json';
import prepared from './generated/prepared.json';
import type { PreparedState, RankingConfig } from './config/types';

const cfg = ranking as unknown as RankingConfig;
const prep = prepared as unknown as PreparedState;

/**
 * Cover / thumbnail frame: the #1 payoff, a few frames after the label slams in
 * (meter maxed, label settled). Rendered by `npm run cover` for Shorts/Reels/TikTok covers.
 */
const Cover: React.FC = () => {
  const tl = buildTimeline(cfg, prep);
  const top = tl.ranks[tl.ranks.length - 1];
  const seg = tl.segments.find((s) => s.kind === 'rank' && (s as RankSegment).rank === top.rank)!;
  return (
    <Freeze frame={seg.from + top.payoffFrame + 10}>
      <RankReel showSafeZones={false} />
    </Freeze>
  );
};

export const RemotionRoot: React.FC = () => {
  const total = buildTimeline(cfg, prep).totalFrames;
  const props: RankReelProps = { showSafeZones: false };
  return (
    <>
      <Composition id="RankReel" component={RankReel} durationInFrames={total} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={props} />
      {/* Same video with platform overlay zones drawn on — for framing checks only. */}
      <Composition
        id="RankReel-SafeZones"
        component={RankReel}
        durationInFrames={total}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ showSafeZones: true }}
      />
      {/* Full length so the frozen frame is in range; `remotion still` renders its frame 0 = the frozen #1 payoff. */}
      <Composition id="RankReel-Cover" component={Cover} durationInFrames={total} fps={FPS} width={WIDTH} height={HEIGHT} />
    </>
  );
};
