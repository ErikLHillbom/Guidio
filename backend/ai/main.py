from .models import Information, Response
from .services import llm, tts


def describe(ctx: Information) -> Response:
    """Generate a tour-guide description and synthesize audio."""
    text = llm.generate(ctx)
    audio = tts.synthesize(text)
    return Response(text=text, audio=audio)
