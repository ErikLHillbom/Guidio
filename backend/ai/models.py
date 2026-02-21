from dataclasses import dataclass


@dataclass
class Information:
    title: str
    latitude: float
    summary: str
    text: str
    location: str
    time: str
    interest: str


@dataclass
class Response:
    text: str
    audio: bytes
