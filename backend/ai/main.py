from .models import Information, Response
from .services import llm, tts


def describe(ctx: Information) -> Response:
    """Generate a tour-guide description and synthesize audio."""
    text = llm.generate(
        object_name=ctx.object_name,
        location=ctx.location,
        time=ctx.time,
        interest=ctx.interest,
    )
    audio = tts.synthesize(text)
    return Response(text=text, audio=audio)
