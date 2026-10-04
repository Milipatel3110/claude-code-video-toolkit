# Launch kit: {{TITLE}}

> Copy this file to `LAUNCH.md` in the project and fill every {{PLACEHOLDER}}.
> `/oddlyepic` does this automatically at the Launch step. Nothing here posts anything; you upload by hand.

## 0. Pre-flight (all must be ✅)

- [ ] `npm run check` prints **FINAL-RENDER READY**
- [ ] Final file: `out/rankreel.mp4` (1080×1920, 30fps, H.264/AAC). There's no DRAFT band (open it and look).
- [ ] Cover: `npm run cover` → `out/cover.jpg`
- [ ] Credits from `out/credits.txt` are in every description below
- [ ] You watched the whole thing once with sound and once muted

## 1. YouTube Shorts (post first)

**Title** (≤100 characters; the hook goes first; one hashtag max):
1. {{TITLE_OPTION_1}} ← recommended
2. {{TITLE_OPTION_2}}
3. {{TITLE_OPTION_3}}

**Description:**
```
{{ONE_LINE_PREMISE}}

{{DEBATE_QUESTION}} 👇

{{CREDITS_BLOCK}}

{{3_HASHTAGS}}
```

**Settings:**
- Audience: **No, it's not made for kids**
- Altered or synthetic content: **No** if it's all real footage. (Answer Yes if any shot is AI-generated or realistically altered.)
- Category: Comedy (or Entertainment) · Comments: On · Licence: Standard YouTube
- Cover: in the YouTube mobile app, pick the frame matching `out/cover.jpg` (the #1 label moment)

**Pinned comment:** {{PINNED_COMMENT_YT}}

## 2. Instagram Reels (same day, 1–3 hours after YouTube)

**Caption:**
```
{{HOOK_LINE}}
{{ONE_LINE_PREMISE}}
{{DEBATE_QUESTION}} 👇
.
{{CREDITS_SHORT}}
{{3_TO_5_HASHTAGS}}
```
- Cover: upload `out/cover.jpg`. Check the profile-grid crop keeps the rank label visible.
- Share to feed: On · Audio: rename "Original audio" to {{AUDIO_NAME}}, if your app offers the option

**First comment (pin it):** {{PINNED_COMMENT_IG}}

## 3. TikTok (same day or next morning)

**Caption** (keep it short; the question does the work):
```
{{HOOK_LINE}} {{DEBATE_QUESTION}} {{3_TO_5_HASHTAGS}}
{{CREDITS_SHORT}}
```
- Cover: choose the #1 label frame, or upload `out/cover.jpg` on desktop
- AI-generated content label: Off if the footage is real · Duet/Stitch: On (stitches spread debate formats)

**Pinned comment:** {{PINNED_COMMENT_TT}}

## 4. First hour after each post

- Pin the comment immediately.
- Reply to the first 10–20 comments **with an opinion**, not "thanks!". Disagreement keeps a thread alive.
- Heart the funniest disagreeing comment. Don't delete civil criticism.
- Don't repost, boost, or buy engagement in the first 48 hours.

## 5. If a copyright claim appears

YouTube Studio → Content → this Short → **Copyright** → **Dispute**. Choose the reason that applies, e.g. *public domain* or *I have a licence or written permission*, and paste the evidence from `out/rights-report.md`.
A claim usually just redirects ads. **A strike is different:** don't dispute a strike without being sure of your evidence.

## 6. Read the results (24h and 72h)

Record these in `RESULTS.md`:

| Metric | Where | 24h | 72h |
|---|---|---|---|
| Views / engaged views | YT Studio → Analytics | | |
| Viewed vs swiped away (%) | YT Studio → Shorts → Engagement | | |
| Average % viewed | YT Studio | | |
| Comments per 1,000 views | comments ÷ views × 1000 | | |
| Likes per 1,000 views | | | |
| Reels plays / shares / saves | IG Insights | | |
| TikTok views / avg watch time / shares | TikTok Analytics | | |

**Hypothesis being tested:** {{HYPOTHESIS}}
**Repeat the format if:** {{REPEAT_IF}}
**Retire it if:** {{RETIRE_IF}}

Feed the numbers into the next oddlyepic-trend-hunter run, so the channel's own data starts outranking outside outliers.
