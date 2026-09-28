"""Live tests against the real OpenAI API. Run with: uv run pytest -m live"""
import pytest

from src.database import DEFAULT_BOARD

pytestmark = pytest.mark.live

EMPTY_BOARD = {"columns": [{**column, "cards": []} for column in DEFAULT_BOARD["columns"]]}


def card_titles(board, column_id):
    column = next(column for column in board["columns"] if column["id"] == column_id)
    return [card["title"] for card in column["cards"]]


@pytest.mark.parametrize("board", [EMPTY_BOARD, DEFAULT_BOARD], ids=["empty", "seeded"])
def test_ai_creates_and_moves_card(client, board):
    client.put("/api/board", json=board)
    response = client.post(
        "/api/ai/chat",
        json={
            "message": "Add a card to Backlog called 'Automated Test Card' with details 'Created via AI'.",
            "history": [],
            "board": board,
        },
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["reply"]
    assert "Automated Test Card" in card_titles(data["board"], "col-backlog")
    assert client.get("/api/board").json() == data["board"]

    response = client.post(
        "/api/ai/chat",
        json={
            "message": "Move 'Automated Test Card' to Done.",
            "history": [
                {"role": "user", "content": "Add a card called 'Automated Test Card' to Backlog."},
                {"role": "assistant", "content": data["reply"]},
            ],
            "board": data["board"],
        },
    )
    assert response.status_code == 200, response.text
    moved = response.json()["board"]
    assert "Automated Test Card" in card_titles(moved, "col-done")
    assert "Automated Test Card" not in card_titles(moved, "col-backlog")
