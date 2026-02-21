from __future__ import annotations

from openai import OpenAI

from ..config import OPENAI_API_KEY, LLM_MODEL, PROMPT_DIR
from ..models import Information

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=OPENAI_API_KEY)
    return _client


def _load_prompt(filename: str) -> str:
    return (PROMPT_DIR / filename).read_text()


def _build_user_prompt(ctx: Information) -> str:
    template = _load_prompt("user.md")
    return (
        template
        .replace("<|TITLE|>", ctx.title)
        .replace("<|LATITUDE|>", str(ctx.latitude))
        .replace("<|SUMMARY|>", ctx.summary)
        .replace("<|TEXT|>", ctx.text)
        .replace("<|DIRECTION|>", ctx.direction)
        .replace("<|LOCATION|>", ctx.location)
        .replace("<|TIME|>", ctx.time)
        .replace("<|INTEREST|>", ctx.interest)
    )


def generate(ctx: Information) -> str:
    """Generate a complete tour guide description."""
    client = _get_client()
    response = client.chat.completions.create(
        model=LLM_MODEL,
        messages=[
            {"role": "system", "content": _load_prompt("system.md")},
            {"role": "user", "content": _build_user_prompt(ctx)},
        ],
        temperature=0.8,
    )
    return response.choices[0].message.content or ""
