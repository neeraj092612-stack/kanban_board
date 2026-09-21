import pytest
from fastapi.testclient import TestClient
from unittest import mock

from main import app
from src.models import StructuredOutput, BoardData

client = TestClient(app)

# Helper to create a minimal board structure
def sample_board_dict():
    return {
        "columns": [
            {
                "id": "col-1",
                "title": "Todo",
                "cards": [
                    {"id": "c1", "title": "Task 1", "details": ""}
                ],
            }
        ]
    }

def test_chat_reply_only(monkeypatch):
    async def fake_chat(request):
        return StructuredOutput(reply="Sure, done.", board=None)
    monkeypatch.setattr("ai_service.chat_with_ai", fake_chat)

    response = client.post(
        "/api/ai/chat",
        json={"message": "Hello", "history": [], "board": None},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["reply"] == "Sure, done."
    assert data["board"] is None

def test_chat_with_board_update(monkeypatch):
    async def fake_chat(request):
        board = BoardData(**sample_board_dict())
        return StructuredOutput(reply="Added a card.", board=board)
    # Spy on save_board
    save_spy = mock.AsyncMock()
    monkeypatch.setattr("db_service.save_board", save_spy)
    monkeypatch.setattr("ai_service.chat_with_ai", fake_chat)

    response = client.post(
        "/api/ai/chat",
        json={"message": "Add a card", "history": [], "board": sample_board_dict()},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["reply"] == "Added a card."
    # board returned should match sample_board_dict
    assert data["board"]["columns"][0]["cards"][0]["title"] == "Task 1"
    assert save_spy.called

def test_chat_malformed_response(monkeypatch):
    async def fake_chat(request):
        raise ValueError("AI response is not valid JSON")
    monkeypatch.setattr("ai_service.chat_with_ai", fake_chat)

    response = client.post(
        "/api/ai/chat",
        json={"message": "Bad", "history": [], "board": None},
    )
    assert response.status_code == 400
    assert "AI response is not valid JSON" in response.json()["detail"]

