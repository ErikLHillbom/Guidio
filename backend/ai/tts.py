from __future__ import annotations

from typing import Iterator

from elevenlabs import ElevenLabs

from .config import ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, TTS_MODEL

_client: ElevenLabs | None = None


def _get_client() -> ElevenLabs:
    global _client
    if _client is None:
        _client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
    return _client


def synthesize(text: str, voice_id: str | None = None) -> bytes:
    """Convert text to speech, returning complete MP3 audio bytes."""
    client = _get_client()
    audio_iter = client.text_to_speech.convert(
        text=text,
        voice_id=voice_id or ELEVENLABS_VOICE_ID,
        model_id=TTS_MODEL,
        output_format="mp3_44100_128",
    )
    return b"".join(audio_iter)


def synthesize_stream(
    text: str,
    voice_id: str | None = None,
) -> Iterator[bytes]:
    """Convert text to speech, streaming audio chunks back.

    Useful for starting playback before the full audio is ready.
    """
    client = _get_client()
    yield from client.text_to_speech.convert_as_stream(
        text=text,
        voice_id=voice_id or ELEVENLABS_VOICE_ID,
        model_id=TTS_MODEL,
        output_format="mp3_44100_128",
    )
