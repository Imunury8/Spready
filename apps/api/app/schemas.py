from pydantic import BaseModel, Field


class DiaryEntry(BaseModel):
    content: str = Field(min_length=1)
    source: str = "web"


class GenerateDiaryRequest(BaseModel):
    entries: list[DiaryEntry]
    style: str = "diary"


class GenerateDiaryResponse(BaseModel):
    title: str
    mood: str
    keywords: list[str]
    diary: str
