# Backend Architecture and Conventions

## Overview
FastAPI backend for the Project Management MVP. Serves the board and AI chat APIs and the static frontend at `/`.

## Environment and Dependency Management
- Package manager: uv (`pyproject.toml`, `uv.lock`); dev tools in the `dev` dependency group
- Python 3.12+
- `DATABASE_URL`: Postgres connection (default `postgresql://postgres:postgres@127.0.0.1:54322/pm`); the database is created if missing
- `OPENAI_API_KEY` (required for chat), `OPENAI_MODEL` (default `gpt-4o-mini`), read from the root `.env`

## Layout
- `main.py`: routes and lifespan (initializes the database and connection pool on startup)
- `src/models.py`: API models; `BoardData` rejects duplicate card or column ids
- `src/database.py`: pool, `init_db` (database, tables, default user and seed board), `get_board`, `save_board`
- `src/ai_service.py`: OpenAI Structured Outputs call returning `{reply, operations}`, and `apply_operations`

## Endpoints
- `GET /api/health`: `{"status": "ok"}`
- `GET /api/board`, `PUT /api/board`: read and replace the user's board (422 on invalid payloads)
- `POST /api/ai/chat`: `{message, history, board}` -> `{reply, board | null}`; saves the board when the AI changed it. 503 when the API key is missing, 502 when the AI call fails or returns operations with unknown ids.
- `GET /`: static frontend from `static/`

## Testing
- `uv run pytest` runs against a `pm_test` database on the compose `db` service (`docker compose up -d db`)
- `uv run pytest -m live` runs the live OpenAI tests
