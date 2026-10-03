import { Composition } from 'remotion';
import { RankReel, type RankReelProps } from './RankReel';
import { buildTimeline } from './timeline';
import { FPS, HEIGHT, WIDTH } from './config/layout';
import ranking from '../ranking.json';
import prepared from './generated/prepared.json';
import type { PreparedState, RankingConfig } from './config/types';

const cfg = ranking as unknown as RankingConfig;
const prep = prepared as unknown as PreparedState;

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
    </>
  );
};
