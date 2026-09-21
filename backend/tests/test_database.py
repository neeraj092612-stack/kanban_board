import os
import asyncio
import asyncpg
import pytest
import json

# Database connection settings (fallback to defaults)
SUPABASE_URL = os.getenv("SUPABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres")

# Import init_db from src package
from src.database import init_db


def test_init_db_creates_tables_and_seeds():
    """Verify that init_db creates the tables and inserts the default data."""
    asyncio.run(init_db())
    async def _verify():
        conn = await asyncpg.connect(dsn=SUPABASE_URL)
        try:
            user = await conn.fetchrow("SELECT username FROM users WHERE username = $1;", "user")
            assert user is not None
            assert user["username"] == "user"

# ...
            board = await conn.fetchrow(
                "SELECT data FROM boards WHERE user_id = (SELECT id FROM users WHERE username = $1);",
                "user",
            )
            assert board is not None
            data = board["data"]
            if isinstance(data, str):
                data = json.loads(data)
            columns = data["columns"]
            expected_ids = {"backlog", "todo", "in_progress", "review", "done"}
            assert {col["id"] for col in columns} == expected_ids
        finally:
            await conn.close()
    asyncio.run(_verify())


def test_init_db_idempotent():
    """Running init_db twice must not create duplicate rows."""
    asyncio.run(init_db())
    async def _counts():
        conn = await asyncpg.connect(dsn=SUPABASE_URL)
        try:
            user_count_1 = await conn.fetchval("SELECT COUNT(*) FROM users;")
            board_count_1 = await conn.fetchval("SELECT COUNT(*) FROM boards;")
        finally:
            await conn.close()
        return user_count_1, board_count_1
    user_count_1, board_count_1 = asyncio.run(_counts())
    # Run again
    asyncio.run(init_db())
    async def _counts2():
        conn = await asyncpg.connect(dsn=SUPABASE_URL)
        try:
            user_count_2 = await conn.fetchval("SELECT COUNT(*) FROM users;")
            board_count_2 = await conn.fetchval("SELECT COUNT(*) FROM boards;")
        finally:
            await conn.close()
        return user_count_2, board_count_2
    user_count_2, board_count_2 = asyncio.run(_counts2())
    assert user_count_1 == user_count_2 == 1
    assert board_count_1 == board_count_2 == 1

