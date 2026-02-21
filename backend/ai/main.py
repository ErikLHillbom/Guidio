from __future__ import annotations

import re
from .models import Information
from typing import Generator, Iterator
from .utils import _buffer_sentences

from .services import llm, tts


def describe(ctx: Information) -> Generator[dict, None, None]:
    """Stream both text and audio for a point of interest.

    Yields dicts of two kinds:
      {"type": "text",  "data": "<sentence>"}
      {"type": "audio", "data": b"<mp3 bytes>"}

    Usage:
    for chunk in describe(Information(object_name="Eiffel Tower", location="Paris", time="afternoon", interest="history")):
        if item["type"] == "text": ...
        if item["type"] == "audio": ...
    """

    text_stream = llm.stream(
        object_name=ctx.object_name,
        location=ctx.location,
        time=ctx.time,
        interest=ctx.interest,
    )

    for sentence in _buffer_sentences(text_stream):
        yield {"type": "text", "data": sentence}
        for audio_chunk in tts.synthesize_stream(sentence):
            yield {"type": "audio", "data": audio_chunk}

