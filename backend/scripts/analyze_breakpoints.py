"""Detect silent periods in guide MP3 files and write breakpoint timestamps.

For each {entity_id}.mp3 in ai/test/output/, produces a sibling
{entity_id}.breaks.json containing the audio duration and timestamps
(in milliseconds) where a natural pause occurs — suitable for
interrupting playback when the user walks away.

Usage:
    uv run python scripts/analyze_breakpoints.py              # all MP3s missing a .breaks.json
    uv run python scripts/analyze_breakpoints.py --all        # regenerate all
    uv run python scripts/analyze_breakpoints.py Q1754 Q54315 # specific entity IDs

Requires ffmpeg (or libav) on PATH for pydub to decode MP3.
"""

import json
import sys
from pathlib import Path

from pydub import AudioSegment
from pydub.silence import detect_silence

OUTPUT_DIR = Path(__file__).resolve().parents[1] / "ai" / "test" / "output"

MIN_SILENCE_MS = 400
SILENCE_THRESH_DB = -36


def find_breakpoints(mp3_path: Path) -> dict:
    """Return a dict with duration and breakpoint timestamps for one MP3."""
    audio = AudioSegment.from_mp3(mp3_path)
    duration_ms = len(audio)

    silences = detect_silence(
        audio,
        min_silence_len=MIN_SILENCE_MS,
        silence_thresh=SILENCE_THRESH_DB,
    )

    breakpoints_ms = [
        (start + end) // 2
        for start, end in silences
        if start > 0 and end < duration_ms
    ]

    return {
        "entity_id": mp3_path.stem,
        "duration_ms": duration_ms,
        "breakpoints_ms": breakpoints_ms,
    }


def main() -> None:
    args = sys.argv[1:]

    if args and args[0] not in ("--all",):
        mp3_files = []
        for entity_id in args:
            p = OUTPUT_DIR / f"{entity_id}.mp3"
            if p.exists():
                mp3_files.append(p)
            else:
                print(f"Warning: {entity_id}.mp3 not found, skipping")
    else:
        mp3_files = sorted(OUTPUT_DIR.glob("*.mp3"))
        if "--all" not in args:
            mp3_files = [
                p for p in mp3_files
                if not (OUTPUT_DIR / f"{p.stem}.breaks.json").exists()
            ]

    if not mp3_files:
        print("Nothing to process!")
        return

    print(f"Analyzing {len(mp3_files)} file(s)\n")

    for i, mp3_path in enumerate(mp3_files, 1):
        print(f"[{i}/{len(mp3_files)}] {mp3_path.stem}")
        result = find_breakpoints(mp3_path)
        out_path = OUTPUT_DIR / f"{mp3_path.stem}.breaks.json"
        out_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print(
            f"  duration={result['duration_ms']}ms  "
            f"breakpoints={len(result['breakpoints_ms'])}  "
            f"→ {out_path.name}"
        )

    print(f"\nDone! Processed {len(mp3_files)} file(s).")


if __name__ == "__main__":
    main()
