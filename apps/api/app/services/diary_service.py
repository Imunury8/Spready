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
                    "You are a premium Korean diary writer. Your goal is to transform short daily notes "
                    "into a beautifully flowing, deeply reflective Korean diary.\n"
                    "Crucial Guidelines:\n"
                    "1. Elaborate and expand on the user's short input. Do not just repeat or slightly modify it. "
                    "Flesh out the story by adding narrative flow, emotional depth, or descriptive details, "
                    "making the diary body roughly 1.5 times longer than the input notes (extrapolating naturally based on the tone).\n"
                    "2. The diary body MUST be strictly 500 characters or less.\n"
                    "3. Adhere strictly to the requested writing style/persona:\n"
                    "- 'friend': A warm, comforting friend speaking in a friendly, empathetic conversational tone (반말/해요체, e.g., '~했어', '~구나').\n"
                    "- 'coach': An encouraging, objective life coach/mentor offering growth tips, insight, and positive reinforcement in a respectful tone (존댓말, e.g., '~했습니다', '~해보는 것은 어떨까요').\n"
                    "- 'writer': A lyrical, poetic, and literary writer who uses beautiful metaphors, sensory descriptions, and a narrative diary tone (e.g., '~다', '~했다').\n"
                    "- 'fairytale': A cozy fairytale storyteller turning daily events into a magical, imaginative adventure (e.g., '~했답니다', '~였답니다').\n"
                    "- Any other or 'diary': A rich, standard reflective personal diary (e.g., '~다')."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Style: {request.style}\n"
                    f"Entries:\n{source_text}\n\n"
                    "Create a diary title, mood label, 3 to 5 keywords, and diary body (strictly 500 characters or less)."
                ),
            },
        ],
        text_format=GenerateDiaryResponse,
    )

    res = response.output_parsed
    if res and res.diary:
        res.diary = res.diary[:500]
    return res
