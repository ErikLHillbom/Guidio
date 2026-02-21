from fastapi import APIRouter, HTTPException, Path, Response

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
    session = _DEFAULT_SESSION
    last = _last_positions.get(session)

    # Check whether the user has moved enough to warrant a new fetch
    if last is not None:
        distance = haversine_m(last[0], last[1], req.latitude, req.longitude)
        if distance < settings.min_move_threshold_m:
            return Response(status_code=204)

    # Location changed (or first request) – fetch from internal DB
    try:
        pois = await fetch_pois_from_db(req.latitude, req.longitude)
    except Exception as exc:
        raise HTTPException(
            status_code=502, detail=f"Database service error: {exc}"
        ) from exc

    # Remember this position
    _last_positions[session] = (req.latitude, req.longitude)

    return LocationResponse(
        latitude=req.latitude,
        longitude=req.longitude,
        points_of_interest=pois,
    )


@router.get("/detail/{entity_id}", response_model=PoiDetail)
async def get_poi_detail(entity_id: str) -> PoiDetail:
    """Return the text and audio content for a single POI."""
    detail = await fetch_poi_detail(entity_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="POI not found")
    return detail


@router.get("/by-category/{category}", response_model=CategoryLocationsResponse)
async def get_pois_by_category(
    category: str = Path(..., min_length=1, description="Category to filter by"),
) -> CategoryLocationsResponse:
    """Return up to 50 POIs for a category, ranked by text relevance."""
    normalized_category = category.strip()
    if not normalized_category:
        raise HTTPException(status_code=400, detail="Category must not be empty")

    try:
        pois = await fetch_pois_by_category(normalized_category, limit=50)
    except Exception as exc:
        raise HTTPException(
            status_code=502, detail=f"Database service error: {exc}"
        ) from exc

    return CategoryLocationsResponse(
        category=normalized_category,
        points_of_interest=pois,
    )
