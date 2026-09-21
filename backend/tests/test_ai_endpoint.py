import pytest
from fastapi.testclient import TestClient
from main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_ai_endpoint(monkeypatch, client):
    async def mock_get_ai_response(prompt: str) -> str:
        return "4"
    # Patch the function used in the endpoint
    monkeypatch.setattr('ai_service.get_ai_response', mock_get_ai_response, raising=False)
    response = client.post('/api/ai/test')
    assert response.status_code == 200
    json_data = response.json()
    assert json_data.get('answer') == '4'

