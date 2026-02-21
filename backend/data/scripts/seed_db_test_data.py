"""Seed the MongoDB 'pois' collection with a few mock entries for development."""

import asyncio
import os
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.getenv("DATA_MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DATA_MONGO_DB", "guidio")

MOCK_POIS = [
    {
        "entity_id": "Q289100",
        "title": "Deutsche Schule Stockholm",
        "categories": ["historic", "culture"],
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/2/2c/Deutsche_Schule_Stockholm%2C_Eingangstor_Karlav%C3%A4gen_25.JPG",
        "text": (
            "<p><b>Deutsche Schule Stockholm</b> (Swedish: <i>Tyska skolan Stockholm</i>) "
            "is a German international school in Stockholm, Sweden. It serves levels "
            "<i>Vorschule</i> through year 12 of gymnasium.</p>"
        ),
        "summary": (
            "Deutsche Schule Stockholm is a German international school in Stockholm, Sweden. "
            "It serves levels Vorschule through year 12 of gymnasium."
        ),
        "text_audio": "",
        "audio_file": "",
        "location": {
            "type": "Point",
            "coordinates": [18.06982222, 59.341925],  # [lng, lat]
        },
    },
    {
        "entity_id": "Q819823",
        "title": "Storkyrkan",
        "categories": ["historic", "culture"],
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/3/3e/Storkyrkan_2012.jpg",
        "text": (
            "<p><b>Storkyrkan</b> (The Great Church), officially named <i>Sankt Nikolai kyrka</i>, "
            "is the oldest church in Gamla stan, the old town of Stockholm, Sweden.</p>"
        ),
        "summary": (
            "Storkyrkan is the oldest church in Gamla stan, the old town of Stockholm, Sweden. "
            "It is the cathedral of the Diocese of Stockholm."
        ),
        "text_audio": "",
        "audio_file": "",
        "location": {
            "type": "Point",
            "coordinates": [18.070556, 59.325833],
        },
    },
    {
        "entity_id": "Q215833",
        "title": "Kungliga Slottet",
        "categories": ["historic", "culture"],
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/7/7c/Stockholm_palace_2011.jpg",
        "text": (
            "<p><b>Stockholm Palace</b> (Swedish: <i>Stockholms slott</i> or <i>Kungliga slottet</i>) "
            "is the official residence and major royal palace of the Swedish monarch.</p>"
        ),
        "summary": (
            "Stockholm Palace is the official residence and major royal palace of the Swedish monarch, "
            "located on Stadsholmen in Gamla stan."
        ),
        "text_audio": "",
        "audio_file": "",
        "location": {
            "type": "Point",
            "coordinates": [18.0716, 59.3268],
        },
    },
    {
        "entity_id": "Q842858",
        "title": "Vasa Museum",
        "categories": ["historic", "culture"],
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/8/80/Vasamuseet_2008.jpg",
        "text": (
            "<p><b>The Vasa Museum</b> (Swedish: <i>Vasamuseet</i>) is a maritime museum on "
            "Djurgården island in Stockholm, Sweden. It displays the almost fully intact "
            "17th-century warship Vasa that sank on her maiden voyage in 1628.</p>"
        ),
        "summary": (
            "The Vasa Museum is a maritime museum in Stockholm displaying the warship Vasa, "
            "which sank in 1628 and was salvaged in 1961."
        ),
        "text_audio": "",
        "audio_file": "",
        "location": {
            "type": "Point",
            "coordinates": [18.0914, 59.3280],
        },
    },
    {
        "entity_id": "Q1752772",
        "title": "Fotografiska",
        "categories": ["culture"],
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/4/4c/Fotografiska_2013.jpg",
        "text": (
            "<p><b>Fotografiska</b> is a centre for contemporary photography in Stockholm, Sweden, "
            "located in the Art Nouveau industrial building Stora Tullhuset at Stadsgårdshamnen.</p>"
        ),
        "summary": (
            "Fotografiska is a centre for contemporary photography in Stockholm, housed in a "
            "former customs building on the waterfront."
        ),
        "text_audio": "",
        "audio_file": "",
        "location": {
            "type": "Point",
            "coordinates": [18.0856, 59.3178],
        },
    },
]


async def seed():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    collection = db.pois

    # Clean slate
    await collection.delete_many({})

    # Add timestamps
    now = datetime.now(timezone.utc)
    for poi in MOCK_POIS:
        poi["created_at"] = now

    result = await collection.insert_many(MOCK_POIS)
    print(f"Inserted {len(result.inserted_ids)} mock POIs into '{DB_NAME}.pois'")

    # Ensure the geospatial index
    await collection.create_index([("location", "2dsphere")])
    print("Created 2dsphere index on 'location'")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
