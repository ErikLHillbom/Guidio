from __future__ import annotations

from openai import OpenAI

from ..config import OPENAI_API_KEY, LLM_MODEL, PROMPT_DIR

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=OPENAI_API_KEY)
    return _client


def _load_prompt(filename: str) -> str:
    return (PROMPT_DIR / filename).read_text()


def _build_user_prompt(
    object_name: str,
    location: str,
    time: str,
    interest: str,
) -> str:
    template = _load_prompt("user.md")
    return (
        template
        .replace("<|OBJECT|>", object_name)
        .replace("<|LOCATION|>", location)
        .replace("<|TIME|>", time)
        .replace("<|INTEREST|>", interest)
    )


def generate(
    object_name: str,
    location: str,
    time: str,
    interest: str,
) -> str:
    """Generate a complete tour guide description."""
    client = _get_client()
    response = client.chat.completions.create(
        model=LLM_MODEL,
        messages=[
            {"role": "system", "content": _load_prompt("system.md")},
            {"role": "user", "content": _build_user_prompt(object_name, location, time, interest)},
        ],
        temperature=0.8,
    )
    return response.choices[0].message.content or ""
