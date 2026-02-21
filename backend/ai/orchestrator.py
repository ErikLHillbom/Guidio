from __future__ import annotations

import re
from .models import Information
from typing import Generator, Iterator

from . import llm, tts


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



# -------
# Helpers 
# -------

SENTENCE_BOUNDARY = re.compile(r"(?<=[.!?])\s+")

def _buffer_sentences(text_stream: Iterator[str]) -> Generator[str, None, None]:
    """Accumulate streamed tokens into full sentences before yielding.

    Splits on sentence-ending punctuation (.!?) followed by whitespace.
    Flushes any remaining text at the end.
    """
    buf = ""
    for chunk in text_stream:
        buf += chunk
        while True:
            match = SENTENCE_BOUNDARY.search(buf)
            if not match:
                break
            sentence = buf[: match.start() + 1].strip()
            buf = buf[match.end() :]
            if sentence:
                yield sentence
    remainder = buf.strip()
    if remainder:
        yield remainder
