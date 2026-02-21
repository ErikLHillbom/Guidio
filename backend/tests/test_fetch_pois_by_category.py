import re
import unittest
from typing import Any
from unittest.mock import patch

from app.services.database import fetch_pois_by_category


def _build_doc(
    entity_id: str,
    *,
    category: str = "culture",
    text: str = "",
    summary: str = "",
    lat: float = 59.0,
    lon: float = 18.0,
) -> dict[str, Any]:
    return {
        "entity_id": entity_id,
        "title": f"title-{entity_id}",
        "location": {"type": "Point", "coordinates": [lon, lat]},
        "categories": [category],
        "image_url": "https://example.com/image.jpg",
        "text": text,
        "summary": summary,
    }


class _FakeCursor:
    def __init__(self, docs: list[dict[str, Any]]):
        self._docs = docs
        self._index = 0

    def __aiter__(self) -> "_FakeCursor":
        self._index = 0
        return self

    async def __anext__(self) -> dict[str, Any]:
        if self._index >= len(self._docs):
            raise StopAsyncIteration
        doc = self._docs[self._index]
        self._index += 1
        return doc


class _FakeCollection:
    def __init__(self, docs: list[dict[str, Any]]):
        self._docs = docs
        self.last_query: dict[str, Any] | None = None
        self.last_projection: dict[str, int] | None = None

    def find(
        self, query: dict[str, Any], projection: dict[str, int]
    ) -> _FakeCursor:
        self.last_query = query
        self.last_projection = projection

        category_pattern = query["categories"]
        filtered = [
            doc
            for doc in self._docs
            if any(
                isinstance(value, str) and category_pattern.search(value)
                for value in doc.get("categories", [])
            )
        ]
        return _FakeCursor(filtered)


class _FakeDB:
    def __init__(self, docs: list[dict[str, Any]]):
        self.pois = _FakeCollection(docs)


class FetchPoisByCategoryTests(unittest.IsolatedAsyncioTestCase):
    async def test_returns_top_50_ranked_by_text_length(self) -> None:
        docs = [
            _build_doc(f"Q{index}", category="culture", text="x" * index)
            for index in range(55)
        ]
        docs.append(_build_doc("Q-summary", category="culture", text="", summary="s" * 300))
        docs.append(_build_doc("Q-other", category="nature", text="z" * 1000))

        fake_db = _FakeDB(docs)

        with patch("app.services.database.get_db", return_value=fake_db):
            pois = await fetch_pois_by_category("CuLtUrE")

        returned_ids = [poi.entity_id for poi in pois]

        self.assertEqual(len(pois), 50)
        self.assertEqual(returned_ids[0], "Q-summary")
        self.assertEqual(returned_ids[1], "Q54")
        self.assertEqual(returned_ids[-1], "Q6")
        self.assertNotIn("Q5", returned_ids)
        self.assertNotIn("Q-other", returned_ids)

    async def test_uses_case_insensitive_exact_match_query(self) -> None:
        docs = [_build_doc("Q1", category="culture", text="abc")]
        fake_db = _FakeDB(docs)

        with patch("app.services.database.get_db", return_value=fake_db):
            await fetch_pois_by_category("culture")

        assert fake_db.pois.last_query is not None
        category_filter = fake_db.pois.last_query["categories"]
        self.assertIsInstance(category_filter, re.Pattern)
        self.assertEqual(category_filter.pattern, "^culture$")
        self.assertTrue(category_filter.flags & re.IGNORECASE)


if __name__ == "__main__":
    unittest.main()
