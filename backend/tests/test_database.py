import asyncio
import json

import asyncpg
import pytest

from src import database


def run_init():
    async def run():
        await database.init_db()
        await database.close_db()

    asyncio.run(run())


def test_init_db_is_idempotent(db_fetch):
    run_init()
    run_init()
    assert db_fetch("SELECT count(*) FROM users")[0][0] == 1
    assert db_fetch("SELECT count(*) FROM boards")[0][0] == 1


def test_init_db_preserves_existing_board(db_fetch):
    run_init()
    marker = {"columns": [{"id": "keep", "title": "Keep", "cards": []}]}
    db_fetch("UPDATE boards SET data = $1::jsonb", json.dumps(marker))
    run_init()
    assert json.loads(db_fetch("SELECT data FROM boards")[0][0]) == marker


def test_board_requires_existing_user(db_fetch):
    run_init()
    with pytest.raises(asyncpg.ForeignKeyViolationError):
        db_fetch(
            "INSERT INTO boards (user_id, data) VALUES (gen_random_uuid(), '{}'::jsonb)"
        )


def test_init_db_creates_missing_database(monkeypatch):
    name = "pm_test_create"
    url = database.DATABASE_URL.rsplit("/", 1)[0] + f"/{name}"
    admin_url = url.rsplit("/", 1)[0] + "/postgres"

    async def admin(query):
        conn = await asyncpg.connect(admin_url, ssl=False)
        try:
            if query.startswith("SELECT"):
                return await conn.fetchval(query)
            await conn.execute(query)
        finally:
            await conn.close()

    asyncio.run(admin(f'DROP DATABASE IF EXISTS "{name}"'))
    monkeypatch.setattr(database, "DATABASE_URL", url)
    run_init()
    assert asyncio.run(admin(f"SELECT 1 FROM pg_database WHERE datname = '{name}'")) == 1
    asyncio.run(admin(f'DROP DATABASE "{name}"'))
