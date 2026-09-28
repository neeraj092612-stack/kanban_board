import json
import os
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

import asyncpg
from dotenv import load_dotenv

from src.models import BoardData

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:54322/pm")
DEFAULT_USERNAME = "user"

DEFAULT_BOARD = {
    "columns": [
        {
            "id": "col-backlog",
            "title": "Backlog",
            "cards": [
                {"id": "card-1", "title": "Align roadmap themes", "details": "Draft quarterly themes with impact statements and metrics."},
                {"id": "card-2", "title": "Gather customer signals", "details": "Review support tags, sales notes, and churn feedback."},
            ],
        },
        {
            "id": "col-discovery",
            "title": "Discovery",
            "cards": [
                {"id": "card-3", "title": "Prototype analytics view", "details": "Sketch initial dashboard layout and key drill-downs."},
            ],
        },
        {
            "id": "col-progress",
            "title": "In Progress",
            "cards": [
                {"id": "card-4", "title": "Refine status language", "details": "Standardize column labels and tone across the board."},
                {"id": "card-5", "title": "Design card layout", "details": "Add hierarchy and spacing for scanning dense lists."},
            ],
        },
        {
            "id": "col-review",
            "title": "Review",
            "cards": [
                {"id": "card-6", "title": "QA micro-interactions", "details": "Verify hover, focus, and loading states."},
            ],
        },
        {
            "id": "col-done",
            "title": "Done",
            "cards": [
                {"id": "card-7", "title": "Ship marketing page", "details": "Final copy approved and asset pack delivered."},
                {"id": "card-8", "title": "Close onboarding sprint", "details": "Document release notes and share internally."},
            ],
        },
    ]
}

pool: asyncpg.Pool | None = None


async def _create_database_if_missing() -> None:
    parts = urlsplit(DATABASE_URL)
    name = parts.path.lstrip("/")
    admin_url = urlunsplit(parts._replace(path="/postgres"))
    conn = await asyncpg.connect(admin_url, ssl=False)
    try:
        if not await conn.fetchval("SELECT 1 FROM pg_database WHERE datname = $1", name):
            await conn.execute(f'CREATE DATABASE "{name}"')
    finally:
        await conn.close()


async def init_db() -> None:
    """Create the database, tables, default user and default board if missing. Idempotent."""
    global pool
    await _create_database_if_missing()
    pool = await asyncpg.create_pool(DATABASE_URL, ssl=False)
    async with pool.acquire() as conn:
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                username TEXT UNIQUE NOT NULL,
                created_at TIMESTAMPTZ DEFAULT now()
            );
            CREATE TABLE IF NOT EXISTS boards (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
                data JSONB NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT now(),
                UNIQUE (user_id)
            );
            """
        )
        await conn.execute(
            """
            WITH u AS (
                INSERT INTO users (username) VALUES ($1)
                ON CONFLICT (username) DO UPDATE SET username = EXCLUDED.username
                RETURNING id
            )
            INSERT INTO boards (user_id, data) SELECT id, $2::jsonb FROM u
            ON CONFLICT (user_id) DO NOTHING;
            """,
            DEFAULT_USERNAME,
            json.dumps(DEFAULT_BOARD),
        )


async def close_db() -> None:
    await pool.close()


async def get_board(username: str) -> BoardData:
    data = await pool.fetchval(
        "SELECT b.data FROM boards b JOIN users u ON u.id = b.user_id WHERE u.username = $1",
        username,
    )
    return BoardData.model_validate_json(data)


async def save_board(username: str, board: BoardData) -> None:
    await pool.execute(
        """
        UPDATE boards SET data = $2::jsonb, updated_at = now()
        FROM users u WHERE boards.user_id = u.id AND u.username = $1
        """,
        username,
        board.model_dump_json(),
    )
