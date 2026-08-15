"""
Extractive answer synthesis: picks the sentences from the retrieved
documents that share the most words with the query, rather than generating
new text (there's no LLM available in this environment — see
knowledge_base.py). This is a real, if old-school, QA technique — it just
means the assistant answers by quoting/assembling its source material
instead of paraphrasing it.
"""

import re
from dataclasses import dataclass

from app.rag.retrieval import RetrievalResult, tokenize

_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")

# Below this cosine-similarity score, a "match" is considered noise (e.g. a
# single common word overlapping by coincidence) rather than a real answer.
_RELEVANCE_THRESHOLD = 0.05

_NO_MATCH_TEXT = (
    "I don't have information about that in the UndisputedWell documentation. "
    "Try asking about wells and rigs, thresholds and alerts, asphaltene prediction, "
    "roles and permissions, or authentication."
)


@dataclass(frozen=True)
class AnswerResult:
    text: str
    sources: list[str]
    matched: bool


def synthesize_answer(
    query: str, results: list[RetrievalResult], *, max_sentences: int = 4
) -> AnswerResult:
    relevant = [r for r in results if r.score >= _RELEVANCE_THRESHOLD]
    if not relevant:
        return AnswerResult(text=_NO_MATCH_TEXT, sources=[], matched=False)

    query_terms = set(tokenize(query))

    candidates: list[tuple[int, float, int, str, str]] = []
    for result in relevant:
        sentences = [s.strip() for s in _SENTENCE_SPLIT_RE.split(result.document.content) if s.strip()]
        for position, sentence in enumerate(sentences):
            overlap = len(query_terms & set(tokenize(sentence)))
            if overlap == 0:
                continue
            candidates.append((overlap, result.score, position, sentence, result.document.title))

    if not candidates:
        return AnswerResult(text=_NO_MATCH_TEXT, sources=[], matched=False)

    # Highest word-overlap first, then highest document relevance; ties keep
    # each document's original sentence order via `position` (negated so a
    # smaller/earlier index still sorts after the primary keys in reverse).
    candidates.sort(key=lambda c: (c[0], c[1], -c[2]), reverse=True)
    chosen = candidates[:max_sentences]

    text = " ".join(c[3] for c in chosen)
    sources = list(dict.fromkeys(c[4] for c in chosen))  # de-duplicated, order preserved

    return AnswerResult(text=text, sources=sources, matched=True)
