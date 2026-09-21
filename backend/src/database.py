import os
import json
from pathlib import Path
from typing import Any

import asyncpg
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

# Environment variables for Supabase connection (local instance)
SUPABASE_URL = os.getenv("SUPABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Default user and board seed data
DEFAULT_USERNAME = "user"
# The board JSON structure – minimal example with five columns and empty cards list
DEFAULT_BOARD_DATA = {
    "columns": [
        {"id": "backlog", "title": "Backlog", "cards": []},
        {"id": "todo", "title": "To Do", "cards": []},
        {"id": "in_progress", "title": "In Progress", "cards": []},
        {"id": "review", "title": "Review", "cards": []},
        {"id": "done", "title": "Done", "cards": []},
    ]
}


async def _execute(conn: asyncpg.Connection, query: str, *args: Any) -> None:
    """Helper to execute a query and ignore the result.

    All schema creation statements are idempotent (CREATE IF NOT EXISTS).
    """
    await conn.execute(query, *args)


async def init_db() -> None:
    """Create Supabase tables if they do not exist and seed default data.

    This function is intended to be called once on application startup.
    It is safe to run multiple times – tables are created with IF NOT EXISTS
    and inserts use ON CONFLICT DO NOTHING to avoid duplicates.
    """
    if not SUPABASE_URL:
        raise RuntimeError("Supabase connection details not set in environment")

    # Build the connection string – Supabase provides a Postgres URL.
    # Example: "postgresql://postgres:password@localhost:5432/postgres"
    separator = "&" if "?" in SUPABASE_URL else "?"
    conn_str = f"{SUPABASE_URL}{separator}sslmode=disable"
    conn = await asyncpg.connect(dsn=conn_str)
    try:
        # Create tables
        await _execute(
            conn,
            """
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                username TEXT UNIQUE NOT NULL,
                created_at TIMESTAMPTZ DEFAULT now()
            );
            """,
        )
        await _execute(
            conn,
            """
            CREATE TABLE IF NOT EXISTS boards (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
                data JSONB NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT now(),
                UNIQUE (user_id)
            );
            """,
        )

        # Seed default user
        await _execute(
            conn,
            """
            INSERT INTO users (username)
            VALUES ($1)
            ON CONFLICT (username) DO NOTHING;
            """,
            DEFAULT_USERNAME,
        )

        # Get the user id for the default user
        user_row = await conn.fetchrow(
            "SELECT id FROM users WHERE username = $1;",
            DEFAULT_USERNAME,
        )
        if not user_row:
            raise RuntimeError("Failed to retrieve default user after insertion")
        user_id = user_row["id"]

        # Seed default board for the user if not present
        await _execute(
            conn,
            """
            INSERT INTO boards (user_id, data)
            VALUES ($1, $2::jsonb)
            ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data;
            """,
            user_id,
            json.dumps(DEFAULT_BOARD_DATA),
        )
    finally:
        await conn.close()

if __name__ == "__main__":
    import asyncio

    asyncio.run(init_db())

