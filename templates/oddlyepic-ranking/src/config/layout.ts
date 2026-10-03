/**
 * 1080x1920 canvas + platform safe zones.
 *
 * Measured against YouTube Shorts / Reels / TikTok overlays (the union of all three):
 *  - top    ~200px : status bar, search/camera icons
 *  - bottom ~420px : channel name, title, caption, audio ticker
 *  - right  ~150px : like/comment/share rail, from ~y=880 down
 * Persistent UI (meter + rank tag) lives in the top band just under the platform
 * chrome; captions sit above the bottom overlay. The middle stays for the footage.
 */
export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export const SAFE = {
  top: 200,
  bottom: 420,
  left: 64,
  right: 64,
  /** Right action rail (avoid for anything below railTop). */
  railWidth: 150,
  railTop: 880,
};

export const UI = {
  meterY: SAFE.top + 28,
  meterHeight: 76,
  rankTagY: SAFE.top + 128,
  captionY: HEIGHT - SAFE.bottom - 210,
};

/** Transition lengths (frames). */
export const TRANSITION = {
  hookToTitle: 8,
  betweenRanks: 7,
  intoNumberOne: 10,
};
