---
description: OddlyEpic ranking Shorts - new RankReel from a concept, or resume one
---

# OddlyEpic

Builds OddlyEpic ranking Shorts on the `oddlyepic-ranking` template (Remotion composition **RankReel**).
The format spec is `templates/oddlyepic-ranking/README.md`. Read it before filling anything in.

Arguments: `$ARGUMENTS`, optionally a concept/title, or `status`.

## The pipeline

```
oddlyepic-trend-hunter   → picks the concept (which meter, which structure)
oddlyepic-clip-scout     → what each rank needs + where to find it + risk tier
   (user sources footage + secures rights — never automated)
oddlyepic-shorts-director→ hook, labels, captions, timeline, CTA, description, pinned comment
/oddlyepic (this)        → ranking.json → prepare.py (FFmpeg + rights gate) → RankReel render
/publish                 → only when asked, only after `npm run check` passes
```

These three skills are synced claude.ai skills. Invoke them through the Skill tool
(`anthropic-skills:oddlyepic-trend-hunter`, `…-clip-scout`, `…-shorts-director`).
Don't re-implement their judgement here. **When you call shorts-director, tell it that RankReel
conventions are defined in `templates/oddlyepic-ranking/README.md`.** Its build sheet should then map
1:1 onto `ranking.json` fields: label, payoffAt, captions with emphasis, freeze/slowmo/replay/punchIn,
framing, hook, and cta.question.

## Step 1: Scan

Glob `projects/*/project.json` where `template == "oddlyepic-ranking"`. If any are unfinished, list them
(phase, how many clips are cleared, according to `npm run check`) and offer to resume. `status` → print this and stop.

## Step 2: New Short

1. **Concept.** If `$ARGUMENTS` has none, ask in one line, or offer to run trend-hunter. Don't invent one.
2. **Meter.** Choose the meter type that fits the concept's escalation axis (README table), or `custom`.
   Write concept-specific labels when the preset ones are generic for this topic.
3. **Clip plan.** If no clip-scout output exists for this concept, run clip-scout. Carry each rank's
   *moment needed* → `description`, and the *risk tier* → `rights.riskTier`.
4. **Create the project:**
   ```bash
   SLUG=oddlyepic-$(date +%Y-%m-%d)-<short-slug>
   cp -r templates/oddlyepic-ranking projects/$SLUG
   rm -rf projects/$SLUG/node_modules projects/$SLUG/out
   cd projects/$SLUG && npm install
   ```
   Write `project.json` (template `oddlyepic-ranking`, brand `oddlyepic`, phase `planning`). Its scenes are
   `hook`, `title`, `rank-N`…`rank-1` and `cta`, with `visual.type: "external"` for ranks, and a sessions entry.
5. **Fill `ranking.json`.** Title, meter, labels, descriptions, hook rank, cta.question. Every `rights` block starts as
   `status: "pending"` with safety values `null`. Clip paths stay `null` until real footage exists. Leave `_readme` in place.
6. `npm run studio`. The whole Short previews with placeholder cards. Fix timing and labels now.

## Step 3: Footage + rights (repeat per clip)

- The user drops footage into `footage/` and gives the source. **Never download clips yourself and never
  mark anything cleared on your own.** Ask the user per clip:
  route · rightsholder · evidence (permission/licence/CC link) · credit owed, plus the six safety checks
  (no serious injury · no dangerous violence · no humiliated children · no discriminatory imagery ·
  no third-party watermarks/repost overlays · low monetization risk).
- Set `clip.src`, `cutIn`, `cutOut` and `payoffAt`, then run `npm run prepare-draft`.
- Show `out/review/rank<N>.jpg` (Read the image) to check crop and watermarks. Adjust `framing.focusX/Y`, or use
  `blurfill` for wide shots.
- If any safety check fails, set it `false`. The gate refuses the clip. Go back to clip-scout's backup idea for that rank.
- Update `project.json` scene status (`asset-needed` → `asset-present`), phase `assets` → `review`.

## Step 4: Direct

Run shorts-director with the concept + confirmed clips, if not done yet. Apply its output to `ranking.json`:
labels, payoff timestamps, 1–4-word reaction captions with emphasis, effects only where it calls for them, the hook rank,
and the closing question. Save its description, hashtags and pinned comment to `PUBLISHING.md` in the project, and
append `out/credits.txt` to the description.

Voiceover is optional for this format (original clip audio + SFX is the default). If the director's script is used,
generate it with `uv run tools/voiceover.py --provider qwen3 ...` from the toolkit root into `public/voiceover/rank<N>.mp3`,
and set `entries[].voiceover`.

## Step 5: Render

```bash
npm run check      # must print FINAL-RENDER READY
npm run render     # out/rankreel.mp4 (refuses if the gate fails)
```

Before the check passes, only `npm run render:draft` works, and it renders the DRAFT · DO NOT PUBLISH band.
Watch the full render once (or extract a frame strip) before calling it done. Update `project.json` phase → `complete`.

**Do not publish.** Offer `/publish` only if the user asks.

## Guardrails

- No paid APIs unless the user asks for one by name.
- No commercial music unless the user provides it and confirms authorization (`audio.musicRights`).
- Vary hook rank, meter, labels and the closing question between Shorts. The template is fixed; the content mustn't be.
