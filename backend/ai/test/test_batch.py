"""Batch test: generate audio for parsed JSON files in data/scripts/parsed/.

Usage:
    uv run python ai/test/test_batch.py              # all files
    uv run python ai/test/test_batch.py Q1754 Q54315  # specific entity IDs
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

from ai import Information, describe

PARSED_DIR = Path(__file__).resolve().parents[2] / "data" / "scripts" / "parsed"
OUTPUT_DIR = Path(__file__).parent / "output"


def load_information(path: Path) -> Information:
    data = json.loads(path.read_text())
    return Information(
        title=data["title"],
        latitude=data["latitude"],
        longitude=data["longitude"],
        summary=data.get("summary", ""),
        text=data.get("text", ""),
        direction="",
        location="Stockholm, Sweden",
        interest="history and culture",
    )


def main():
    """
    # All files
    uv run python ai/test/test_batch.py

    # Specific ones
    uv run python ai/test/test_batch.py Q1754 Q54315
    """

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    args = sys.argv[1:]
    if args:
        json_files = []
        for entity_id in args:
            path = PARSED_DIR / f"{entity_id}.json"
            if path.exists():
                json_files.append(path)
            else:
                print(f"Warning: {entity_id}.json not found, skipping")
    else:
        json_files = sorted(PARSED_DIR.glob("*.json"))

    if not json_files:
        print(f"No JSON files found in {PARSED_DIR}")
        return

    print(f"Processing {len(json_files)} file(s)\n")

    for i, path in enumerate(json_files, 1):
        ctx = load_information(path)
        print(f"[{i}/{len(json_files)}] {ctx.title} ({path.stem})")
        print(f"  Generating description...")

        result = describe(ctx)

        print(f"  Text: {result.text[:100]}...")
        print(f"  Audio: {len(result.audio)} bytes")

        output_path = OUTPUT_DIR / f"{path.stem}.mp3"
        output_path.write_bytes(result.audio)
        print(f"  Saved to {output_path.name}\n")

    print("Done!")


if __name__ == "__main__":
    main()
