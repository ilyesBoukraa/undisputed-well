from app.rag.knowledge_base import Document
from app.rag.retrieval import build_index, search, tokenize


def test_tokenize_lowercases_and_strips_stopwords():
    assert tokenize("What Is the Bubble Point Pressure?") == ["bubble", "point", "pressure"]


def test_tokenize_drops_punctuation():
    assert tokenize("threshold-configure, well:edit!") == ["threshold", "configure", "well", "edit"]


def test_tokenize_empty_string_is_empty():
    assert tokenize("") == []


DOCS = [
    Document(id="a", title="Rigs", content="A rig has a name, a location, and a status."),
    Document(id="b", title="Wells", content="A well has a name, a status, and an optional depth."),
    Document(id="c", title="Unrelated", content="This document is about spacecraft telemetry."),
]


def test_search_ranks_the_most_lexically_similar_document_first():
    index = build_index(DOCS)
    results = search(index, "what status does a rig have", top_k=3)

    assert results[0].document.id == "a"
    assert all(r.score > 0 for r in results)


def test_search_excludes_documents_with_no_term_overlap():
    index = build_index(DOCS)
    results = search(index, "rig status location", top_k=3)

    assert "c" not in [r.document.id for r in results]


def test_search_returns_nothing_for_a_query_with_no_content_words():
    index = build_index(DOCS)
    results = search(index, "what is the", top_k=3)

    assert results == []


def test_search_respects_top_k():
    index = build_index(DOCS)
    results = search(index, "name status", top_k=1)

    assert len(results) == 1


def test_search_results_are_sorted_descending_by_score():
    index = build_index(DOCS)
    results = search(index, "rig well name status", top_k=3)

    scores = [r.score for r in results]
    assert scores == sorted(scores, reverse=True)
