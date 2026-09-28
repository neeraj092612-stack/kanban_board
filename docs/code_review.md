# Code Review: Project Management MVP

Date: 2026-09-27
Scope: entire repository (backend, frontend, Docker, scripts, tests, docs) at the current working tree, including the uncommitted Part 7 changes.

## Summary

The MVP works end to end. All automated tests pass: 23 frontend unit tests, 12 backend tests against the Docker database, and 6 Playwright tests against the Docker app. The live AI endpoints also respond. The main risks are:

1. The AI chat's output shape is not enforced, and a live request against an empty board failed (verified).
2. Several board-state behaviors can silently lose or change user data: the demo board comes back after all cards are deleted, chat replies overwrite concurrent edits, and saves can land out of order.
3. Tests run against, and overwrite, the real development database.
4. Repository hygiene: 1,153 `node_modules` files are tracked in git, and there are duplicate or unused config files.

Severity: **High** means data loss or a broken feature, **Medium** means a correctness or maintainability risk, **Low** means cleanup.

## Remediation status (2026-09-27)

All findings below have been addressed. Final verification, run against a freshly rebuilt Docker stack:

| Check | Result |
|-------|--------|
| Backend tests (`uv run pytest`, `pm_test` database) | 27 passed |
| Live OpenAI tests (`uv run pytest -m live`, empty and seeded boards) | 2 passed |
| Frontend unit tests (Vitest) | 33 passed |
| `eslint` / `tsc --noEmit` / `next build` | clean |
| Playwright against the Docker app (`pm_e2e` database), including the live AI flow | 7 passed |

How each finding was resolved, where it differs from the suggested action or needs explaining:

- **C1:** Structured Outputs alone was not enough. Live testing showed the model sometimes returned a board with columns missing, which would have been saved and lost data. The model now returns `{reply, operations[]}` instead of a board. The backend applies the operations (`apply_operations` in `src/ai_service.py`), generates new card ids itself, and rejects unknown ids with a 502 without saving. The live tests passed on repeated runs.
- **C2, C6:** The demo board is now the backend seed. The frontend fallback is removed, and a failed load shows an error with a Retry button.
- **C3, C11:** Chat state moved up into `page.tsx`, and the board is locked while a chat request is pending.
- **C4, C10:** One save is in flight at a time, and the latest board is sent when it finishes. Column renames commit on blur or Enter, and an empty title is restored.
- **T1:** Backend tests use the `pm_test` database. The app takes `DB_NAME` (`DB_NAME=pm_e2e` for Playwright). `init_db` creates any missing database, which also meets the AGENTS.md requirement to create the database if it doesn't exist. The app now uses a `pm` database, so a board stored in the old `postgres` database is no longer read.
- **S1-S4:** Ports are bound to 127.0.0.1, CORS and `/api/ai/test` are removed, and the database password is configurable (`POSTGRES_PASSWORD`, default `postgres`). The API is still unauthenticated, as accepted for the local single-user MVP.
- **B1-B7:** The app uses a connection pool created in the lifespan handler, single-query board reads and writes, `src` package imports, and `DATABASE_URL`. `pyproject` requires Python 3.12 and uses a `dev` dependency group. `init_db` fails fast on startup; Compose already waits for a healthy database.
- **F1-F7:** Emojis are replaced with text and an SVG icon, the chat components use the theme variables, `KanbanBoard` is controlled, lint and `tsc` are clean, `createId` uses `crypto.randomUUID`, and the unused Tailwind and PostCSS configs are removed. The dev server now starts. It worked again after removing the `node_modules/frontend` junction and the duplicate PostCSS config; which of the two caused the `os error 1450` was not isolated.
- **R1:** The root workspace and `node_modules` are removed and ignored. `frontend/` needed a clean `npm ci`, because some of its dependencies had been hoisted into the root folder.

Issues found and fixed during remediation:
- **Slow database connections.** Binding the database port to 127.0.0.1 made `localhost` connections take about 2 seconds on Windows, because the IPv6 attempt fails first. Default URLs now use `127.0.0.1`.
- **Misleading 503.** The endpoint returned 503 "service unavailable" for any `RuntimeError`, so an unrelated error was reported as a missing API key. It now catches only the specific `AIUnavailableError`.

---

## 1. Correctness

### High

**C1. AI chat output shape is not enforced; card IDs can be missing.** `backend/src/ai_service.py:69`
The request uses `response_format={"type": "json_object"}`, which only guarantees valid JSON. The system prompt never describes the card fields. Verified live: asking to add a card to a board with no cards returned a card without `id`, so `/api/ai/chat` failed with a validation error. With existing cards to copy, the model followed the `card-N` pattern and succeeded. `docs/PLAN.md` Part 9 claims the schema is enforced.
Action: use Structured Outputs (`client.chat.completions.parse(..., response_format=StructuredOutput)`) so the API enforces the shape. Add a live integration test for an empty board and for a board with cards.

**C2. Deleting every card brings the demo board back.** `frontend/src/lib/kanban.ts:94`
`fromApiBoard` returns the hardcoded `initialData` whenever the stored board has no cards. If the user removes all cards and reloads, the demo cards and columns reappear and are then saved over the user's board. This also means the backend's default columns (`backlog`, `todo`, ...) are never shown.
Action: move the demo board into the backend seed (`DEFAULT_BOARD_DATA` in `backend/src/database.py`) and delete the fallback in `fromApiBoard`, so the frontend always renders what the server stores.

**C3. AI replies overwrite edits made while the AI is responding.** `frontend/src/hooks/useChat.ts`, `backend/main.py:72-75`
The chat sends a snapshot of the board, and the reply replaces the whole board on both the client and the server. Any drag or edit made while "Thinking..." is shown is lost.
Action: disable board editing while a chat request is pending (simplest). Alternatively, reject the AI's board if the client board changed since the request was sent.

### Medium

**C4. Board saves can be applied out of order.** `frontend/src/app/page.tsx`, `backend/src/db_service.py`
Every change sends a `PUT`, including every keystroke of a column rename (`KanbanColumn.tsx:45`). Each request opens its own DB connection, so two in-flight `PUT`s can commit in either order, leaving an older board stored while the UI shows "Saved".
Action: send only one save at a time, and when it finishes, send the latest board if it has changed since. Also commit column renames on blur or Enter rather than on every keystroke.

**C5. The current user message is sent to the model twice.** `frontend/src/hooks/useChat.ts:40`, `backend/src/ai_service.py:50-59`
The frontend sends `history: messages.concat(userMsg)` and also `message: msg`, and the backend appends `request.message` after the history.
Action: send `history: messages` (without the new message).

**C6. A failed board load looks like success.** `frontend/src/app/page.tsx:40`
If `GET /api/board` fails, the demo board is shown with no error or save status, and edits are silently never saved.
Action: show a load error (and a retry) instead of the demo board.

**C7. No validation of card-ID uniqueness or column integrity.** `backend/src/models.py`
Duplicate card IDs, whether AI-generated or client-generated, break the frontend's `cards` record and drag and drop.
Action: add a `model_validator` on `BoardData` that rejects duplicate card IDs.

**C8. The chat error message shows raw JSON.** `frontend/src/hooks/useChat.ts:45`
`response.text()` shows `{"detail":"..."}` to the user.
Action: parse the JSON and show `detail`.

### Low

**C9. The placeholder text is stored as real data.** `KanbanBoard.tsx:75`
`"No details yet."` is saved as the card's details. Store `""` and show a placeholder only when rendering.

**C10. Empty column titles are allowed.** Trim the title on blur and fall back to the previous one if it's empty.

**C11. Closing the chat sidebar erases the chat history.** The hook's state lives in `ChatSidebar`, which unmounts on close. Keep the sidebar mounted and hide it, or move the messages state up into `page.tsx`.

---

## 2. Security

This is an MVP that runs locally, and `AGENTS.md` accepts hardcoded sign-in. Those limits are fine, but they should be explicit.

**S1 (Medium). The API has no authentication.** `backend/main.py`
Sign-in is checked only in the browser (`frontend/src/lib/auth.ts`), and setting `localStorage.pm_user` bypasses it. Anyone who can reach port 8000 can read or overwrite the board and spend OpenAI credits through `/api/ai/chat` and `/api/ai/test`.
Action: bind the published ports to localhost (`"127.0.0.1:8000:8000"`, `"127.0.0.1:54322:5432"` in `docker-compose.yml`). When multi-user support arrives, move sign-in to the backend and issue a session cookie.

**S2 (Low). The CORS policy is `allow_origins=["*"]` with credentials enabled.** `backend/main.py:20`
The frontend is served from the same origin, so CORS isn't needed at all. Remove the middleware.

**S3 (Low). `POST /api/ai/test` is a debug endpoint in production code.** `backend/main.py:49`
It is an unauthenticated way to spend API credits. Remove it now that `/api/ai/chat` exists, or restrict it to development.

**S4 (Low). The database password is hardcoded as `postgres`** in `docker-compose.yml`. That's acceptable for local use. Move it to `.env` if the stack is ever shared.

---

## 3. Backend code quality

**B1 (Medium). A new DB connection is opened for every call.** `backend/src/db_service.py`
Each board request opens 2 connections (`_fetch_user_id`, then `get_board` or `save_board`).
Action: create one `asyncpg` pool in a FastAPI lifespan handler and look up the user and board in a single query.

**B2 (Medium). `main.py` structure.**
- Imports are duplicated (`import sys, os` then `import os`) and spread through the file.
- `sys.path.append` is used so that `src` can be imported flat. Tests import both `models` and `src.models`, which loads each module twice as two separate modules.
- `@app.on_event("startup")` is deprecated and causes the pytest warnings.
- A private helper, `_fetch_user_id`, is used as public API.

Action: make `src` a package imported as `from src.models import ...`, or move `main.py` into it. Use `lifespan`, and rename the helper to `get_user_id`.

**B3 (Low). Dead or misleading code in `backend/src/database.py`.**
- `SUPABASE_KEY` (line 13) is unused.
- `if not SUPABASE_URL` (line 44) can never be true, because a default is set.
- `_execute` is a one-line wrapper.
- The `sslmode=disable` string handling is duplicated in `db_service.py:8`.
- The default port 5432 doesn't match the compose host port 54322, so local tests need `SUPABASE_URL` set.

Action: delete the dead code, put connection setup in one place, and change the default to `localhost:54322`.

**B4 (Low). The name "Supabase" is misleading.** The stack runs the `supabase/postgres` image as plain Postgres through `asyncpg`; no Supabase API is used. Rename `SUPABASE_URL` to `DATABASE_URL`, or state this in `docs/DATABASE.md`.

**B5 (Low). `ai_service.py` details.**
- `openai` is imported lazily inside functions, and a new client is created on every call. Import it at the top and create the client once.
- `ChatRequest.history` is an untyped `List[dict]` filtered by hand. Use a `ChatMessage` model with `role: Literal["user", "assistant"]`.

**B6 (Low). Error handling on startup.** `backend/main.py:83-90`
A failed `init_db` is only printed, and every board request then fails with a 500 and no clear cause. Acceptable while the DB is starting, but log it with `logging` and return a clear 503 from the board routes.

**B7 (Low). `pyproject.toml` details.**
- It says `requires-python = ">=3.9"`, but the docs and Docker use 3.12. Set `>=3.12`.
- `pytest-asyncio` is unused; the tests call `asyncio.run`. Remove it.
- Dev tools are declared as an optional extra rather than a uv dependency group. Move them to `[dependency-groups] dev`, so that `uv sync` and the Dockerfile's `--no-dev` behave as intended.

---

## 4. Frontend code quality

**F1 (Medium). Emojis in the UI violate the project rule.**
- `ChatToggleButton.tsx` renders a speech-balloon emoji.
- `ChatSidebar.tsx:29` uses the symbol character U+2715 for close. It's a symbol rather than an emoji, but has no accessible label.

Action: use text or an inline SVG icon, and add `aria-label="Close chat"`.

**F2 (Medium). The chat components don't follow the design system.** `ChatSidebar.tsx`, `ChatToggleButton.tsx`
They use hardcoded hex values, Tailwind grays and inline styles instead of the CSS variables in `globals.css`. The sidebar declares `role="dialog" aria-modal="true"` but doesn't trap focus. Action: use the theme variables, and drop `aria-modal` or implement focus handling.

**F3 (Medium). `KanbanBoard` has two state modes.** `KanbanBoard.tsx:32-34`
It keeps internal state as well as `externalBoard`/`externalSetBoard`. The internal mode exists only for tests. Action: make it a controlled component (`board`, `onChange`), and have tests render it through a small stateful wrapper.

**F4 (Low). Lint and type errors (6 lint errors, plus `tsc` errors in the test files).**
- `page.tsx:28`: calling `setState` inside an effect. Read the stored user with `useSyncExternalStore`, or a lazy initializer guarded for SSR.
- `useChat.ts:54` and `ChatSidebar.test.tsx`: `any`. Use `unknown` and narrow it.
- `src/test/vitest.d.ts` references `vitest` instead of `vitest/globals`, which causes every `describe`/`it` type error. Change the reference.

Action: fix all of these and add `npm run lint` and `tsc --noEmit` to the testing gate.

**F5 (Low). `createId` uses `Math.random`.** `kanban.ts:202` Use `crypto.randomUUID()`.

**F6 (Low). Duplicate and unused configs.**
- Tailwind v4 ignores both `tailwind.config.js` and `tailwind.config.cjs`, since no `@config` is used. Delete both.
- There are two PostCSS configs (`postcss.config.js` and `postcss.config.mjs`). Keep only the `.mjs`.

**F7 (Info). The Next dev server fails on this machine.** Turbopack's dev server fails every time with Windows `os error 1450` while writing `.next/dev/build/postcss.js`; the production build works. The root cause hasn't been identified. Investigate after removing the duplicate PostCSS config (F6), and check for antivirus or indexing locks on `.next`.

---

## 5. Tests

**T1 (High). Tests overwrite the development database.**
- `backend/tests/test_board_api.py` replaces the stored board.
- The Playwright suite resets it before every test.
- `test_database.py` runs against whatever `SUPABASE_URL` points at.

Action: run tests against a separate database, for example a `pm_test` database created by `init_db` or a separate compose project. Have the tests read a `TEST_DATABASE_URL`.

**T2 (Medium). The AI service logic is untested.** `backend/tests/test_ai_chat.py` mocks the whole of `chat_with_ai`, so prompt building, history filtering, JSON parsing and validation never run. Planned tests are also missing:
- missing or invalid API key (Part 8)
- `PUT /api/board` returning 422 on a malformed payload (Part 6)
- a live AI integration test (Parts 9 and 10)

Action: mock the OpenAI client instead of the service function, and add the missing tests. Put live tests behind a pytest marker.

**T3 (Low). `page.tsx` behavior is untested at the unit level.** Load failure, save status transitions and the rule that chat updates don't trigger a second save are covered only indirectly by E2E. Add Vitest tests with a mocked `fetch`.

---

## 6. Repository, build and docs

**R1 (High). `node_modules/` is tracked in git (1,153 files).** The root `package.json` declares an npm workspace, which creates `node_modules/frontend`, and that directory was committed. Every frontend change therefore shows up twice.
Action: add `node_modules/` to `.gitignore` and run `git rm -r --cached node_modules`. Also delete the root `package.json`/`package-lock.json` unless the workspace is needed (the Dockerfile and scripts don't use it).

**R2 (Low). The shell scripts aren't executable in git** (mode 100644), although Part 2 says they are. Run `git update-index --chmod=+x scripts/*.sh`.

**R3 (Low). The Docker image runs as root.** Add a non-root `USER` in the runner stage.

**R4 (Low). Stale docs.**
- `backend/AGENTS.md` lists the board and AI endpoints as "Future".
- `docs/DATABASE.md` omits `UNIQUE (user_id)`.
- `docs/PLAN.md` Part 6 says the tests use a mocked DB (they don't), and Part 9 says the schema is enforced (see C1).
- The root `README.md` has no run instructions.

Action: update these alongside the fixes above. Keep the README minimal: start and stop scripts, and where to set `OPENAI_API_KEY`.

---

## Action plan (recommended order)

| # | Action | Findings | Effort |
|---|--------|----------|--------|
| 1 | Switch AI chat to Structured Outputs; add a live test behind a marker | C1, T2 | S |
| 2 | Move the demo board into the backend seed; remove the `fromApiBoard` fallback; show a load error | C2, C6 | S |
| 3 | Give tests their own database | T1 | S |
| 4 | Untrack `node_modules`; remove the root workspace | R1 | S |
| 5 | Lock the board while the AI is responding; fix the duplicated user message | C3, C5 | S |
| 6 | Send one save at a time; commit column renames on blur | C4, C10 | S |
| 7 | Validate unique card IDs in `BoardData` | C7 | S |
| 8 | Bind ports to localhost; remove CORS and `/api/ai/test` | S1, S2, S3 | S |
| 9 | Backend cleanup: pool plus lifespan, package imports, dead code, pyproject | B1-B7 | M |
| 10 | Frontend cleanup: emojis, theme variables, controlled `KanbanBoard`, lint/tsc clean, configs | F1-F6, C8, C9, C11 | M |
| 11 | Add the missing unit tests (AI service, 422, `page.tsx`) | T2, T3 | M |
| 12 | Docs, executable scripts, non-root Docker user | R2-R4 | S |

Effort: S = under an hour, M = a few hours.
