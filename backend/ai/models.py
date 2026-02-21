from dataclasses import dataclass


@dataclass
class Information:
    title: str
    latitude: float
    longitude: float
    summary: str
    text: str
    location: str
    interest: str


@dataclass
class Response:
    text: str
    audio: bytes
