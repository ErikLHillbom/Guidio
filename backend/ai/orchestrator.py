"""Orchestrator: ties LLM generation to ElevenLabs TTS.

The key design goal is *low time-to-first-audio*.  Instead of waiting for
the entire LLM response before synthesizing speech, we buffer the streamed
text into sentences and synthesize each one as soon as it's complete.
The listener hears the first sentence while the LLM is still generating
the rest.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Generator, Iterator

from . import llm, tts

SENTENCE_BOUNDARY = re.compile(r"(?<=[.!?])\s+")


@dataclass
class GuideContext:
    object_name: str
    location: str
    time: str
    interest: str


@dataclass
class GuideResponse:
    text: str
    audio: bytes


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


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def describe(ctx: GuideContext) -> GuideResponse:
    """Generate a tour-guide description and synthesize audio (blocking)."""
    text = llm.generate(
        object_name=ctx.object_name,
        location=ctx.location,
        time=ctx.time,
        interest=ctx.interest,
    )
    audio = tts.synthesize(text)
    return GuideResponse(text=text, audio=audio)


def describe_audio_stream(ctx: GuideContext) -> Generator[bytes, None, None]:
    """Stream audio chunks with minimal delay.

    1. LLM text is streamed token-by-token.
    2. Tokens are buffered into complete sentences.
    3. Each sentence is sent to ElevenLabs immediately.
    4. Audio bytes for that sentence are yielded.

    The caller can start playback as soon as the first chunk arrives.
    """
    text_stream = llm.stream(
        object_name=ctx.object_name,
        location=ctx.location,
        time=ctx.time,
        interest=ctx.interest,
    )
    for sentence in _buffer_sentences(text_stream):
        for audio_chunk in tts.synthesize_stream(sentence):
            yield audio_chunk


def describe_full_stream(
    ctx: GuideContext,
) -> Generator[dict, None, None]:
    """Stream both text and audio, yielding typed dicts.

    Yields dicts of two kinds:
      {"type": "text",  "data": "<sentence>"}
      {"type": "audio", "data": b"<mp3 bytes>"}

    Useful when the frontend wants to display subtitles alongside playback.
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
