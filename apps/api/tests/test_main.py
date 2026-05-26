from httpx import ASGITransport, AsyncClient
import pytest

from app.config import Settings
from app.main import create_app


def test_settings_parses_cors_origins() -> None:
    settings = Settings(
        backend_cors_origins="http://localhost:3000, https://example.com, ",
    )

    assert settings.cors_origins == [
        "http://localhost:3000",
        "https://example.com",
    ]


@pytest.mark.anyio
async def test_health_endpoint() -> None:
    app = create_app(lambda: Settings(openai_api_key=None))

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.anyio
async def test_generate_diary_uses_fallback_without_openai_key() -> None:
    app = create_app(lambda: Settings(openai_api_key=None))

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        response = await client.post(
            "/api/diary/generate",
            json={
                "entries": [
                    {
                        "content": "아침에 산책하고 저녁에는 책을 읽었다.",
                        "source": "web",
                    }
                ],
                "style": "diary",
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "오늘의 기록 초안"
    assert body["mood"] == "차분함"
    assert body["keywords"] == ["기록", "회고", "감정"]
    assert "아침에 산책하고 저녁에는 책을 읽었다." in body["diary"]


@pytest.mark.anyio
async def test_generate_diary_rejects_empty_entries() -> None:
    app = create_app(lambda: Settings(openai_api_key=None))

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        response = await client.post(
            "/api/diary/generate",
            json={
                "entries": [
                    {
                        "content": "",
                        "source": "web",
                    }
                ],
                "style": "diary",
            },
        )

    assert response.status_code == 422
