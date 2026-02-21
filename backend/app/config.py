from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment / .env file."""

    host: str = "0.0.0.0"
    port: int = 8000

    # Search radius (metres) used when querying the database
    default_radius_m: int = 300

    # Minimum distance (metres) the user must move before we fetch new data
    min_move_threshold_m: float = 50

    # MongoDB connection
    mongo_url: str = "mongodb://localhost:27017"
    mongo_db: str = "guidio"

    model_config = {"env_prefix": "DATA_"}


settings = Settings()
