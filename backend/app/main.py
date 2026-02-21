import uvicorn
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app import db
from app.config import settings
from app.routes import locations


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Connect to MongoDB on startup, disconnect on shutdown."""
    await db.connect()
    yield
    await db.close()


app = FastAPI(
    title="Guidio - Data Service",
    description="Receives the user's location and returns nearby points of interest from the internal database.",
    version="0.1.0",
    lifespan=lifespan,
)

# Allow the frontend (and other services) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve generated tour audio files so frontend can fetch URLs built from `audio_file`.
audio_output_candidates = [
    Path("/app/ai/test/output"),
    Path(__file__).resolve().parents[1] / "ai" / "test" / "output",
]
for candidate in audio_output_candidates:
    if candidate.exists() and candidate.is_dir():
        app.mount(
            "/app/ai/test/output",
            StaticFiles(directory=str(candidate)),
            name="audio-output",
        )
        break

app.include_router(locations.router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)
