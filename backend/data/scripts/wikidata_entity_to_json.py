#!/usr/bin/env python3
import sys
import json
import datetime as dt
from typing import Optional, Tuple, Any, Dict, List

import requests
from bs4 import BeautifulSoup, Tag, NavigableString

WIKIDATA_ENTITYDATA_URL = "https://www.wikidata.org/wiki/Special:EntityData/{entity_id}.json"
WIKIPEDIA_API_URL = "https://en.wikipedia.org/w/api.php"
WIKIPEDIA_REST_SUMMARY_URL = "https://en.wikipedia.org/api/rest_v1/page/summary/{title}"
COMMONS_API_URL = "https://commons.wikimedia.org/w/api.php"


def utc_now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def http_get_json(url: str, *, headers: Optional[dict] = None, params: Optional[dict] = None) -> dict:
    r = requests.get(url, headers=headers, params=params, timeout=30)
    r.raise_for_status()
    return r.json()


def http_post_json(url: str, *, headers: Optional[dict] = None, data: Optional[str] = None) -> dict:
    r = requests.post(url, headers=headers, data=data.encode("utf-8") if isinstance(data, str) else data, timeout=30)
    r.raise_for_status()
    return r.json()


def get_wikidata_entity(entity_id: str, user_agent: str) -> dict:
    url = WIKIDATA_ENTITYDATA_URL.format(entity_id=entity_id)
    return http_get_json(url, headers={"User-Agent": user_agent, "Accept": "application/json"})


def extract_lat_lon(entity: dict) -> Tuple[Optional[float], Optional[float]]:
    try:
        claims = entity.get("claims", {})
        p625 = claims.get("P625")
        if not p625:
            return None, None
        val = p625[0]["mainsnak"]["datavalue"]["value"]
        return float(val.get("latitude")), float(val.get("longitude"))
    except Exception:
        return None, None


def extract_type_qid(entity: dict) -> Optional[str]:
    """Best-effort: P31 (instance of) first value."""
    try:
        p31 = entity.get("claims", {}).get("P31")
        if not p31:
            return None
        return p31[0]["mainsnak"]["datavalue"]["value"]["id"]
    except Exception:
        return None


def get_entity_label(entity_id: str, user_agent: str) -> Optional[str]:
    try:
        data = get_wikidata_entity(entity_id, user_agent)
        ent = data["entities"][entity_id]
        lbl = ent.get("labels", {}).get("en", {}).get("value")
        return lbl
    except Exception:
        return None


def extract_enwiki_title(entity: dict) -> Optional[str]:
    try:
        return entity.get("sitelinks", {}).get("enwiki", {}).get("title")
    except Exception:
        return None


def extract_wikidata_p18_filename(entity: dict) -> Optional[str]:
    """
    P18 = image. Returns the first filename like "Stockholm_city_hall.jpg"
    """
    try:
        p18 = entity.get("claims", {}).get("P18")
        if not p18:
            return None
        # Wikidata stores just the filename (no "File:")
        return p18[0]["mainsnak"]["datavalue"]["value"]
    except Exception:
        return None


def commons_file_url(filename: str, user_agent: str) -> Optional[str]:
    """
    Resolve a Commons filename to a direct URL via imageinfo.
    """
    try:
        title = filename
        if not title.lower().startswith("file:"):
            title = "File:" + title

        params = {
            "action": "query",
            "format": "json",
            "prop": "imageinfo",
            "iiprop": "url",
            "titles": title,
        }
        data = http_get_json(
            COMMONS_API_URL,
            headers={"User-Agent": user_agent, "Accept": "application/json"},
            params=params,
        )
        pages = data.get("query", {}).get("pages", {})
        for _, page in pages.items():
            ii = page.get("imageinfo")
            if ii and isinstance(ii, list) and ii[0].get("url"):
                return ii[0]["url"]
        return None
    except Exception:
        return None


def wikipedia_parse_full_html(title: str, user_agent: str) -> str:
    """
    action=parse -> full rendered HTML.
    """
    params = {
        "action": "parse",
        "format": "json",
        "page": title,
        "prop": "text",
        "redirects": "1",
        "disabletoc": "1",
        "disableeditsection": "1",
    }
    data = http_get_json(
        WIKIPEDIA_API_URL,
        headers={"User-Agent": user_agent, "Accept": "application/json"},
        params=params,
    )
    html = data.get("parse", {}).get("text", {}).get("*")
    if not html:
        raise RuntimeError("Could not retrieve parsed HTML for the page.")
    return html


def wikipedia_rest_summary(title: str, user_agent: str) -> dict:
    rest_title = title.replace(" ", "_")
    url = WIKIPEDIA_REST_SUMMARY_URL.format(title=rest_title)
    return http_get_json(url, headers={"User-Agent": user_agent, "Accept": "application/json"})


def strip_links_and_simplify_html(full_html: str) -> str:
    """
    Turn Wikipedia parse HTML into "basic" HTML (markdown-ish):
    - keeps: h2,h3,h4,p,ul,ol,li,blockquote,pre,code,br,strong,b,em,i
    - removes: tables, infoboxes, navboxes, references, sup/cite, styles/scripts, figures, etc.
    - removes all links (<a> unwrapped)
    - removes most attributes
    - extracts main content under .mw-parser-output
    """
    soup = BeautifulSoup(full_html, "html.parser")

    # Get main content container
    container = soup.select_one(".mw-parser-output") or soup

    # Remove unwanted blocks early
    for sel in [
        "table", "style", "script", "noscript",
        ".infobox", ".navbox", ".vertical-navbox", ".metadata",
        ".reflist", ".reference", "sup.reference", "ol.references",
        ".mw-editsection", ".toc", ".hatnote", ".shortdescription",
        "figure", "img",  # images handled separately via image_url
    ]:
        for node in container.select(sel):
            node.decompose()

    # Unwrap all links but keep their text
    for a in container.find_all("a"):
        a.unwrap()

    # Remove citation-like brackets leftover sometimes
    # (Often they are in <sup> which we removed, but keep this as backup)
    for sup in container.find_all("sup"):
        sup.decompose()

    allowed = {"h2", "h3", "h4", "p", "ul", "ol", "li", "blockquote", "pre", "code", "br",
               "strong", "b", "em", "i"}

    # Convert to a clean soup we build ourselves
    clean_root = BeautifulSoup("", "html.parser")
    out_fragments: List[Tag] = []

    def clone_allowed(node) -> Optional[Tag | NavigableString]:
        if isinstance(node, NavigableString):
            text = str(node)
            # collapse crazy whitespace but keep meaningful spaces/newlines
            text = " ".join(text.split())
            return NavigableString(text) if text else None

        if not isinstance(node, Tag):
            return None

        name = node.name.lower()

        # Drop headings that are just edit remnants, empty, etc.
        if name in {"h2", "h3", "h4"}:
            # Wikipedia headings often contain span.mw-headline
            headline = node.get_text(" ", strip=True)
            if not headline:
                return None
            new_tag = clean_root.new_tag(name)
            new_tag.string = headline
            return new_tag

        if name not in allowed:
            # For non-allowed tags, recurse into children and return a wrapper-less list via special handling
            # We'll handle by returning None here and letting caller pull children in.
            return None

        new_tag = clean_root.new_tag(name)
        # no attributes (markdown-ish)
        for child in node.children:
            cloned = clone_allowed(child)
            if cloned is None:
                # if child is a Tag not allowed, inline its text content by recursing
                if isinstance(child, Tag):
                    for gc in child.children:
                        cc = clone_allowed(gc)
                        if cc is not None:
                            new_tag.append(cc)
                continue
            new_tag.append(cloned)

        # Clean empty tags
        if new_tag.get_text(strip=True) == "" and name not in {"br"}:
            return None
        return new_tag

    # Keep only top-level “block” elements in order
    for child in list(container.children):
        if isinstance(child, Tag):
            tagname = child.name.lower()
            if tagname in {"p", "h2", "h3", "h4", "ul", "ol", "blockquote", "pre"}:
                cloned = clone_allowed(child)
                if isinstance(cloned, Tag):
                    out_fragments.append(cloned)

    # Join with newlines for readability
    final = "\n".join(str(t) for t in out_fragments)
    return final


def build_json(entity_id: str) -> Dict[str, Any]:
    # Put your contact email/team page if you have it
    user_agent = "wikidata-wikipedia-hackathon-script/1.1 (contact: you@example.com)"

    wd_data = get_wikidata_entity(entity_id, user_agent)
    entity = wd_data["entities"][entity_id]

    lat, lon = extract_lat_lon(entity)

    # type label
    type_qid = extract_type_qid(entity)
    type_label = None
    if type_qid and type_qid.startswith("Q"):
        type_label = get_entity_label(type_qid, user_agent) or type_qid

    # image_url (prefer Wikidata P18)
    image_url = None
    p18_filename = extract_wikidata_p18_filename(entity)
    if p18_filename:
        image_url = commons_file_url(p18_filename, user_agent)

    en_title = extract_enwiki_title(entity)

    summary = None
    text_basic_html = None

    if en_title:
        # summary + fallback image
        try:
            summ = wikipedia_rest_summary(en_title, user_agent)
            summary = summ.get("extract")
            if image_url is None:
                image_url = (summ.get("originalimage") or {}).get("source") or (summ.get("thumbnail") or {}).get("source")
        except Exception:
            summary = None

        # full page html -> simplified html without links
        full_html = wikipedia_parse_full_html(en_title, user_agent)
        text_basic_html = strip_links_and_simplify_html(full_html)

    out = {
        "entity_id": entity_id,
        "latitude": lat,
        "longitude": lon,
        "type": type_label,
        "image_url": image_url,
        "text": text_basic_html,   # full page (basic HTML, no hyperlinks)
        "summary": summary,        # intro summary
        "created_at": utc_now_iso(),
    }
    return out


def main():
    if len(sys.argv) != 2:
        print("Usage: python wikidata_to_wikipedia_json.py <entity_id>  (e.g. Q289100)")
        sys.exit(1)

    entity_id = sys.argv[1].strip()
    if not entity_id.upper().startswith("Q"):
        print("Please pass a Wikidata entity id like Q289100")
        sys.exit(1)

    data = build_json(entity_id)
    filename = f"{entity_id}.json"
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Wrote {filename}")


if __name__ == "__main__":
    main()
