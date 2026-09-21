import pytest
from fastapi.testclient import TestClient
from main import app
from models import BoardData, Column, Card

@pytest.fixture(scope="module")
def client():
    return TestClient(app)

def test_board_api_flow(client):
    # GET initial board
    resp = client.get("/api/board")
    assert resp.status_code == 200
    data = resp.json()
    assert "columns" in data
    # Update board with a new column title
    board = BoardData(columns=[Column(id="col1", title="Backlog", cards=[])])
    resp_put = client.put("/api/board", json=board.dict())
    assert resp_put.status_code == 200
    # Verify persisted change
    resp2 = client.get("/api/board")
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["columns"][0]["title"] == "Backlog"

