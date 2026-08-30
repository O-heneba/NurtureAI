import hashlib
import json
import re
from pathlib import Path
from typing import Any

from pypdf import PdfReader


KNOWLEDGE_DIR = Path("public/knowledge")
INDEX_PATH = KNOWLEDGE_DIR / "index.json"
SUPPORTED = {".pdf", ".txt", ".json", ".md", ".markdown"}
TOPIC_RULES = {
    "chps": ("chps", "community-based health planning and services"),
    "maternal": ("maternal", "maternal health"),
    "antenatal": ("antenatal", "antenatal care", "anc"),
    "pregnancy": ("pregnan", "gestation", "pregnancy"),
    "childbirth": ("childbirth", "labour", "labor", "delivery"),
    "postnatal": ("postnatal", "postpartum", "pnc"),
    "newborn": ("newborn", "neonate", "neonatal"),
    "child": ("child health", "young child", "childhood"),
    "under5": ("under-five", "under 5", "u5", "underfive"),
    "nutrition": ("nutrition", "malnutrition", "nutrient"),
    "breastfeeding": ("breastfeed", "breast feeding", "lactation"),
    "complementary_feeding": ("complementary feeding", "complementary foods"),
    "maternal_nutrition": ("maternal nutrition", "pregnant women", "women's nutrition"),
    "community_health": ("community health", "community-based", "health worker"),
    "referral": ("referral", "refer", "emergency"),
    "health_education": ("health education", "health promotion", "counselling", "counseling"),
}


def normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("\x00", " ")).strip()


def title_from_text(text: str, fallback: str) -> str:
    for line in text.splitlines():
        candidate = normalize(re.sub(r"^[#\s]+", "", line))
        if 4 <= len(candidate) <= 180 and (not candidate.isupper() or candidate.istitle()):
            return candidate
    return "unknown" if not fallback else fallback


def classify(text: str) -> list[str]:
    lowered = text.lower()
    return [topic for topic, terms in TOPIC_RULES.items() if any(term in lowered for term in terms)] or ["other"]


def source_metadata(text: str, title: str) -> tuple[str, str, str]:
    haystack = f"{title}\n{text[:12000]}".lower()
    if "ghana health service" in haystack or "ghana health service" in title.lower():
        return "Ghana Health Service", "ghs", "primary_clinical"
    if "ministry of health" in haystack and "republic of ghana" in haystack:
        return "Ghana Ministry of Health", "moh", "primary_clinical"
    if "world health organization" in title.lower() or "who guideline" in title.lower():
        return "World Health Organization", "who", "primary_clinical"
    if "unicef" in title.lower() or "unicef" in haystack[:2500]:
        return "UNICEF", "other", "supporting_evidence"
    if any(term in haystack for term in ("journal", "doi.org", "peer-reviewed", "research article")):
        return "unknown", "research", "supporting_evidence"
    if any(term in haystack for term in ("training guide", "education", "educational", "chatbot")):
        return "unknown", "educational", "educational"
    return "unknown", "other", "unknown"


def keywords(text: str) -> list[str]:
    words = re.findall(r"[a-z][a-z0-9-]{3,}", text.lower())
    counts: dict[str, int] = {}
    for word in words:
        counts[word] = counts.get(word, 0) + 1
    return [word for word, _ in sorted(counts.items(), key=lambda item: (-item[1], item[0]))[:30]]


def split_chunks(text: str, page_number: int | None = None) -> list[dict[str, Any]]:
    sections = re.split(r"\n(?=#{1,6}\s|[A-Z][A-Z0-9 /&(),:'-]{8,}\n)", text)
    chunks: list[dict[str, Any]] = []
    for section in sections:
        paragraphs = [normalize(part) for part in re.split(r"\n\s*\n", section) if normalize(part)]
        current: list[str] = []
        word_count = 0
        for paragraph in paragraphs:
            paragraph_words = paragraph.split()
            if current and word_count + len(paragraph_words) > 700:
                chunks.append({"text": "\n\n".join(current), "pageNumber": page_number})
                current, word_count = [], 0
            current.append(paragraph)
            word_count += len(paragraph_words)
            if word_count >= 300:
                chunks.append({"text": "\n\n".join(current), "pageNumber": page_number})
                current, word_count = [], 0
        if current:
            chunks.append({"text": "\n\n".join(current), "pageNumber": page_number})
    return chunks


def read_document(path: Path) -> tuple[str, list[dict[str, Any]], dict[str, str]]:
    if path.suffix.lower() == ".pdf":
        reader = PdfReader(str(path))
        pages = [{"text": page.extract_text() or "", "pageNumber": number} for number, page in enumerate(reader.pages, 1)]
        text = "\n\n".join(page["text"] for page in pages)
        metadata = {str(key).lstrip("/"): str(value) for key, value in (reader.metadata or {}).items() if value}
        chunks = [chunk for page in pages for chunk in split_chunks(page["text"], page["pageNumber"])]
        return text, chunks, metadata
    text = path.read_text(encoding="utf-8")
    return text, split_chunks(text), {}


def build_index() -> dict[str, Any]:
    documents: list[dict[str, Any]] = []
    chunks: list[dict[str, Any]] = []
    paths = sorted(path for path in KNOWLEDGE_DIR.iterdir() if path.suffix.lower() in SUPPORTED and path.name != INDEX_PATH.name)
    for path in paths:
        text, raw_chunks, metadata = read_document(path)
        metadata_title = normalize(metadata.get("Title", ""))
        title = metadata_title if len(metadata_title) > 8 and set(metadata_title) != {"_"} else title_from_text(text, "")
        if len(title) < 4 or title.lower().startswith("microsoft word") or title == "t":
            title = "unknown"
        organization, source_type, authority = source_metadata(text, title)
        topics = classify(f"{title}\n{text}")
        document_id = hashlib.sha256(path.name.encode("utf-8")).hexdigest()[:16]
        document = {
            "id": document_id,
            "originalFilename": path.name,
            "title": title,
            "sourceOrganization": organization,
            "sourceType": source_type,
            "topic": topics,
            "version": normalize(metadata.get("ModDate", "")) or "unknown",
            "publicationDate": "unknown",
            "authorityLevel": authority,
            "language": "English" if re.search(r"\bthe\b", text[:5000], re.I) else "unknown",
        }
        documents.append(document)
        for number, raw_chunk in enumerate(raw_chunks, 1):
            chunk_text = raw_chunk["text"]
            section = next((normalize(line.lstrip("# ")) for line in chunk_text.splitlines() if line.startswith("#") or (line.isupper() and len(line) > 8)), "unknown")
            chunks.append({
                "chunkId": f"{document_id}-{number}",
                "documentId": document_id,
                "originalFilename": path.name,
                "title": title,
                "sourceOrganization": organization,
                "sourceType": source_type,
                "authorityLevel": authority,
                "topic": topics,
                "section": section,
                "pageNumber": raw_chunk.get("pageNumber"),
                "text": chunk_text,
                "keywords": keywords(chunk_text),
            })
    return {"version": 1, "generatedAt": "build-time", "documents": documents, "chunks": chunks}


if __name__ == "__main__":
    index = build_index()
    INDEX_PATH.write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Indexed {len(index['documents'])} documents and {len(index['chunks'])} chunks")
    for document in index["documents"]:
        print(json.dumps({key: document[key] for key in ("originalFilename", "title", "sourceOrganization", "version", "sourceType", "authorityLevel", "topic")}))