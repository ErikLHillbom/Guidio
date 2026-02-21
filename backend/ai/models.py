from dataclasses import dataclass


@dataclass
class Information:
    object_name: str
    location: str
    time: str
    interest: str


@dataclass
class Response:
    text: str
    audio: bytes
