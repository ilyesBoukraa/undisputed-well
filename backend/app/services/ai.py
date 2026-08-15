from functools import lru_cache

from app.rag.knowledge_base import DOCUMENTS
from app.rag.retrieval import TfIdfIndex, build_index, search
from app.rag.synthesis import AnswerResult, synthesize_answer


@lru_cache(maxsize=1)
def _index() -> TfIdfIndex:
    # The knowledge base is static, so the index is built once and reused —
    # cheap either way at this corpus size, but no reason to redo it per
    # request.
    return build_index(DOCUMENTS)


def answer_question(question: str) -> AnswerResult:
    results = search(_index(), question, top_k=3)
    return synthesize_answer(question, results)
