# oddlyepic-ranking — the OddlyEpic RankReel

The permanent production format for **OddlyEpic** ranking Shorts (9:16, YouTube
Shorts / Reels / TikTok). One input file — `ranking.json` — drives the whole
video. Remotion composes it; FFmpeg trims and normalises the footage; a rights
gate decides what may render as final.

```
ranking.json ──► prepare.py ──────────────► src/generated/prepared.json ──► Remotion "RankReel" ──► out/rankreel.mp4
  (content +       │ rights gate                                              (meter, ranks, labels,
   rights)         │ FFmpeg trim / 30fps / loudnorm                            captions, transitions,
                   │ hook fragment, SFX pack                                   safe zones, CTA, loop)
                   └► out/rights-report.md · out/credits.txt · out/review/*.jpg
```

## The shape of every RankReel

| Time | Segment | What happens |
|---|---|---|
| 0:00–0:01 | **Hook** | A ~1s fragment of #1 (or any rank), cut right *before* its payoff. Meter is already **MAXED**. No logo, no intro. |
| 0:01–0:02 | **Title** | Glitch cut → premise text over #5's first frame. The meter **rewinds to 0%** with a rewind sweep. |
| ~0:02 → | **#5 … #1** | Each rank is its clip (2–5s typical) plus optional freeze / slow-mo / replay. Rank number lands with the clip; the **reaction label slams in on the payoff**, in sync with the meter snap. Zoom-blur cuts between ranks; RGB-split into #1. |
| #1 | **Strongest payoff** | Auto 0.3s freeze + punch-in on the payoff, screen flash, impact hit, meter **overload** (MAXED flicker, glow, shake). Optional slowed replay. |
| last ~1.7s | **CTA** | The question ("Which one wins? 1–5?") over #1's payoff frame, plus the rank ladder so viewers can vote by number. |
| final 8 frames | **Loop** | Dissolves into the hook's first frame. The meter is at 100% both at the end and at the start, so the loop is seamless. |

Typical runtime: 20–35s for a Top 5 (the director skill sets the target).

## THE ODDLYEPIC METER

A compact HUD strip in the top safe band: meter name · 20 skewed segments
(cold → hot colour) · a 3-digit readout.

- **Levels**: #5→20%, #4→40%, #3→60%, #2→80%, #1→100% (spread evenly for Top 3 / Top 7; override per entry with `meterLevel`).
- **Anticipation**: from each rank's first frame, the meter *creeps* 30% of the way toward the next level.
- **Snap**: on the payoff, it jumps the rest of the way. The new segments flash white, the readout bumps, and a tick + pop plays.
- **Overload at 100%**: the label flickers MAXED, the border glows, and the strip shakes on the snap.
- **Signature loop**: MAXED on the hook → rewinds under the title → climbs back → MAXED at the end.
- Works with the sound off. It stays in the top band, clear of the footage's middle.

| `meter.type` | Name | Default labels (#5 → #1) | Default question |
|---|---|---|---|
| `chaos` | CHAOS | QUESTIONABLE · UH OH · COMMITTED · NO GOING BACK · ABSOLUTE CHAOS | Which one wins? 1–5? |
| `luck` | LUCK | FORTUNATE · SUSPICIOUS · HOW? · ONE IN A MILLION · UNIVERSE GLITCH | Luckiest one? 1–5? |
| `skill` | SKILL | SOLID · CLEAN · ELITE · UNREAL · NOT HUMAN | Who's actually the best? 1–5? |
| `fail` | FAIL | MINOR SETBACK · BAD CALL · OH NO · TOTAL COLLAPSE · LEGENDARY | Which one hurt your soul most? 1–5? |
| `plotTwist` | PLOT TWIST | HUH · WAIT · DIDN'T SEE IT · REWRITE IT · NOBODY GUESSED | Which twist got you? 1–5? |
| `satisfying` | SATISFYING | NICE · CLEAN · CRISP · PERFECT · BRAIN RESET | Most satisfying? 1–5? |
| `timing` | TIMING | GOOD TIMING · CLOSE CALL · SPLIT SECOND · FRAME PERFECT · TIME STOPPED | Best timing? 1–5? |
| `confidence` | CONFIDENCE | BOLD · FEARLESS · DELUSIONAL · UNSHAKEABLE · MAIN CHARACTER | Most confident? 1–5? |
| `dogDrama` | DOG DRAMA | MILD SASS · OFFENDED · BETRAYED · FULL OPERA · OSCAR WORTHY | Most dramatic dog? 1–5? |
| `custom` | your `name` | (write your own labels) | (write your own) |

Presets live in `src/config/meters.ts`. Per video, you can override `name`, `colors`, any `label` and the `cta.question`.
**Write concept-specific labels and questions when you can.** The presets are a floor, not the format.

## ranking.json

Times are **source-clip timestamps** (what you read off the raw footage): `12.4` or `"0:12.4"`.

```jsonc
{
  "title": "HOW DID THIS GET WORSE?",          // ≤ 7 words; ~1s on screen
  "meter": { "type": "chaos" },               // + optional "name", "colors": ["#cold", "#hot"]
  "hook":  { "fromRank": 1, "at": null, "seconds": 1.0 },   // at=null → the second before that rank's payoff
  "titleSeconds": 1.0,
  "cta":   { "question": null, "seconds": 1.7 },            // null → meter preset question
  "loop":  true,
  "audio": {
    "music": null,               // path under public/, e.g. "music/bed.mp3"
    "musicRights": null,         // original-generated | licensed | authorized (required if music is set)
    "musicVolume": 0.1, "clipVolume": 1.0, "sfx": true, "sfxVolume": 0.5
  },
  "entries": [{
    "rank": 5,
    "label": "QUESTIONABLE",                  // reaction/category label
    "description": "what the clip shows",     // shown on the placeholder until footage exists
    "clip": { "src": "footage/rank5.mp4", "cutIn": "0:03.2", "cutOut": "0:06.0" },
    "payoffAt": "0:05.1",                      // label + meter snap land here (default 65% through)
    "framing": { "mode": "cover", "focusX": 0.5, "focusY": 0.45, "zoom": 1 },  // or "blurfill" for wide shots
    "speed": 1,                                // constant playback rate
    "freeze":  { "at": "0:05.1", "seconds": 0.4 },              // optional  (#1 auto: 0.3s on payoff; null disables)
    "slowmo":  { "at": "0:04.6", "seconds": 0.8, "rate": 0.5 },  // optional
    "replay":  { "at": "0:04.8", "seconds": 1.2, "rate": 0.5 },  // optional, plays after the clip with ◀◀ REPLAY
    "punchIn": { "at": "0:05.0", "seconds": 1.0, "scale": 1.25 },// optional  (#1 auto on payoff; null disables)
    "captions": [{ "at": "0:04.0", "text": "he's got this", "emphasis": "this" }],
    "voiceover": null,                         // optional "voiceover/rank5.mp3" under public/; clip audio ducks
    "meterLevel": null,                        // optional override (0–100)
    "rights": {
      "status": "cleared",                     // cleared | pending | blocked
      "route": "creator-permission",           // creator-permission | viewer-submission | licensed-stock | cc0 | cc-by | public-domain | original | other
      "riskTier": "MODERATE",                  // from oddlyepic-clip-scout: LOWER | MODERATE | HIGHER
      "source": "https://…",
      "rightsholder": "@creator",
      "credit": "Video: @creator (used with permission)",
      "evidence": "permission DM screenshot 2026-10-03 → footage/rank5-permission.png",
      "scoutRef": "clip-scout plan 2026-10-03",
      "safety": {
        "noSeriousInjury": true, "noDangerousViolence": true, "noChildHumiliation": true,
        "noDiscriminatoryImagery": true, "noThirdPartyWatermarks": true, "lowMonetizationRisk": true
      }
    }
  }]
}
```

3–7 entries are supported (ranks must be exactly 1..N). Top 5 is the default.

**Effects are opt-in except at #1.** Use freeze / slow-mo / replay / punch-in only where they improve the joke. The footage is the attraction.

## Rights gate

Finding a clip online does not make it reusable. Nothing becomes final until its rights block says so.

| Verdict | When | Effect |
|---|---|---|
| **refused** | `status: "blocked"`, or **any** safety check is `false` | Never processed, even in draft. Cached media is deleted. Replace the clip. |
| **draft** | anything not yet fully cleared | Only processed with `--draft`. Every frame carries a red **DRAFT · RIGHTS NOT CLEARED · DO NOT PUBLISH** band plus the open issues. |
| **final** | `status: "cleared"` + route + source + rightsholder + evidence + all six safety checks `true` (+ credit for CC BY; + `musicRights` if music is used) | Clean render. |

`npm run render` runs `prepare.py --check` first and **refuses to render** unless every entry is final.
The check also fails on stale media (cut points changed since prepare).

HIGHER-tier clips marked cleared produce a warning: make sure the evidence is written permission or a licence, not just a credit.

Watermarks can't be detected automatically. Check `out/review/rank*.jpg` (contact sheets) before ticking `noThirdPartyWatermarks`.

## Audio

- **Original clip audio is the bed.** Each clip is loudness-normalised (−16 LUFS, −1.5 dBTP) so ranks don't jump in volume. Slowed/replayed sections are muted (pitched-down audio sounds broken), so SFX carries those moments.
- **Sound design is synthesised locally** by `prepare.py` (tick, pop, whoosh, riser, impact, rewind) from FFmpeg math. No samples, no API, nothing to license. Cues are placed automatically: rewind under the title, whoosh on rank cuts, tick + pop on every payoff, riser into #1, impact on #1's payoff.
- **Music is optional and off by default.** Only use music you made, licensed, or were explicitly authorised to use, and record which in `audio.musicRights`. Never commercial tracks. It sits at 10% under the clips.
- Optional per-rank voiceover (`entries[].voiceover`) can be generated with the toolkit's `tools/voiceover.py --provider qwen3` (self-hosted, free). Clip audio ducks to 35% under it.

## Safe zones

Persistent UI stays inside the union of the YouTube Shorts, Reels and TikTok safe areas (`src/config/layout.ts`):
- top 200px, bottom 420px, and the right action rail (150px, from y=880)
- The meter and rank tag sit just under the top chrome. Captions sit above the bottom overlay and clear of the rail.

Preview the **RankReel-SafeZones** composition in Studio to see the zones drawn over your footage. They never render in **RankReel**.

## Commands (from the project directory)

```bash
npm install
npm run studio          # live preview — edit ranking.json, it hot-reloads (labels, captions, framing, timing)
npm run prepare-draft   # trim/normalise everything not refused (draft band until cleared)
npm run prepare-clips   # final prep: only cleared clips
npm run check           # gate report; exit 1 unless final-render ready
npm run render          # check + render out/rankreel.mp4 (refuses if not cleared)
npm run render:draft    # render with the DRAFT band (for internal review only)
```

Re-run prepare whenever `clip.src`, `cutIn` or `cutOut` change (encodes are cached per clip). Other fields (labels, payoff, captions, framing, effects, meter) are picked up live.

The format previews at any stage: with no footage, each rank shows a placeholder card with the needed moment and its cut plan.

## Files

```
ranking.json              the input (format sample — replace per Short)
prepare.py                rights gate + FFmpeg prep + SFX + reports
footage/                  raw clips (gitignored)
public/clips, public/sfx  generated by prepare.py
src/RankReel.tsx          the composition
src/timeline.ts           frame-exact timing engine (pieces, meter keys, SFX cues)
src/config/meters.ts      meter presets
src/config/layout.ts      canvas, safe zones, transition lengths
src/config/brand.ts       OddlyEpic tokens (mirrors brands/oddlyepic/brand.json)
src/components/           Meter, RankTag, Captions, Clip, Scenes, Placeholder
```
