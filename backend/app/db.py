"""MongoDB connection managed via motor (async driver)."""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import settings

_client: AsyncIOMotorClient | None = None


def get_db() -> AsyncIOMotorDatabase:
    """Return the database handle. Call after connect() has been awaited."""
    assert _client is not None, "MongoDB client not initialised – call connect() first"
    return _client[settings.mongo_db]


async def connect() -> None:
    """Open the MongoDB connection and ensure indexes exist."""
    global _client
    _client = AsyncIOMotorClient(settings.mongo_url)

    db = _client[settings.mongo_db]
    await db.pois.create_index([("location", "2dsphere")])
    await db.pois.create_index("entity_id", unique=True)
    await db.pois.create_index("categories")


async def close() -> None:
    """Close the MongoDB connection."""
    global _client
    if _client is not None:
        _client.close()
        _client = None
