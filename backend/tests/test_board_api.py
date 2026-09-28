import copy

from src.database import DEFAULT_BOARD


def test_get_board_returns_seeded_board(client):
    board = client.get("/api/board").json()
    assert len(board["columns"]) == 5
    assert sum(len(column["cards"]) for column in board["columns"]) == 8


def test_put_board_round_trip(client):
    board = copy.deepcopy(DEFAULT_BOARD)
    board["columns"][2]["title"] = "Active Development"
    board["columns"][0]["cards"][0]["details"] = "Kept details"
    assert client.put("/api/board", json=board).json() == board
    assert client.get("/api/board").json() == board


def test_put_board_rejects_malformed_payload(client):
    response = client.put("/api/board", json={"columns": [{"id": "x"}]})
    assert response.status_code == 422


def test_put_board_rejects_duplicate_card_ids(client):
    board = copy.deepcopy(DEFAULT_BOARD)
    board["columns"][1]["cards"].append(board["columns"][0]["cards"][0])
    response = client.put("/api/board", json=board)
    assert response.status_code == 422
    assert "unique" in response.text
