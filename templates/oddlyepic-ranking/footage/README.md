# footage/

Drop the **raw source clips** for this Short here (e.g. `rank5.mp4`).

Nothing in this folder is assumed to be usable. A clip is only processed by
`prepare.py` once its entry in `ranking.json` has a rights block, and only
rendered as final once that block says `"status": "cleared"` with every safety
check confirmed. See the template README → "Rights gate".

This folder is gitignored.
