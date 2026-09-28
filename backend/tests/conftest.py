import asyncio
import os

# Point the app at a dedicated test database before it is imported.
os.environ["DATABASE_URL"] = os.getenv(
    "TEST_DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:54322/pm_test"
)

import asyncpg
import pytest
from fastapi.testclient import TestClient

from main import app
from src import ai_service
from src.database import DATABASE_URL, DEFAULT_BOARD


@pytest.fixture
def client():
    """App client with a fresh default board; runs startup (database init) and shutdown."""
    with TestClient(app) as client:
        client.put("/api/board", json=DEFAULT_BOARD)
        yield client
    # The cached OpenAI client is bound to this client's event loop.
    ai_service.get_client.cache_clear()


@pytest.fixture
def db_fetch():
    """Run a query directly against the test database."""
    return _db_fetch


def _db_fetch(query: str, *args):
    async def run():
        conn = await asyncpg.connect(DATABASE_URL, ssl=False)
        try:
            return await conn.fetch(query, *args)
        finally:
            await conn.close()

    return asyncio.run(run())
