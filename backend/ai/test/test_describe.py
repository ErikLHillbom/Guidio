"""Quick integration test for the Guidio AI pipeline."""

import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

from ai import Information, describe

ctx = Information(
    title="Sagrada Família",
    latitude=41.4036,
    summary="The Basílica de la Sagrada Família is a large unfinished Roman Catholic minor basilica in Barcelona, designed by Antoni Gaudí.",
    text="The Basílica de la Sagrada Família, shortened as the Sagrada Família, is a large unfinished Roman Catholic minor basilica in the Eixample district of Barcelona, Catalonia, Spain. Designed by the Spanish architect Antoni Gaudí (1852–1926), his work on the building is part of a UNESCO World Heritage Site. On 7 November 2010, Pope Benedict XVI consecrated the church and proclaimed it a minor basilica.",
    direction="to your left",
    location="Barcelona, Spain",
    time="afternoon",
    interest="architecture and history",
)

print("Generating description + audio...")
result = describe(ctx)

print(f"\n--- Text ---\n{result.text}")
print(f"\n--- Audio ---\n{len(result.audio)} bytes of MP3")

output_dir = Path(__file__).parent / "output"
output_dir.mkdir(exist_ok=True)
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
output_path = output_dir / f"{ctx.title}_{timestamp}.mp3"
with open(output_path, "wb") as f:
    f.write(result.audio)

print(f"\nSaved to {output_path}")
