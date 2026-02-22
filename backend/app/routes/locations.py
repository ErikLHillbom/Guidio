import logging
from pathlib import Path as FilePath

from fastapi import APIRouter, HTTPException, Path, Response
from fastapi.responses import FileResponse

from app.config import settings
from app.models import (
    CategoryLocationsResponse,
    LocationRequest,
    LocationResponse,
    PoiDetail,
)
from app.services.database import (
    fetch_poi_detail,
    fetch_pois_by_category,
    fetch_pois_from_db,
)
from app.utils import haversine_m

log = logging.getLogger(__name__)

router = APIRouter(prefix="/locations", tags=["locations"])

# In-memory store of the last known position per session/user.
# For a hackathon this is fine; in production you'd use Redis or similar.
_last_positions: dict[str, tuple[float, float]] = {}

# Default session key (single-user for now; swap for a real session/user id later)
_DEFAULT_SESSION = "default"


@router.post(
    "/update",
    response_model=LocationResponse,
    responses={204: {"description": "Location unchanged – no new data"}},
)
async def update_location(req: LocationRequest) -> LocationResponse | Response:
    """Receive the user's current location.

    • If the user hasn't moved significantly → **204 No Content** (nothing to do).
    • Otherwise → query the POI database and return new points of interest.
    """
    log.info("POST /update  lat=%.6f lon=%.6f force=%s", req.latitude, req.longitude, req.force)
    session = _DEFAULT_SESSION
    last = _last_positions.get(session)

    # Check whether the user has moved enough to warrant a new fetch
    if not req.force and last is not None:
        distance = haversine_m(last[0], last[1], req.latitude, req.longitude)
        if distance < settings.min_move_threshold_m:
            log.info("  → 204 (moved %.1f m, threshold %.1f m)", distance, settings.min_move_threshold_m)
            return Response(status_code=204)

    # Location changed (or first request) – fetch from internal DB
    try:
        pois = await fetch_pois_from_db(req.latitude, req.longitude)
    except Exception as exc:
        log.error("  → 502 DB error: %s", exc)
        raise HTTPException(
            status_code=502, detail=f"Database service error: {exc}"
        ) from exc

    # Remember this position
    _last_positions[session] = (req.latitude, req.longitude)

    log.info("  → 200 returning %d POIs", len(pois))
    return LocationResponse(
        latitude=req.latitude,
        longitude=req.longitude,
        points_of_interest=pois,
    )


@router.get("/detail/{entity_id}", response_model=PoiDetail)
async def get_poi_detail(entity_id: str) -> PoiDetail:
    """Return the text and audio content for a single POI."""
    log.info("GET /detail/%s", entity_id)
    detail = await fetch_poi_detail(entity_id)
    if detail is None:
        log.warning("  → 404 POI not found")
        raise HTTPException(status_code=404, detail="POI not found")
    log.info("  → 200 title=%r  has_audio=%s", detail.title, bool(detail.audio_file))
    return detail


@router.get("/audio/{entity_id}")
async def get_poi_audio(entity_id: str) -> FileResponse:
    """Stream the audio file for a single POI."""
    log.info("GET /audio/%s", entity_id)
    detail = await fetch_poi_detail(entity_id)
    if detail is None:
        log.warning("  → 404 POI not found")
        raise HTTPException(status_code=404, detail="POI not found")
    if not detail.audio_file:
        log.warning("  → 404 no audio_file field for this POI")
        raise HTTPException(status_code=404, detail="No audio available for this POI")

    audio_path = FilePath(detail.audio_file)
    if not audio_path.is_file():
        log.warning("  → 404 file missing on disk: %s", audio_path)
        raise HTTPException(status_code=404, detail="Audio file not found on disk")

    log.info("  → 200 serving %s (%.1f KB)", audio_path.name, audio_path.stat().st_size / 1024)
    return FileResponse(
        path=audio_path,
        media_type="audio/mpeg",
        filename=f"{entity_id}.mp3",
    )


@router.get("/by-category/{category}", response_model=CategoryLocationsResponse)
async def get_pois_by_category(
    category: str = Path(..., min_length=1, description="Category to filter by"),
) -> CategoryLocationsResponse:
    """Return up to 50 POIs for a category, ranked by text relevance."""
    log.info("GET /by-category/%s", category)
    normalized_category = category.strip()
    if not normalized_category:
        log.warning("  → 400 empty category")
        raise HTTPException(status_code=400, detail="Category must not be empty")

    try:
        pois = await fetch_pois_by_category(normalized_category, limit=50)
    except Exception as exc:
        log.error("  → 502 DB error: %s", exc)
        raise HTTPException(
            status_code=502, detail=f"Database service error: {exc}"
        ) from exc

    log.info("  → 200 returning %d POIs for category %r", len(pois), normalized_category)
    return CategoryLocationsResponse(
        category=normalized_category,
        points_of_interest=pois,
    )
