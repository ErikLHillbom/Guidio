import re
from typing import Generator, Iterator


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
