# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project rules

`AGENTS.md` (root) holds the business requirements, tech decisions, color palette and coding standards; read it first. Sub-area notes live in `frontend/AGENTS.md`, `backend/AGENTS.md`, `scripts/AGENTS.md`. The staged implementation plan with checklists is `docs/PLAN.md`; DB design is in `docs/DATABASE.md`.

Key rules from those documents:
- No emojis anywhere (code, UI text, logs, commits, docs).
- Keep it simple: no over-engineering, no unnecessary defensive code, no extra features.
- When something breaks, prove the root cause with evidence before fixing.
- Each plan stage must pass its unit and integration tests before moving on.

## Commands

Full stack (Docker Compose: `db` = supabase/postgres on 127.0.0.1:54322, `web` = FastAPI + static frontend on 127.0.0.1:8000):
```bash
scripts/start-server.sh      # or .ps1 / .bat on Windows; runs docker compose up -d --build
scripts/stop-server.sh
DB_NAME=pm_e2e scripts/start-server.sh   # same stack on a separate database (for E2E tests)
```

Backend (run from `backend/`, managed by uv):
```bash
uv sync
uv run uvicorn main:app --reload --port 8000
uv run pytest                                              # all tests except live AI tests
uv run pytest tests/test_board_api.py::test_put_board_round_trip   # single test
uv run pytest -m live                                      # live OpenAI tests (needs OPENAI_API_KEY in root .env)
```
Tests need the compose `db` running (`docker compose up -d db`). `tests/conftest.py` points the app at a separate `pm_test` database (override with `TEST_DATABASE_URL`), created automatically. Use `127.0.0.1`, not `localhost`, in database URLs: the port is bound to IPv4 only and `localhost` tries IPv6 first, adding about 2s per connection on Windows.

Frontend (run from `frontend/`):
```bash
npm run dev                  # Next dev server on :3000 (no backend proxy; /api calls fail unless served via FastAPI)
npm run build                # static export to frontend/out
npm run lint
npx tsc --noEmit
npm run test                 # Vitest unit tests (src/**/*.test.ts[x])
npx vitest run src/lib/kanban.test.ts   # single test file
npm run test:e2e             # Playwright against the running app (default http://127.0.0.1:8000); resets the board before each test and calls OpenAI once
```

## Architecture

- **Single origin.** Next.js is built with `output: "export"` and served as static files by FastAPI (`app.mount("/", StaticFiles(...))` in `backend/main.py`). The Dockerfile builds `frontend/out` and copies it to `/app/static`. For local non-Docker runs, copy the export into `backend/static/` (gitignored): `cd frontend && npm run build && rm -rf ../backend/static && cp -r out ../backend/static`. `tests/test_health.py` needs this copy.
- **Backend layout.** `backend/main.py` (routes, lifespan) imports the `src` package: `src/models.py` (Pydantic API models; `BoardData` rejects duplicate ids), `src/database.py`, `src/ai_service.py`. Routes: `GET /api/health`, `GET/PUT /api/board`, `POST /api/ai/chat`. All routes use the hardcoded username `"user"`.
- **Persistence.** Raw `asyncpg` against Postgres via `DATABASE_URL` (the supabase/postgres image, no Supabase APIs). The app lifespan calls `init_db()`, which creates the database if missing, opens a pool, creates `users` and `boards` (one board per user, whole board as JSONB), and seeds user `user` with the demo board (`DEFAULT_BOARD`) only if no board exists.
- **Auth.** Client-side only: `frontend/src/lib/auth.ts` checks `user`/`password` and stores the session in browser storage. The backend has no auth.
- **Board state and saving.** `src/app/page.tsx` owns all state and uses `src/lib/api.ts`. It keeps `savedBoard` (last board the server confirmed) and saves whenever `board !== savedBoard`, one request at a time; when a save lands the effect re-runs and sends any newer board. The header status (Saving... / Saved / Save failed) is derived from that comparison. A failed load shows an error with Retry instead of a board. `KanbanBoard` is controlled (`board`, `onBoardChange` with updater functions). Column renames commit on blur or Enter.
- **Two board shapes.** Frontend state (`src/lib/kanban.ts`) is normalized: `columns[].cardIds` + `cards` record. The API/DB shape is nested: `columns[].cards[]`. Convert with `toApiBoard` / `fromApiBoard`. The demo board lives only in the backend seed; `src/test/fixtures.ts` mirrors it for unit and E2E tests.
- **AI chat flow.** `useChat` (state lives in `page.tsx`, so history survives closing `ChatSidebar`) posts `{message, history, board}` to `/api/ai/chat`; history excludes the new message. The model does not return a board: via Structured Outputs (`chat.completions.parse`) it returns `{reply, operations[]}` (create/update/move/delete card, rename column), and `apply_operations` applies them to the request board, generating new card ids server-side and rejecting unknown ids (502, nothing saved). The endpoint saves the result and returns `{reply, board | null}`. The board is locked (`KanbanBoard` `locked`) while a request is pending. Model: `OPENAI_MODEL` (default `gpt-4o-mini`).
- **Drag and drop** uses `@dnd-kit`; `KanbanBoard.tsx` owns board interactions and `moveCard` in `kanban.ts` is the pure move logic (unit-tested).
- **Styling.** Tailwind v4 with palette CSS variables in `src/app/globals.css` (`--accent-yellow`, `--primary-blue`, `--purple-secondary`, `--navy-dark`, `--gray-text`).
