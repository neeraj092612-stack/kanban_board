from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_static_root():
    response = client.get("/")
    assert response.status_code == 200
    assert "Kanban Studio" in response.text

def test_static_asset():
    response = client.get("/favicon.ico")
    assert response.status_code == 200
