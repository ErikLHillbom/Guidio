# Guidio – Data Service

Microservice that receives the user's location and returns nearby points of interest from MongoDB.

## Setup

```bash
# Start everything (app + MongoDB)
docker compose up -d --build

# Seed mock data (one-time)
docker compose exec app python scripts/seed_db.py

# Seed with actual data 
docker compose exec app python scripts/import_parsed.py

```

For local development without Docker:

```bash
docker compose up -d mongo          # just the database
pip install -e .
python scripts/seed_db.py
uvicorn app.main:app --reload
```

## Usage

```bash
curl -X POST http://localhost:8000/api/v1/locations/update \
  -H "Content-Type: application/json" \
  -d '{"latitude": 59.329, "longitude": 18.069}'
```

Returns nearby POIs, or `204` if the user hasn't moved enough since the last request.

Interactive API docs available at **http://localhost:8000/docs**.

## Config

All settings are overridable via environment variables prefixed with `DATA_`:

| Variable | Default | Description |
|---|---|---|
| `DATA_MONGO_URL` | `mongodb://localhost:27017` | MongoDB connection string |
| `DATA_MONGO_DB` | `guidio` | Database name |
| `DATA_DEFAULT_RADIUS_M` | `300` | Search radius in metres |
| `DATA_MIN_MOVE_THRESHOLD_M` | `50` | Min movement before re-fetching |