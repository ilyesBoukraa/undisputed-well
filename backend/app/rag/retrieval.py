"""
Lexical retrieval over the static knowledge base: classic TF-IDF + cosine
similarity, implemented from scratch (no embedding model / vector DB
available in this environment — see knowledge_base.py). This is real
information retrieval, just not neural — a document only matches a query by
sharing actual words with it, which is also why the assistant is upfront
about not finding an answer when nothing scores above the threshold, rather
than guessing.
"""

import math
import re
from collections import Counter
from dataclasses import dataclass, field

from app.rag.knowledge_base import Document

_TOKEN_RE = re.compile(r"[a-z0-9]+")

_STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "can", "do", "does",
    "for", "from", "how", "i", "in", "is", "it", "of", "on", "or", "that",
    "the", "this", "to", "what", "with", "you", "your",
}


def tokenize(text: str) -> list[str]:
    return [token for token in _TOKEN_RE.findall(text.lower()) if token not in _STOPWORDS]


@dataclass
class TfIdfIndex:
    documents: list[Document]
    doc_term_freqs: list[Counter] = field(default_factory=list)
    idf: dict[str, float] = field(default_factory=dict)


def build_index(documents: list[Document]) -> TfIdfIndex:
    doc_term_freqs = [Counter(tokenize(doc.content)) for doc in documents]

    doc_freq: Counter = Counter()
    for term_freq in doc_term_freqs:
        doc_freq.update(term_freq.keys())

    doc_count = len(documents)
    # Smoothed IDF (as used by scikit-learn's default): terms in every
    # document still get a small positive weight rather than zero.
    idf = {
        term: math.log((1 + doc_count) / (1 + df)) + 1.0 for term, df in doc_freq.items()
    }

    return TfIdfIndex(documents=documents, doc_term_freqs=doc_term_freqs, idf=idf)


def _weighted_vector(term_freq: Counter, idf: dict[str, float]) -> dict[str, float]:
    return {term: freq * idf.get(term, 0.0) for term, freq in term_freq.items()}


def _cosine_similarity(a: dict[str, float], b: dict[str, float]) -> float:
    if not a or not b:
        return 0.0
    common_terms = a.keys() & b.keys()
    dot_product = sum(a[term] * b[term] for term in common_terms)
    norm_a = math.sqrt(sum(value * value for value in a.values()))
    norm_b = math.sqrt(sum(value * value for value in b.values()))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot_product / (norm_a * norm_b)


@dataclass(frozen=True)
class RetrievalResult:
    document: Document
    score: float


def search(index: TfIdfIndex, query: str, *, top_k: int = 3) -> list[RetrievalResult]:
    query_terms = Counter(tokenize(query))
    if not query_terms:
        return []

    query_vector = _weighted_vector(query_terms, index.idf)

    results = []
    for document, term_freq in zip(index.documents, index.doc_term_freqs):
        doc_vector = _weighted_vector(term_freq, index.idf)
        score = _cosine_similarity(query_vector, doc_vector)
        if score > 0:
            results.append(RetrievalResult(document=document, score=score))

    results.sort(key=lambda result: result.score, reverse=True)
    return results[:top_k]
