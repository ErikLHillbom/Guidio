"""Query the MongoDB 'pois' collection for nearby points of interest."""

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
