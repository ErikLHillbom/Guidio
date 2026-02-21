"""Batch test: generate audio for parsed JSON files in data/scripts/parsed/.

Usage:
    uv run python ai/test/test_batch.py                # next 10 unprocessed files
    uv run python ai/test/test_batch.py -n 5           # next 5 unprocessed files
    uv run python ai/test/test_batch.py --all           # all unprocessed files
    uv run python ai/test/test_batch.py Q1754 Q54315    # specific entity IDs (even if already done)
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

from ai import Information, describe

PARSED_DIR = Path(__file__).resolve().parents[2] / "scripts" / "parsed"
OUTPUT_DIR = Path(__file__).parent / "output"
DEFAULT_BATCH_SIZE = 10


def load_information(path: Path) -> Information:
    data = json.loads(path.read_text())
    return Information(
        title=data["title"],
        latitude=data["latitude"],
        longitude=data["longitude"],
        summary=data.get("summary", ""),
        text=data.get("text", ""),
        location="Stockholm, Sweden",
        interest="history and culture",
    )


def is_done(path: Path) -> bool:
    return (OUTPUT_DIR / f"{path.stem}.mp3").exists()


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    args = sys.argv[1:]

    all_files = sorted(PARSED_DIR.glob("*.json"))
    done = [f for f in all_files if is_done(f)]
    remaining = [f for f in all_files if not is_done(f)]

    print(f"Total: {len(all_files)} | Done: {len(done)} | Remaining: {len(remaining)}\n")

    if args and args[0] not in ("-n", "--all"):
        json_files = []
        for entity_id in args:
            path = PARSED_DIR / f"{entity_id}.json"
            if path.exists():
                json_files.append(path)
            else:
                print(f"Warning: {entity_id}.json not found, skipping")
    elif "--all" in args:
        json_files = remaining
    else:
        batch_size = DEFAULT_BATCH_SIZE
        if "-n" in args:
            idx = args.index("-n")
            batch_size = int(args[idx + 1])
        json_files = remaining[:batch_size]

    if not json_files:
        print("Nothing to process!")
        return

    print(f"Processing {len(json_files)} file(s)\n")

    for i, path in enumerate(json_files, 1):
        ctx = load_information(path)
        print(f"[{i}/{len(json_files)}] {ctx.title} ({path.stem})")
        print(f"  Generating description...")

        result = describe(ctx)

        print(f"  Text: {result.text[:100]}...")
        print(f"  Audio: {len(result.audio)} bytes")

        (OUTPUT_DIR / f"{path.stem}.mp3").write_bytes(result.audio)
        (OUTPUT_DIR / f"{path.stem}.txt").write_text(result.text)
        print(f"  Saved {path.stem}.mp3 + {path.stem}.txt\n")

    done_now = len([f for f in all_files if is_done(f)])
    print(f"Done! ({done_now}/{len(all_files)} total completed)")


if __name__ == "__main__":
    main()
