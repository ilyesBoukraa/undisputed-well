from app.rag.knowledge_base import Document
from app.rag.retrieval import RetrievalResult
from app.rag.synthesis import synthesize_answer

DOC = Document(
    id="a",
    title="Rigs",
    content=(
        "A rig has a name, a location, and a status. "
        "Only admins can delete a rig. "
        "This sentence is unrelated filler about spacecraft."
    ),
)


def test_no_results_gives_the_no_match_answer():
    result = synthesize_answer("what color is the sky", [])

    assert result.matched is False
    assert result.sources == []
    assert "don't have information" in result.text


def test_below_threshold_results_give_the_no_match_answer():
    result = synthesize_answer("query", [RetrievalResult(document=DOC, score=0.01)])

    assert result.matched is False


def test_matching_query_extracts_the_most_relevant_sentence():
    result = synthesize_answer(
        "who can delete a rig", [RetrievalResult(document=DOC, score=0.5)]
    )

    assert result.matched is True
    assert "Only admins can delete a rig." in result.text
    assert result.sources == ["Rigs"]


def test_unrelated_filler_sentence_is_not_selected():
    result = synthesize_answer(
        "who can delete a rig", [RetrievalResult(document=DOC, score=0.5)]
    )

    assert "spacecraft" not in result.text


def test_sources_are_deduplicated_across_repeated_sentences_from_one_document():
    result = synthesize_answer(
        "rig name location status", [RetrievalResult(document=DOC, score=0.5)]
    )

    assert result.sources.count("Rigs") == 1


def test_a_relevant_result_with_no_overlapping_sentence_falls_back_to_no_match():
    # Score is high enough to pass the relevance gate, but no individual
    # sentence in the document shares a word with the query.
    other = Document(id="b", title="Other", content="Xylophone zebra quokka.")
    result = synthesize_answer("rig", [RetrievalResult(document=other, score=0.9)])

    assert result.matched is False
