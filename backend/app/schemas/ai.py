from pydantic import BaseModel, Field


class AiQueryRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)
