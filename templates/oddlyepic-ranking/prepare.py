#!/usr/bin/env python3
"""
OddlyEpic RankReel — clip preparation + rights gate.

Reads ranking.json and, for every entry the rights gate allows:
  * trims the raw footage to [cutIn, cutOut]            (FFmpeg, frame-accurate re-encode)
  * normalises it: 30fps, H.264 yuv420p, <=1920px tall, AAC 48k stereo
  * normalises loudness (EBU R128 loudnorm, -16 LUFS, -1.5 dBTP) so ranks match
  * adds a silent track to clips with no audio (keeps the mix consistent)
  * cuts the cold-open hook fragment
  * writes a contact sheet per clip to out/review/ (crop + watermark check)
Plus, once per project:
  * synthesises the OddlyEpic SFX pack locally (no API, no samples — copyright-clean)
  * writes src/generated/prepared.json (what the Remotion composition reads)
  * writes out/rights-report.md and out/credits.txt (paste into the description)

Modes
  python3 prepare.py            final prep — refuses any clip that isn't cleared
  python3 prepare.py --draft    also processes pending clips; video renders with a DRAFT band
  python3 prepare.py --check    validate only (no FFmpeg); exit 1 unless final-render ready
  --force                       re-encode even if the cache says nothing changed

Stdlib only; needs ffmpeg + ffprobe on PATH. Run from the project directory.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RANKING = ROOT / "ranking.json"
STATE = ROOT / "src" / "generated" / "prepared.json"
CLIPS = ROOT / "public" / "clips"
SFX = ROOT / "public" / "sfx"
OUT = ROOT / "out"

FPS = 30
MAX_H = 1920
SAFETY_KEYS = {
    "noSeriousInjury": "no serious injury",
    "noDangerousViolence": "no dangerous violence",
    "noChildHumiliation": "no humiliation of children",
    "noDiscriminatoryImagery": "no discriminatory imagery",
    "noThirdPartyWatermarks": "no third-party watermarks / repost overlays",
    "lowMonetizationRisk": "low monetization risk",
}
ROUTES = {"creator-permission", "viewer-submission", "licensed-stock", "cc0", "cc-by", "public-domain", "original", "other"}
TIERS = {"LOWER", "MODERATE", "HIGHER"}


# --------------------------------------------------------------------------- utils

def parse_time(t) -> float | None:
    if t is None or t == "":
        return None
    if isinstance(t, (int, float)):
        return float(t)
    parts = [float(p) for p in str(t).strip().split(":")]
    v = 0.0
    for p in parts:
        v = v * 60 + p
    return v


def run(cmd: list[str]) -> str:
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"{cmd[0]} failed:\n{r.stderr[-1500:]}")
    return r.stdout


def probe(path: Path) -> dict:
    info = json.loads(run(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", str(path)]))
    v = next((s for s in info["streams"] if s["codec_type"] == "video"), None)
    if not v:
        raise RuntimeError(f"{path} has no video stream")
    w, h = int(v["width"]), int(v["height"])
    rot = 0
    for sd in v.get("side_data_list", []) or []:
        if "rotation" in sd:
            rot = int(float(sd["rotation"]))
    rot = int(v.get("tags", {}).get("rotate", rot))
    if abs(rot) % 180 == 90:
        w, h = h, w
    return {
        "width": w,
        "height": h,
        "duration": float(info["format"].get("duration") or v.get("duration") or 0),
        "audio": any(s["codec_type"] == "audio" for s in info["streams"]),
    }


def fingerprint(src: Path, *parts) -> str:
    st = src.stat()
    return hashlib.sha1(json.dumps([str(src), st.st_size, int(st.st_mtime), *parts]).encode()).hexdigest()[:16]


# --------------------------------------------------------------------------- gate

def gate_entry(e: dict) -> tuple[str, list[str], list[str]]:
    """Return (verdict, blockers, warnings). verdict: final | draft | refused."""
    r = e.get("rights") or {}
    rank = e.get("rank")
    tag = f"#{rank}"
    blockers, warnings = [], []
    status = r.get("status")
    safety = r.get("safety") or {}

    if status == "blocked":
        return "refused", [f"{tag}: rights status is 'blocked' — clip may not be used at all"], []
    failed = [label for k, label in SAFETY_KEYS.items() if safety.get(k) is False]
    if failed:
        return "refused", [f"{tag}: fails content safety ({'; '.join(failed)}) — replace this clip"], []

    if status != "cleared":
        blockers.append(f"{tag}: rights status is '{status or 'missing'}' (needs 'cleared')")
    unconfirmed = [label for k, label in SAFETY_KEYS.items() if safety.get(k) is not True]
    if unconfirmed:
        blockers.append(f"{tag}: safety not confirmed — {', '.join(unconfirmed)}")
    route = r.get("route")
    if route not in ROUTES:
        blockers.append(f"{tag}: rights route missing/unknown (one of {', '.join(sorted(ROUTES))})")
    for field in ("source", "rightsholder", "evidence"):
        if not r.get(field):
            blockers.append(f"{tag}: rights.{field} is empty")
    if route == "cc-by" and not r.get("credit"):
        blockers.append(f"{tag}: CC BY requires a credit line (rights.credit)")
    tier = r.get("riskTier")
    if tier not in TIERS:
        warnings.append(f"{tag}: no clip-scout riskTier recorded (LOWER/MODERATE/HIGHER)")
    elif tier == "HIGHER" and status == "cleared":
        warnings.append(f"{tag}: HIGHER-risk footage marked cleared — confirm the evidence is written permission or a licence, not just credit")
    if route == "other":
        warnings.append(f"{tag}: route 'other' — make sure rights.evidence explains the basis for use")
    return ("final" if not blockers else "draft"), blockers, warnings


def validate(cfg: dict) -> tuple[list[str], list[str]]:
    errors, warnings = [], []
    entries = cfg.get("entries") or []
    if not 3 <= len(entries) <= 7:
        errors.append(f"ranking needs 3–7 entries (has {len(entries)})")
    ranks = [e.get("rank") for e in entries]
    if sorted(ranks) != list(range(1, len(entries) + 1)):
        errors.append(f"ranks must be 1..{len(entries)} exactly once each (got {ranks})")
    if not cfg.get("title"):
        errors.append("title is empty")
    elif len(cfg["title"].split()) > 7:
        warnings.append("title is over 7 words — it has ~1 second on screen")
    total = (cfg.get("hook") or {}).get("seconds", 1.0) + cfg.get("titleSeconds", 1.0) + (cfg.get("cta") or {}).get("seconds", 1.7)
    for e in entries:
        tag = f"#{e.get('rank')}"
        clip = e.get("clip") or {}
        a, b = parse_time(clip.get("cutIn")), parse_time(clip.get("cutOut"))
        if a is None or b is None or b <= a:
            errors.append(f"{tag}: clip.cutIn/cutOut missing or out of order")
            continue
        d = (b - a) / (e.get("speed") or 1)
        total += d
        if d < 1.5:
            warnings.append(f"{tag}: only {d:.1f}s — may not read before the cut")
        if d > 6.0:
            warnings.append(f"{tag}: {d:.1f}s — long for this format (2–5s typical); trim to the payoff")
        for key in ("payoffAt",):
            t = parse_time(e.get(key))
            if t is not None and not a <= t <= b:
                errors.append(f"{tag}: {key} {t}s is outside the cut [{a}, {b}]")
        for key in ("freeze", "slowmo", "replay", "punchIn"):
            blk = e.get(key)
            if blk:
                t = parse_time(blk.get("at"))
                if t is None or not a <= t <= b:
                    errors.append(f"{tag}: {key}.at is outside the cut [{a}, {b}]")
                if key == "replay":
                    total += blk.get("seconds", 0) / (blk.get("rate") or 0.5)
                if key == "freeze":
                    total += blk.get("seconds", 0)
        for c in e.get("captions") or []:
            t = parse_time(c.get("at"))
            if t is None or not a <= t <= b:
                errors.append(f"{tag}: caption '{c.get('text')}' at {c.get('at')} is outside the cut")
            if len(str(c.get("text", "")).split()) > 6:
                warnings.append(f"{tag}: caption '{c.get('text')}' is long — reaction captions work at 1–4 words")
        if not e.get("label"):
            warnings.append(f"{tag}: no label — the meter preset's default will be used")
    hook_rank = (cfg.get("hook") or {}).get("fromRank", 1)
    if hook_rank not in ranks:
        errors.append(f"hook.fromRank {hook_rank} is not in the ranking")
    if total > 58:
        warnings.append(f"estimated runtime {total:.0f}s — over the ~55s ceiling for this format")
    audio = cfg.get("audio") or {}
    if audio.get("music"):
        if audio.get("musicRights") not in ("original-generated", "licensed", "authorized"):
            errors.append("audio.music is set but audio.musicRights isn't original-generated / licensed / authorized")
        if not (ROOT / "public" / audio["music"]).exists():
            errors.append(f"audio.music file public/{audio['music']} not found")
    return errors, warnings


# --------------------------------------------------------------------------- media

def parse_crop(crop: str | None, meta: dict) -> tuple[str, int, int]:
    """'w:h:x:y' (pixels of the source) → (ffmpeg filter prefix, width, height after crop)."""
    if not crop:
        return "", meta["width"], meta["height"]
    w, h, x, y = (int(v) for v in str(crop).split(":"))
    if w <= 0 or h <= 0 or x < 0 or y < 0 or x + w > meta["width"] or y + h > meta["height"]:
        raise RuntimeError(f"clip.crop {crop} is outside the {meta['width']}x{meta['height']} source")
    return f"crop={w}:{h}:{x}:{y},", w, h


def encode(src: Path, start: float, end: float, dst: Path, meta: dict, crop: str | None = None) -> None:
    pre, cw, ch = parse_crop(crop, meta)
    h = min(ch, MAX_H)
    w = int(round(cw * h / ch / 2) * 2)
    vf = f"{pre}fps={FPS},scale={w}:{h}:flags=lanczos,format=yuv420p"
    cmd = ["ffmpeg", "-y", "-v", "error", "-ss", f"{start:.3f}", "-to", f"{end:.3f}", "-i", str(src)]
    if meta["audio"]:
        amap = ["-map", "0:v:0", "-map", "0:a:0", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000"]
    else:
        cmd += ["-f", "lavfi", "-t", f"{end - start:.3f}", "-i", "anullsrc=r=48000:cl=stereo"]
        amap = ["-map", "0:v:0", "-map", "1:a:0", "-shortest"]
    cmd += amap + [
        "-vf", vf,
        "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-g", "15",
        "-c:a", "aac", "-b:a", "192k", "-ac", "2",
        "-movflags", "+faststart", str(dst),
    ]
    run(cmd)


def contact_sheet(clip: Path, dst: Path, seconds: float) -> None:
    rate = max(6 / max(seconds, 0.1), 0.5)
    run(["ffmpeg", "-y", "-v", "error", "-i", str(clip), "-vf",
         f"fps={rate:.3f},scale=360:-2,tile=3x2:padding=6:color=black", "-frames:v", "1", str(dst)])


# Procedural sound design: generated from maths, so there is nothing to license.
SFX_RECIPES = {
    "tick": "aevalsrc='0.7*sin(2*PI*2400*t)*exp(-70*t)+0.3*sin(2*PI*4800*t)*exp(-90*t)':s=48000:d=0.09",
    "pop": "aevalsrc='0.8*sin(2*PI*(500+1400*exp(-35*t))*t)*exp(-22*t)':s=48000:d=0.18",
    "whoosh": "anoisesrc=d=0.42:c=pink:a=0.7:r=48000,highpass=f=500,lowpass=f=5200,afade=t=in:d=0.2,afade=t=out:st=0.2:d=0.22",
    "riser": "aevalsrc='0.45*(t/1.2)*sin(2*PI*(180+900*t*t)*t)':s=48000:d=1.2,afade=t=out:st=1.12:d=0.08",
    "impact": "aevalsrc='0.95*sin(2*PI*(48+110*exp(-9*t))*t)*exp(-3.6*t)+0.25*(random(0)*2-1)*exp(-30*t)':s=48000:d=1.1",
    "rewind": "aevalsrc='0.4*sin(2*PI*(1600*exp(-2.2*t))*t)*(1-t/0.8)':s=48000:d=0.8",
}


def build_sfx(force: bool) -> bool:
    SFX.mkdir(parents=True, exist_ok=True)
    for name, recipe in SFX_RECIPES.items():
        dst = SFX / f"{name}.wav"
        if dst.exists() and not force:
            continue
        run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", recipe, "-ac", "2", "-ar", "48000", str(dst)])
    return True


# --------------------------------------------------------------------------- main

def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--draft", action="store_true", help="also process clips that aren't cleared yet (renders with a DRAFT band)")
    ap.add_argument("--check", action="store_true", help="validate + gate only, no FFmpeg; exit 1 unless final-render ready")
    ap.add_argument("--force", action="store_true", help="re-encode everything")
    args = ap.parse_args()

    if not args.check and not (shutil.which("ffmpeg") and shutil.which("ffprobe")):
        print("ffmpeg/ffprobe not found on PATH (brew install ffmpeg)", file=sys.stderr)
        return 2

    cfg = json.loads(RANKING.read_text())
    prev = json.loads(STATE.read_text()) if STATE.exists() else {}
    errors, warnings = validate(cfg)

    verdicts, blockers = {}, []
    for e in cfg.get("entries", []):
        v, b, w = gate_entry(e)
        verdicts[e["rank"]] = v
        blockers += b
        warnings += w
        if not (e.get("clip") or {}).get("src"):
            blockers.append(f"#{e['rank']}: no footage yet (clip.src is empty)")

    state = {
        "prepared": prev.get("prepared", False),
        "draft": True,
        "sfx": prev.get("sfx", False) and (SFX / "tick.wav").exists(),
        "hook": prev.get("hook"),
        "clips": prev.get("clips", {}),
        "gate": {"final": False, "issues": []},
    }

    if errors:
        print("\n✗ ranking.json has errors:")
        for x in errors:
            print("   -", x)

    # Drop cached media that no longer matches ranking.json (stale cut points / refused clips).
    for e in cfg.get("entries", []):
        key = str(e["rank"])
        c = state["clips"].get(key)
        clip = e.get("clip") or {}
        stale = c and (
            verdicts[e["rank"]] == "refused"
            or c.get("cutIn") != parse_time(clip.get("cutIn"))
            or c.get("cutOut") != parse_time(clip.get("cutOut"))
            or c.get("crop") != clip.get("crop")
            or not (ROOT / "public" / c["file"]).exists()
        )
        if stale:
            if args.check:
                blockers.append(f"#{key}: prepared clip is stale or refused — re-run prepare")
            else:
                state["clips"].pop(key, None)

    if not args.check and not errors:
        CLIPS.mkdir(parents=True, exist_ok=True)
        (OUT / "review").mkdir(parents=True, exist_ok=True)
        state["sfx"] = build_sfx(args.force)
        allowed = {"final"} | ({"draft"} if args.draft else set())
        for e in sorted(cfg["entries"], key=lambda x: -x["rank"]):
            rank, clip = e["rank"], e["clip"]
            key = str(rank)
            if verdicts[rank] not in allowed:
                state["clips"].pop(key, None)
                why = "REFUSED" if verdicts[rank] == "refused" else "not cleared (use --draft to preview)"
                print(f"  #{rank}: skipped — {why}")
                continue
            if not clip.get("src"):
                continue
            src = (ROOT / clip["src"]).resolve()
            if not src.exists():
                errors.append(f"#{rank}: footage not found: {clip['src']}")
                continue
            a, b = parse_time(clip["cutIn"]), parse_time(clip["cutOut"])
            meta = probe(src)
            if b > meta["duration"] + 0.05:
                errors.append(f"#{rank}: cutOut {b}s is past the end of the source ({meta['duration']:.2f}s)")
                continue
            _, cw, ch = parse_crop(clip.get("crop"), meta)
            if min(cw, ch) < 720 and (e.get("framing") or {}).get("mode") != "blurfill":
                warnings.append(f"#{rank}: picture is {cw}x{ch} — soft when cropped to 9:16; prefer framing.mode 'blurfill'")
            fp = fingerprint(src, a, b, clip.get("crop"))
            dst = CLIPS / f"rank{rank}.mp4"
            cached = state["clips"].get(key, {})
            if cached.get("fingerprint") == fp and dst.exists() and not args.force:
                print(f"  #{rank}: cached")
            else:
                print(f"  #{rank}: trimming {a:.2f}–{b:.2f}s + loudnorm …")
                encode(src, a, b, dst, meta, clip.get("crop"))
            out = probe(dst)
            state["clips"][key] = {
                "file": f"clips/rank{rank}.mp4", "seconds": round(out["duration"], 3),
                "cutIn": a, "cutOut": b, "crop": clip.get("crop"), "width": out["width"], "height": out["height"], "fingerprint": fp,
            }
            contact_sheet(dst, OUT / "review" / f"rank{rank}.jpg", out["duration"])

        # Hook fragment — default: the `seconds` leading up to that rank's payoff.
        hook = cfg.get("hook") or {}
        hr = next((e for e in cfg["entries"] if e["rank"] == hook.get("fromRank", 1)), None)
        state["hook"] = None
        if hr and str(hr["rank"]) in state["clips"]:
            a, b = parse_time(hr["clip"]["cutIn"]), parse_time(hr["clip"]["cutOut"])
            secs = float(hook.get("seconds", 1.0))
            payoff = parse_time(hr.get("payoffAt"))
            payoff = payoff if payoff is not None else a + (b - a) * 0.65
            at = parse_time(hook.get("at"))
            at = at if at is not None else max(a, payoff - secs)
            src = (ROOT / hr["clip"]["src"]).resolve()
            dst = CLIPS / "hook.mp4"
            print(f"  hook: #{hr['rank']} {at:.2f}–{at + secs:.2f}s")
            encode(src, at, at + secs, dst, probe(src), hr["clip"].get("crop"))
            state["hook"] = {"file": "clips/hook.mp4", "seconds": round(probe(dst)["duration"], 3)}
        state["prepared"] = bool(state["clips"])

    final = not errors and not blockers and all(v == "final" for v in verdicts.values())
    state["draft"] = not final
    state["gate"] = {"final": final, "issues": errors + blockers}
    STATE.write_text(json.dumps(state, indent=2) + "\n")
    write_reports(cfg, verdicts)

    print()
    for w in warnings:
        print("  ⚠", w)
    for b in blockers:
        print("  ⛔", b)
    for x in errors:
        print("  ✗", x)
    print("\n✓ FINAL-RENDER READY" if final else "\n✗ NOT final-render ready — draft renders carry a DRAFT · DO NOT PUBLISH band")
    print(f"  state  → {STATE.relative_to(ROOT)}\n  rights → out/rights-report.md, out/credits.txt")
    return 0 if final else 1


def write_reports(cfg: dict, verdicts: dict) -> None:
    OUT.mkdir(exist_ok=True)
    rows = ["| Rank | Label | Status | Route | Tier | Rightsholder | Source | Evidence | Gate |", "|---|---|---|---|---|---|---|---|---|"]
    credits = []
    for e in sorted(cfg.get("entries", []), key=lambda x: -x["rank"]):
        r = e.get("rights") or {}
        rows.append("| #{} | {} | {} | {} | {} | {} | {} | {} | {} |".format(
            e["rank"], e.get("label", ""), r.get("status"), r.get("route"), r.get("riskTier"),
            r.get("rightsholder"), r.get("source"), r.get("evidence"), verdicts.get(e["rank"])))
        if r.get("credit"):
            credits.append(f"#{e['rank']}: {r['credit']}")
    a = cfg.get("audio") or {}
    if a.get("music"):
        rows.append(f"\nMusic: `{a['music']}` — {a.get('musicRights')}")
    (OUT / "rights-report.md").write_text(f"# Rights report — {cfg.get('title')}\n\n" + "\n".join(rows) + "\n")
    (OUT / "credits.txt").write_text(("Clips used with permission / under licence:\n" + "\n".join(credits) + "\n") if credits else "")


if __name__ == "__main__":
    try:
        sys.exit(main())
    except RuntimeError as exc:
        print(f"✗ {exc}", file=sys.stderr)
        sys.exit(2)
