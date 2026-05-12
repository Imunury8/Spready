from app.config import Settings
from app.schemas import GenerateDiaryRequest, GenerateDiaryResponse


def _fallback_generate(request: GenerateDiaryRequest) -> GenerateDiaryResponse:
    text = "\n".join(entry.content for entry in request.entries)
    preview = text[:120].strip()

    return GenerateDiaryResponse(
        title="오늘의 기록 초안",
        mood="차분함",
        keywords=["기록", "회고", "감정"],
        diary=(
            "오늘 남긴 기록을 바탕으로 하루를 정리했습니다.\n\n"
            f"{preview}\n\n"
            "아직 OpenAI API 키가 설정되지 않아 임시 응답을 반환했습니다. "
            "OPENAI_API_KEY를 설정하면 AI 생성 결과로 대체할 수 있습니다."
        ),
    )


async def generate_diary(
    request: GenerateDiaryRequest,
    settings: Settings,
) -> GenerateDiaryResponse:
    if not settings.openai_api_key:
        return _fallback_generate(request)

    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    source_text = "\n".join(
        f"- [{entry.source}] {entry.content}" for entry in request.entries
    )

    response = await client.responses.parse(
        model="gpt-5.2",
        input=[
            {
                "role": "system",
                "content": (
                    "You write Korean diary reflections from short daily notes. "
                    "Return concise, emotionally grounded output."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Style: {request.style}\n"
                    f"Entries:\n{source_text}\n\n"
                    "Create a diary title, mood label, 3 to 5 keywords, and diary body."
                ),
            },
        ],
        text_format=GenerateDiaryResponse,
    )

    return response.output_parsed
