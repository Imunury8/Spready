from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import Settings, get_settings
from app.schemas import GenerateDiaryRequest, GenerateDiaryResponse
from app.services.diary_service import generate_diary

app = FastAPI(title="AI Diary API", version="0.1.0")

settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/diary/generate", response_model=GenerateDiaryResponse)
async def create_diary(
    request: GenerateDiaryRequest,
    app_settings: Settings = Depends(get_settings),
) -> GenerateDiaryResponse:
    return await generate_diary(request, app_settings)
