import asyncpg
import json
from database import SUPABASE_URL
from models import BoardData

async def _get_connection():
    separator = "&" if "?" in SUPABASE_URL else "?"
    conn_str = f"{SUPABASE_URL}{separator}sslmode=disable"
    return await asyncpg.connect(dsn=conn_str)

async def get_board(user_id: str) -> BoardData:
    conn = await _get_connection()
    try:
        row = await conn.fetchrow(
            "SELECT data FROM boards WHERE user_id = $1;", user_id
        )
        if not row:
            raise RuntimeError("Board not found for user")
        data = row["data"]
        if isinstance(data, str):
            data = json.loads(data)
        return BoardData(**data)
    finally:
        await conn.close()

async def save_board(user_id: str, board: BoardData) -> None:
    conn = await _get_connection()
    try:
        await conn.execute(
            "UPDATE boards SET data = $2::jsonb, updated_at = now() WHERE user_id = $1;",
            user_id,
            json.dumps(board.dict()),
        )
    finally:
        await conn.close()

async def _fetch_user_id(username: str) -> str:
    conn = await _get_connection()
    try:
        row = await conn.fetchrow(
            "SELECT id FROM users WHERE username = $1;", username
        )
        if not row:
            raise RuntimeError("User not found")
        return str(row["id"])
    finally:
        await conn.close()

