# Backend

FastAPI backend for the Project Management MVP. See `AGENTS.md` for details.

```bash
uv sync
docker compose up -d db          # from the repo root
uv run uvicorn main:app --reload --port 8000
uv run pytest                    # uses a separate pm_test database
uv run pytest -m live            # live OpenAI tests
```
