# OddlyEpic RankReel project

This project uses the `oddlyepic-ranking` template. Read `README.md` for the full format spec.

## Hard rules

- **`ranking.json` is the only content file.** Don't hard-code titles, labels, timings or captions in `src/`.
- **Never mark rights yourself.** `rights.status: "cleared"` and every `safety.*: true` are set only on the
  user's explicit confirmation, with the evidence they provide. Default for a new clip: `"pending"`, safety `null`.
- **Never download clips and treat them as cleared.** Footage comes from the user, or from an
  oddlyepic-clip-scout sourcing route the user actually completed (permission, licence, CC verified at source, original).
- Refuse clips with serious injury, dangerous violence, humiliated children, discriminatory imagery,
  third-party watermarks/repost overlays, or obvious monetization risk. Set the matching safety flag to `false`, and the gate will refuse the clip.
- **No commercial music** unless the user provides it and confirms authorization (`audio.musicRights`).
- **No paid APIs by default.** SFX are synthesised by prepare.py. If voiceover is wanted, use `--provider qwen3` (self-hosted), unless the user asks for another provider.
- Don't publish. `/publish` only on explicit request, and only after `npm run check` passes.

## Workflow

1. Fill `ranking.json` from the oddlyepic-shorts-director output (title, labels, captions, payoffs, CTA question) and the oddlyepic-clip-scout table (descriptions, riskTier, routes).
2. `npm run studio`. Placeholders show the timing before any footage exists.
3. As clips arrive in `footage/`: set `clip.src` + cut points → `npm run prepare-draft` → review `out/review/*.jpg` for crop and watermarks.
4. Tune `payoffAt`, `framing.focusX/Y`, and effects live in Studio. Use the **RankReel-SafeZones** composition to check framing.
5. User confirms rights per clip → update `rights` → `npm run check` → `npm run render`.
6. Put `out/credits.txt` into the description. Keep `out/rights-report.md` with the project.
7. Launch: run `npm run cover`, then copy `LAUNCH-TEMPLATE.md` to `LAUNCH.md` and fill it in: per-platform titles, captions,
   hashtags, pinned comments, settings, first-hour actions and the 24h/72h metrics. The user uploads by hand.

Effects (freeze/slowmo/replay/punchIn) are opt-in except at #1. Add them only where they improve the payoff.
