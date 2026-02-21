from pydantic import BaseModel, Field


class LocationRequest(BaseModel):
    """Incoming request with the user's current position."""

    latitude: float = Field(..., ge=-90, le=90, description="User latitude")
    longitude: float = Field(..., ge=-180, le=180, description="User longitude")


class PointOfInterest(BaseModel):
    """A single interesting location returned to the client."""

    entity_id: str
    title: str
    latitude: float
    longitude: float
    categories: list[str] = []
    image_url: str | None = None


class LocationResponse(BaseModel):
    """Response containing newly discovered points of interest."""

    latitude: float
    longitude: float
    points_of_interest: list[PointOfInterest]


class PoiDetail(BaseModel):
    """Detailed content for a single POI (text + audio)."""

    entity_id: str
    title: str
    text: str | None = None
    text_audio: str | None = None
    audio_file: str | None = None
