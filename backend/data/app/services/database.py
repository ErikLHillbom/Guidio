"""Query the MongoDB 'pois' collection for nearby points of interest."""

from app.config import settings
from app.db import get_db
from app.models import PointOfInterest


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
                text=doc.get("text"),
                text_audio=doc.get("text_audio"),
                audio_file=doc.get("audio_file"),
                summary=doc.get("summary"),
                created_at=doc.get("created_at"),
            )
        )
    return pois
