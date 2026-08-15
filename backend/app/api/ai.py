import asyncio
import json

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.api.deps import require_permission
from app.schemas.ai import AiQueryRequest
from app.services.ai import answer_question

router = APIRouter(prefix="/ai", tags=["ai"])

# Small delay between streamed words so the response visibly streams in the
# UI rather than appearing all at once — there's no real network/model
# latency to rely on here since generation is a local, near-instant lookup.
_TOKEN_DELAY_SECONDS = 0.02


@router.post("/query", dependencies=[Depends(require_permission("ai:query"))])
async def query_endpoint(payload: AiQueryRequest) -> StreamingResponse:
    """
    Streams a documentation-grounded answer as a finite sequence of SSE
    events: one `sources` event, then one `token` event per word, then a
    `done` event. Unlike the operations alert stream (M3), this stream has a
    natural end — it's driven by a bounded request/response, not an
    open-ended subscription — so it doesn't hit the same intermediary-
    buffering or TestClient limitations; it's exercised directly in
    tests/test_ai.py.
    """

    async def event_generator():
        result = await asyncio.to_thread(answer_question, payload.question)

        yield f"data: {json.dumps({'type': 'sources', 'sources': result.sources})}\n\n"

        words = result.text.split(" ")
        for index, word in enumerate(words):
            token = word if index == len(words) - 1 else f"{word} "
            yield f"data: {json.dumps({'type': 'token', 'token': token})}\n\n"
            await asyncio.sleep(_TOKEN_DELAY_SECONDS)

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
