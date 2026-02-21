#!/usr/bin/env python3
import argparse
import json
import re
import sys
import time
from pathlib import Path
from typing import Dict, List, Tuple

from wikidata_entity_to_json import build_json

try:
    from tqdm import tqdm
except Exception:  # pragma: no cover - fallback for environments without tqdm
    tqdm = None

QID_RE = re.compile(r"(Q\d+)$")


def extract_entity_ids(entities_path: Path) -> Tuple[List[str], int]:
    raw = json.loads(entities_path.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        raise ValueError(f"{entities_path} must contain a JSON list of entities.")

    ids: List[str] = []
    seen = set()
    invalid_count = 0

    for row in raw:
        if not isinstance(row, dict):
            invalid_count += 1
            continue
        item = str(row.get("item", "")).rstrip("/")
        match = QID_RE.search(item)
        if not match:
            invalid_count += 1
            continue
        qid = match.group(1)
        if qid in seen:
            continue
        seen.add(qid)
        ids.append(qid)

    return ids, invalid_count


def write_json(path: Path, payload: Dict) -> None:
    tmp_path = path.with_suffix(path.suffix + ".tmp")
    with tmp_path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    tmp_path.replace(path)


def parse_args() -> argparse.Namespace:
    default_dir = Path(__file__).resolve().parent

    parser = argparse.ArgumentParser(
        description="Build parsed JSON files for all entities in all_entities.json."
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=default_dir / "all_entities.json",
        help="Path to the source all_entities.json file.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=default_dir / "parsed",
        help="Directory where <QID>.json files will be written.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Reparse entities even if output JSON already exists.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Optional max number of entities to process.",
    )
    parser.add_argument(
        "--start",
        type=int,
        default=0,
        help="Start index in the deduplicated entity list.",
    )
    parser.add_argument(
        "--retries",
        type=int,
        default=2,
        help="Retries per entity after the initial attempt.",
    )
    parser.add_argument(
        "--retry-delay",
        type=float,
        default=2.0,
        help="Base seconds for retry backoff (attempt_n = retry_delay * 2^(n-1)).",
    )
    parser.add_argument(
        "--sleep-between",
        type=float,
        default=0.3,
        help="Extra delay in seconds between entities (polite pacing).",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if not args.input.exists():
        print(f"Input file not found: {args.input}", file=sys.stderr)
        return 1

    entity_ids, invalid_rows = extract_entity_ids(args.input)
    total_unique = len(entity_ids)

    if args.start < 0:
        print("--start must be >= 0", file=sys.stderr)
        return 1
    if args.start >= total_unique:
        print(f"--start ({args.start}) is out of range for {total_unique} entities.", file=sys.stderr)
        return 1

    ids_to_process = entity_ids[args.start:]
    if args.limit is not None:
        ids_to_process = ids_to_process[: max(0, args.limit)]

    args.output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Loaded {total_unique} unique entity IDs from {args.input}")
    if invalid_rows:
        print(f"Skipped {invalid_rows} rows without a valid Wikidata entity URL in 'item'.")
    print(f"Processing {len(ids_to_process)} entities into {args.output_dir}")

    failed: List[Dict[str, str]] = []
    created = 0
    skipped_existing = 0

    use_tqdm = tqdm is not None
    iterator = tqdm(ids_to_process, desc="Parsing entities", unit="entity") if use_tqdm else ids_to_process
    fallback_start = time.time()
    if not use_tqdm:
        print("tqdm is not available; install with `uv add tqdm` for a live progress bar.")

    total = len(ids_to_process)
    for idx, qid in enumerate(iterator, start=1):
        out_path = args.output_dir / f"{qid}.json"
        if out_path.exists() and not args.force:
            skipped_existing += 1
        else:
            last_error = None
            total_attempts = args.retries + 1
            for attempt in range(1, total_attempts + 1):
                try:
                    data = build_json(qid)
                    write_json(out_path, data)
                    created += 1
                    last_error = None
                    break
                except Exception as exc:
                    last_error = exc
                    if attempt < total_attempts:
                        delay = args.retry_delay * (2 ** (attempt - 1))
                        time.sleep(delay)

            if last_error is not None:
                failed.append({"entity_id": qid, "error": str(last_error)})

        if args.sleep_between > 0 and idx < total:
            time.sleep(args.sleep_between)

        if not use_tqdm and (idx == 1 or idx % 25 == 0 or idx == total):
            elapsed = time.time() - fallback_start
            rate = (idx / elapsed) if elapsed > 0 else 0.0
            eta = ((total - idx) / rate) if rate > 0 else 0.0
            print(f"[{idx}/{total}] elapsed={elapsed/60:.1f}m eta={eta/60:.1f}m rate={rate:.2f} entities/s")

    print("\nRun finished")
    print(f"Created: {created}")
    print(f"Skipped existing: {skipped_existing}")
    print(f"Failed: {len(failed)}")

    if failed:
        failures_path = args.output_dir / "_failed_entities.json"
        write_json(failures_path, {"failed": failed})
        print(f"Failure details written to: {failures_path}")

    return 0 if not failed else 2


if __name__ == "__main__":
    raise SystemExit(main())
