"""Query the MongoDB 'pois' collection for nearby points of interest."""

import re
from typing import Any, Mapping

from app.config import settings
from app.db import get_db
from app.models import PoiDetail, PointOfInterest


async def fetch_pois_from_db(
    lat: float, lon: float, radius_m: int | None = None
) -> list[PointOfInterest]:
    """Find POIs within *radius_m* metres of (lat, lon) using a 2dsphere query.

    Each document in the ``pois`` collection must have a GeoJSON ``location``
    field (created by the seed script / teammate's ingestion pipeline).
    """
    radius_m = radius_m or settings.default_radius_m
    db = get_db()

    cursor = db.pois.find(
        {
            "location": {
                "$nearSphere": {
                    "$geometry": {
                        "type": "Point",
                        "coordinates": [lon, lat],  # GeoJSON is [lng, lat]
                    },
                    "$maxDistance": radius_m,
                }
            }
        }
    )

    pois: list[PointOfInterest] = []
    async for doc in cursor:
        pois.append(
            PointOfInterest(
                entity_id=doc["entity_id"],
                title=doc.get("title", ""),
                latitude=doc["location"]["coordinates"][1],
                longitude=doc["location"]["coordinates"][0],
                categories=doc.get("categories", []),
                image_url=doc.get("image_url"),
                summary=doc.get("summary"),
            )
        )
    return pois


async def fetch_poi_detail(entity_id: str) -> PoiDetail | None:
    """Fetch the text and audio fields for a single POI by entity_id."""
    db = get_db()
    doc = await db.pois.find_one(
        {"entity_id": entity_id},
        {"entity_id": 1, "title": 1, "text": 1, "text_audio": 1, "audio_file": 1},
    )
    if doc is None:
        return None
    return PoiDetail(
        entity_id=doc["entity_id"],
        title=doc.get("title", ""),
        text=doc.get("text"),
        text_audio=doc.get("text_audio"),
        audio_file=doc.get("audio_file"),
    )


def _text_relevance_score(doc: Mapping[str, Any]) -> int:
    """Rank POIs by amount of textual content (text, fallback to summary)."""
    text = doc.get("text")
    if isinstance(text, str) and text.strip():
        return len(text.strip())

    summary = doc.get("summary")
    if isinstance(summary, str) and summary.strip():
        return len(summary.strip())

    return 0


async def fetch_pois_by_category(
    category: str, limit: int = 50
) -> list[PointOfInterest]:
    """Fetch up to ``limit`` POIs matching ``category``, ranked by text length."""
    normalized_category = category.strip()
    if not normalized_category or limit <= 0:
        return []

    db = get_db()
    category_pattern = re.compile(
        rf"^{re.escape(normalized_category)}$", flags=re.IGNORECASE
    )

    cursor = db.pois.find(
        {"categories": category_pattern},
        {
            "entity_id": 1,
            "title": 1,
            "location": 1,
            "categories": 1,
            "image_url": 1,
            "text": 1,
            "summary": 1,
        },
    )

    matching_docs: list[dict[str, Any]] = []
    async for doc in cursor:
        location = doc.get("location")
        coordinates = (
            location.get("coordinates")
            if isinstance(location, dict)
            else None
        )
        if not (isinstance(coordinates, list) and len(coordinates) >= 2):
            continue

        lon, lat = coordinates[0], coordinates[1]
        if not isinstance(lat, int | float) or not isinstance(lon, int | float):
            continue

        matching_docs.append(doc)

    matching_docs.sort(
        key=lambda doc: (
            -_text_relevance_score(doc),
            str(doc.get("title", "")),
            str(doc.get("entity_id", "")),
        )
    )

    pois: list[PointOfInterest] = []
    for doc in matching_docs[:limit]:
        entity_id = doc.get("entity_id")
        if not isinstance(entity_id, str) or not entity_id:
            continue

        location = doc["location"]
        coordinates = location["coordinates"]
        categories = doc.get("categories", [])
        categories = (
            [value for value in categories if isinstance(value, str)]
            if isinstance(categories, list)
            else []
        )

        title = doc.get("title", "")
        pois.append(
            PointOfInterest(
                entity_id=entity_id,
                title=title if isinstance(title, str) else "",
                latitude=float(coordinates[1]),
                longitude=float(coordinates[0]),
                categories=categories,
                image_url=doc.get("image_url"),
            )
        )

    return pois
