#!/usr/bin/env python3
"""Remove duplicate POI documents by exact coordinates.

Rule:
- Group documents by `location.coordinates` (exact match).
- For groups with more than one document, keep exactly one:
  the one with the largest `text` length.
- If lengths tie, keep the smallest `_id` for deterministic behavior.

By default this script runs in dry-run mode and only reports what it would delete.
Use `--apply` to perform deletion.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
from typing import Any

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorCollection


DEFAULT_MONGO_URL = os.getenv("DATA_MONGO_URL", "mongodb://localhost:27017")
DEFAULT_DB_NAME = os.getenv("DATA_MONGO_DB", "guidio")
DEFAULT_COLLECTION = "pois"


def _build_pipeline() -> list[dict[str, Any]]:
    """Aggregation pipeline to identify duplicate coordinate groups."""
    return [
        {
            "$match": {
                "location.coordinates.0": {"$type": "number"},
                "location.coordinates.1": {"$type": "number"},
            }
        },
        {
            "$addFields": {
                "_text_len": {
                    "$strLenCP": {
                        "$cond": [
                            {"$eq": [{"$type": "$text"}, "string"]},
                            "$text",
                            "",
                        ]
                    }
                }
            }
        },
        {
            "$sort": {
                "location.coordinates.0": 1,
                "location.coordinates.1": 1,
                "_text_len": -1,
                "_id": 1,
            }
        },
        {
            "$group": {
                "_id": "$location.coordinates",
                "count": {"$sum": 1},
                "docs": {"$push": {"_id": "$_id", "text_len": "$_text_len"}},
            }
        },
        {"$match": {"count": {"$gt": 1}}},
        {
            "$project": {
                "_id": 0,
                "coordinates": "$_id",
                "keep_id": {"$arrayElemAt": ["$docs._id", 0]},
                "keep_text_len": {"$arrayElemAt": ["$docs.text_len", 0]},
                "delete_ids": {
                    "$map": {
                        "input": {
                            "$slice": [
                                "$docs",
                                1,
                                {"$subtract": ["$count", 1]},
                            ]
                        },
                        "as": "d",
                        "in": "$$d._id",
                    }
                },
            }
        },
    ]


def _serialize_preview(group: dict[str, Any]) -> dict[str, Any]:
    """Serialize aggregate group for human-readable JSON output."""
    return {
        "coordinates": group.get("coordinates"),
        "keep_id": str(group.get("keep_id")),
        "keep_text_len": group.get("keep_text_len", 0),
        "delete_count": len(group.get("delete_ids", [])),
        "delete_ids": [str(item) for item in group.get("delete_ids", [])],
    }


async def _scan_duplicates(
    collection: AsyncIOMotorCollection,
    preview_limit: int,
) -> tuple[int, list[Any], list[dict[str, Any]]]:
    """Return number of duplicate groups, ids to delete, and preview groups."""
    duplicate_groups = 0
    ids_to_delete: list[Any] = []
    preview: list[dict[str, Any]] = []

    cursor = collection.aggregate(_build_pipeline(), allowDiskUse=True)
    async for group in cursor:
        duplicate_groups += 1
        delete_ids = group.get("delete_ids", [])
        ids_to_delete.extend(delete_ids)
        if len(preview) < preview_limit:
            preview.append(_serialize_preview(group))

    return duplicate_groups, ids_to_delete, preview


async def _delete_in_chunks(
    collection: AsyncIOMotorCollection,
    ids_to_delete: list[Any],
    chunk_size: int,
) -> int:
    """Delete ids in chunks to avoid oversized `$in` filters."""
    deleted_total = 0
    for start in range(0, len(ids_to_delete), chunk_size):
        chunk = ids_to_delete[start : start + chunk_size]
        result = await collection.delete_many({"_id": {"$in": chunk}})
        deleted_total += result.deleted_count
    return deleted_total


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Deduplicate POIs by exact coordinates, keeping longest text.",
    )
    parser.add_argument(
        "--mongo-url",
        default=DEFAULT_MONGO_URL,
        help=f"Mongo connection URL (default: {DEFAULT_MONGO_URL})",
    )
    parser.add_argument(
        "--db",
        default=DEFAULT_DB_NAME,
        help=f"Database name (default: {DEFAULT_DB_NAME})",
    )
    parser.add_argument(
        "--collection",
        default=DEFAULT_COLLECTION,
        help=f"Collection name (default: {DEFAULT_COLLECTION})",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply deletions. If omitted, runs in dry-run mode.",
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=1000,
        help="Chunk size for delete_many operations (default: 1000).",
    )
    parser.add_argument(
        "--preview",
        type=int,
        default=5,
        help="How many duplicate groups to print as preview (default: 5).",
    )
    return parser.parse_args()


async def _run() -> int:
    args = _parse_args()

    if args.chunk_size <= 0:
        raise ValueError("--chunk-size must be > 0")
    if args.preview < 0:
        raise ValueError("--preview must be >= 0")

    client = AsyncIOMotorClient(args.mongo_url)
    try:
        collection = client[args.db][args.collection]
        duplicate_groups, ids_to_delete, preview = await _scan_duplicates(
            collection, preview_limit=args.preview
        )

        deleted_count = 0
        if args.apply and ids_to_delete:
            deleted_count = await _delete_in_chunks(
                collection,
                ids_to_delete,
                chunk_size=args.chunk_size,
            )

        summary = {
            "dry_run": not args.apply,
            "database": args.db,
            "collection": args.collection,
            "duplicate_groups": duplicate_groups,
            "docs_to_delete": len(ids_to_delete),
            "deleted_count": deleted_count,
            "preview": preview,
        }
        print(json.dumps(summary, indent=2))
        return 0
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(_run()))
