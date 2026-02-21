"""Import all parsed JSON files from scripts/parsed/ into the MongoDB 'pois' collection."""

import asyncio
import json
import os
from pathlib import Path

from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.getenv("DATA_MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DATA_MONGO_DB", "guidio")
PARSED_DIR = Path(__file__).parent / "parsed"
AUDIO_OUTPUT_DIR = Path(__file__).parent.parent / "ai" / "test" / "output"


def _to_doc(data: dict) -> dict:
    """Convert a parsed JSON entity into a MongoDB document with a GeoJSON location."""
    doc = {**data}

    # Build GeoJSON location from flat lat/lon
    lat = doc.pop("latitude", None)
    lon = doc.pop("longitude", None)
    if lat is not None and lon is not None:
        doc["location"] = {
            "type": "Point",
            "coordinates": [lon, lat],  # GeoJSON is [lng, lat]
        }

    # Attach audio text and audio file path if available
    entity_id = doc.get("entity_id")
    if entity_id:
        txt_path = AUDIO_OUTPUT_DIR / f"{entity_id}.txt"
        mp3_path = AUDIO_OUTPUT_DIR / f"{entity_id}.mp3"

        if txt_path.exists():
            doc["text_audio"] = txt_path.read_text(encoding="utf-8")
            print(f"  Attached audio text for {entity_id}")
            print(doc["text_audio"][:100])  # Print first 100 characters
        else:
            doc["text_audio"] = None

        if mp3_path.exists():
            doc["audio_file"] = str(mp3_path)
            print(f"  Attached audio file for {entity_id}: {mp3_path}")
        else:
            doc["audio_file"] = None

    return doc


async def import_all():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    collection = db.pois

    # Drop existing data
    deleted = await collection.delete_many({})
    print(f"Cleared {deleted.deleted_count} existing documents")

    # Read all JSON files
    files = sorted(PARSED_DIR.glob("*.json"))
    if not files:
        print(f"No JSON files found in {PARSED_DIR}")
        client.close()
        return

    docs = []
    skipped = 0
    for f in files:
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            doc = _to_doc(data)
            if "location" not in doc:
                skipped += 1
                continue
            docs.append(doc)
        except Exception as e:
            print(f"  Skipping {f.name}: {e}")
            skipped += 1

    if docs:
        result = await collection.insert_many(docs)
        print(f"Inserted {len(result.inserted_ids)} POIs into '{DB_NAME}.pois'")
    else:
        print("No valid documents to insert")

    if skipped:
        print(f"Skipped {skipped} files (missing coordinates or parse errors)")

    # Ensure geospatial index
    await collection.create_index([("location", "2dsphere")])
    print("Ensured 2dsphere index on 'location'")

    client.close()


if __name__ == "__main__":
    asyncio.run(import_all())
