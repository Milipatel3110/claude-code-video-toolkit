/**
 * ranking.json schema — the single input file for an OddlyEpic RankReel.
 *
 * All timestamps are SOURCE-clip timestamps (the same numbers you read off the
 * raw footage): seconds (12.4) or "m:ss.s" ("0:12.4"). prepare.py trims each
 * clip to [cutIn, cutOut]; the composition converts every other timestamp to
 * clip-relative time itself.
 */

export type TimeValue = number | string;

export type MeterType =
  | 'chaos'
  | 'luck'
  | 'skill'
  | 'fail'
  | 'plotTwist'
  | 'satisfying'
  | 'timing'
  | 'confidence'
  | 'dogDrama'
  | 'custom';

export interface MeterInput {
  type: MeterType;
  /** Override the display name, e.g. "CHAOS". Required for custom. */
  name?: string;
  /** Override [cold, hot] colours. Required for custom. */
  colors?: [string, string];
}

/** clip-scout risk tier, carried verbatim. */
export type RiskTier = 'LOWER' | 'MODERATE' | 'HIGHER';

export type RightsStatus = 'cleared' | 'pending' | 'blocked';

export type RightsRoute =
  | 'creator-permission'
  | 'viewer-submission'
  | 'licensed-stock'
  | 'cc0'
  | 'cc-by'
  | 'public-domain'
  | 'original'
  | 'other';

export interface SafetyChecks {
  noSeriousInjury: boolean | null;
  noDangerousViolence: boolean | null;
  noChildHumiliation: boolean | null;
  noDiscriminatoryImagery: boolean | null;
  noThirdPartyWatermarks: boolean | null;
  lowMonetizationRisk: boolean | null;
}

export interface Rights {
  status: RightsStatus;
  route: RightsRoute | null;
  riskTier: RiskTier | null;
  /** Original URL / where the clip came from. */
  source: string | null;
  /** Who owns it (creator handle, agency, "OddlyEpic" for originals). */
  rightsholder: string | null;
  /** Credit line owed in the description, if any. */
  credit: string | null;
  /** Permission email / licence URL / submission form record. */
  evidence: string | null;
  /** Which clip-scout plan this came from (doc link or date). */
  scoutRef: string | null;
  safety: SafetyChecks;
}

export interface Framing {
  /** cover = fill 9:16 and crop; blurfill = whole frame over a blurred copy (use for wide shots). */
  mode: 'cover' | 'blurfill';
  /** 0..1 — the subject's position in the source frame. Cover crops toward it, zoom scales around it. */
  focusX?: number;
  focusY?: number;
  /** Constant extra zoom (1 = none). */
  zoom?: number;
}

export interface Caption {
  at: TimeValue;
  text: string;
  /** Word to hit in the accent colour. */
  emphasis?: string;
  /** Seconds on screen. Default 1.4. */
  seconds?: number;
}

export interface Entry {
  rank: number;
  /** Reaction/category label. Falls back to the meter preset's label for this rank. */
  label?: string;
  /** What the clip shows (clip-scout "moment needed"). Shown on the placeholder card. */
  description?: string;
  clip: {
    /** Raw footage path relative to the project, e.g. "footage/rank5.mp4". null = placeholder. */
    src: string | null;
    cutIn: TimeValue;
    cutOut: TimeValue;
    /** Optional pre-crop of the SOURCE in pixels, "w:h:x:y" — e.g. remove baked-in letterbox bars. Applied by prepare.py. */
    crop?: string | null;
  };
  /** The moment the joke/payoff lands. Label + meter jump happen here. Default: 65% through. */
  payoffAt?: TimeValue;
  framing?: Framing;
  /** Constant playback rate (1 = real time). */
  speed?: number;
  /** Hold a frame. */
  freeze?: { at: TimeValue; seconds: number } | null;
  /** Slow a window down mid-clip. */
  slowmo?: { at: TimeValue; seconds: number; rate?: number } | null;
  /** Replay a window after the clip plays out. */
  replay?: { at: TimeValue; seconds: number; rate?: number } | null;
  /** Zoom into the focus point for a window. #1 gets one automatically at payoff. */
  punchIn?: { at: TimeValue; seconds: number; scale?: number } | null;
  captions?: Caption[];
  /** Optional per-rank voiceover (relative to public/, e.g. "voiceover/rank5.mp3"). Clip audio ducks under it. */
  voiceover?: string | null;
  /** Override meter % reached at this rank's payoff. */
  meterLevel?: number | null;
  rights: Rights;
}

export interface RankingConfig {
  title: string;
  meter: MeterInput;
  hook: {
    /** Which rank's footage opens the video. Default 1. */
    fromRank?: number;
    /** Source timestamp to start the hook fragment. Default: just before that rank's payoff. */
    at?: TimeValue | null;
    seconds?: number;
  };
  titleSeconds?: number;
  cta: {
    /** End question. Default: the meter preset's question. */
    question?: string | null;
    seconds?: number;
  };
  loop?: boolean;
  audio: {
    /** Relative to public/, e.g. "music/bed.mp3". Must be original/licensed/authorized. */
    music?: string | null;
    musicRights?: 'original-generated' | 'licensed' | 'authorized' | 'public-domain' | null;
    musicVolume?: number;
    clipVolume?: number;
    sfx?: boolean;
    sfxVolume?: number;
  };
  entries: Entry[];
}

/** Written by prepare.py — media + gate state. */
export interface PreparedState {
  prepared: boolean;
  draft: boolean;
  sfx: boolean;
  hook: { file: string; seconds: number } | null;
  clips: Record<
    string,
    { file: string; seconds: number; cutIn: number; cutOut: number; width: number; height: number }
  >;
  gate: { final: boolean; issues: string[] };
}
