# Project Implementation Plan: Project Management MVP

## Execution Rules
1. Testing Gate: Each stage must pass its individual unit tests and integration tests before proceeding to the next stage.
2. No Emojis: Do not include emojis in code, UI text, logs, commit messages, or documentation.
3. Simplicity: Keep implementations minimal and idiomatic. Avoid over-engineering and unnecessary defensive code.
4. Root Cause Analysis: If an issue arises during testing, diagnose and prove the root cause before applying fixes.
5. User Sign-off: Implementation must not start until the user reviews and confirms this plan.

---

## Stage-by-Stage Plan

### Part 1: Plan and Baseline Documentation
Establish detailed execution plan, document existing frontend architecture, and verify baseline environment.

- [x] Review AGENTS.md, docs/PLAN.md, and frontend codebase.
- [x] Create `frontend/AGENTS.md` describing existing Next.js structure, components, data models, and styling.
- [x] Update `docs/PLAN.md` with granular checklists, unit tests, integration tests, and transition gates.
- [x] User approval obtained on implementation plan.
- [x] Run baseline unit tests (6/6 passed).
- [x] Run baseline integration tests (3/3 passed).

#### Unit Testing
- Install frontend dependencies (`npm install` or `npm ci` in `frontend/`).
- Run Vitest unit tests: `npm run test:unit`.
- Criteria: 100% of unit tests pass.

#### Integration Testing
- Run Playwright E2E tests: `npm run test:e2e`.
- Criteria: Baseline E2E tests pass against local frontend dev server.

#### Stage Gate
- All Part 1 checklist tasks complete and baseline tests green. Explicit user confirmation received before proceeding to Part 2.

---

### Part 2: Scaffolding (FastAPI Backend, Docker & Supabase Setup, Start/Stop Scripts)
Set up the Python backend with `uv`, Docker infrastructure with Supabase local database, and cross-platform start/stop scripts.

- [x] Initialize Python FastAPI project in `backend/` managed by `uv` (`pyproject.toml`).
- [x] Implement minimal FastAPI app with `/api/health` endpoint and static file placeholder at `/`.
- [x] Create Docker setup (using `uv` for python dependencies) orchestrating FastAPI and local Supabase database.
- [x] Create start and stop scripts in `scripts/`:
  - `start-server.sh` and `stop-server.sh` for macOS / Linux (executable permissions).
  - `start-server.bat` and `stop-server.bat` (and PowerShell `.ps1` variants) for Windows.
- [x] Update `backend/AGENTS.md` and `scripts/AGENTS.md` with operational instructions.
- [x] Run backend unit tests with pytest (2/2 passed).
- [x] Run container start/stop integration tests with healthcheck and clean shutdown.

#### Unit Testing
- Run backend unit tests with `pytest` inside `backend/` verifying:
  - `GET /api/health` returns `{"status": "ok"}`.
  - Root route `/` returns status 200 with initial HTML placeholder.
- Criteria: `pytest` passes with zero failures.

#### Integration Testing
- Execute platform start script (`scripts/start-server.bat` on Windows or `scripts/start-server.sh` on Unix) to build and start the Docker container stack.
- Query `http://localhost:8000/api/health` via HTTP client and verify status 200 with expected JSON.
- Verify Supabase local database service is reachable.
- Execute platform stop script and verify all containers stop cleanly without orphaned processes.
- Criteria: Stack builds, starts, serves health endpoint, connects to Supabase local, and stops via scripts.

#### Stage Gate
- Containerized scaffolding and Supabase local service pass all tests. User confirmation to proceed to Part 3.

---

### Part 3: Add in Frontend (Static Build and FastAPI Static Serving)
Statically build the Next.js frontend and serve it from FastAPI at `/`.

- [x] Configure `frontend/next.config.ts` for static export (`output: 'export'`).
- [x] Verify frontend build produces static assets in `out/` via `npm run build`.
- [x] Update Docker build to multi-stage:
  - Stage 1: Build frontend static files with Node.
  - Stage 2: Copy static build into FastAPI static folder and serve at `/`.
- [x] Configure FastAPI to serve static files with fallback to `index.html` for client routing.
- [x] Run frontend unit tests (6/6 passed).
- [x] Run backend unit tests (3/3 passed).
- [x] Run Playwright integration tests against containerized deployment at http://localhost:8000 (3/3 passed).

#### Unit Testing
- Frontend unit tests: `npm run test:unit` inside `frontend/`.
- Backend unit tests: `pytest` verifying FastAPI serves `index.html` and static assets (CSS, JS) with appropriate MIME types.
- Criteria: All unit tests pass.

#### Integration Testing
- Start container stack using `scripts/start-server.*`.
- Load `http://localhost:8000` in browser / headless HTTP client and verify Kanban board HTML and CSS load correctly.
- Run Playwright tests against `http://localhost:8000` to verify card rendering, column titles, and drag/drop functionality in the containerized deployment.
- Criteria: Full Kanban board functions inside Docker served through FastAPI.

#### Stage Gate
- Static export and FastAPI static serving pass all tests. User confirmation to proceed to Part 4.

---

### Part 4: Add User Sign-in Experience
Add client-side authentication gate requiring hardcoded credentials (`user` / `password`).

- [x] Create Login component styled with project palette (`#032147`, `#209dd7`, `#753991`, `#ecad0a`, `#888888`).
- [x] Add session state management:
  - Prompt user for username and password.
  - Validate against `user` and `password`.
  - Persist session (e.g. `sessionStorage` or `localStorage`).
- [x] Gate Kanban board: unauthenticated visitors see Login screen; authenticated users see Kanban board.
- [x] Add Logout button in Kanban header that clears session and returns to Login screen.

#### Unit Testing
- Frontend unit tests for Login component:
  - Rejects incorrect credentials with error message.
  - Accepts `user` and `password` and triggers authenticated state.
  - Logout action resets authentication state.
- Criteria: All unit tests in Vitest pass.

#### Integration Testing
- Playwright E2E test:
  1. Navigate to `http://localhost:8000` -> Login screen is displayed; board is hidden.
  2. Enter invalid credentials -> error displayed, board remains hidden.
  3. Enter `user` / `password` -> redirected to Kanban board.
  4. Reload page -> session persists.
  5. Click Logout -> returns to Login screen.
- Criteria: Authentication flow verified end-to-end.

#### Stage Gate
- Sign-in and logout flows pass all unit and E2E tests. User confirmation to proceed to Part 5.

---

### Part 5: Database Modeling
Design Supabase PostgreSQL schema to store user boards as JSON, supporting single board for MVP and multi-user for future.

- [x] Design Supabase schema:
  - Table `users`: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `username TEXT UNIQUE NOT NULL`, `created_at TIMESTAMPTZ DEFAULT now()`.
  - Table `boards`: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `user_id UUID REFERENCES users(id) ON DELETE CASCADE`, `data JSONB NOT NULL`, `updated_at TIMESTAMPTZ DEFAULT now()`.
- [x] Document database design and migration rationale in `docs/DATABASE.md`.
- [x] Create seed definition for default user `user` with initial Kanban board data.
- [x] Obtain user approval on database design.

#### Unit Testing
- Standalone Python test script verifying:
  - Supabase database table creation and constraints.
  - Insertion and query of valid `BoardData` JSONB.
  - Foreign key constraint enforcement.
- Criteria: Schema creation and JSONB serialization/deserialization tests pass.

#### Integration Testing
- Test database initialization function against Supabase local instance: creates tables and seeds default user board if they do not exist.
- Verify idempotency: running initialization multiple times does not corrupt or duplicate data.
- Criteria: Supabase database initialization passes cleanly.

#### Stage Gate
- Schema documented and verified. User confirmation to proceed to Part 6.

---

### Part 6: Backend Kanban API & Supabase Persistence
Implement FastAPI endpoints to read and update board data, creating Supabase database tables automatically on startup if missing.

- [x] Define Pydantic models for `Card`, `Column`, and `BoardData`.
- [x] Implement database service module in `backend/` using Supabase client (`supabase-py`) or direct PostgreSQL connection.
- [x] Add API routes:
  - `GET /api/board`: Returns current user's Kanban board from Supabase.
  - `PUT /api/board`: Validates and saves updated board JSON to Supabase.
- [x] Configure automatic database table and seed initialization if not present upon app startup.

#### Unit Testing
- Backend `pytest` suite with mocked database client:
  - `GET /api/board` returns initial 5 columns and seed cards.
  - `PUT /api/board` updates board data and returns updated payload.
  - Malformed payload to `PUT /api/board` returns status 422 with validation error.
- Criteria: 100% backend test coverage on board endpoints.

#### Integration Testing
- API integration test with `httpx` against running Supabase database:
  1. Fetch board via `GET /api/board`.
  2. Modify a column title and send `PUT /api/board`.
  3. Restart backend service.
  4. Fetch board again via `GET /api/board` and confirm modified column title persisted in Supabase across service restart.
- Criteria: Board persistence verified across process restarts in Supabase.

#### Stage Gate
- Backend board API and Supabase persistence tests pass completely. User confirmation to proceed to Part 7.

---

### Part 7: Frontend and Backend Integration (with Card Editing)
Connect frontend to FastAPI backend for live persistence, and add card editing functionality.

- [x] Add card editing UI in `KanbanCard.tsx`:
  - Allow editing card title and details (inline edit or modal/popover).
  - Matches project color scheme and no emojis.
- [x] Connect frontend to backend API:
  - Fetch board data from `GET /api/board` on initial load after login.
  - Sync board updates (move card, add card, delete card, edit card, rename column) to backend via `PUT /api/board`.
- [x] Add visual save state indicator (e.g. "Saved", "Saving...").

#### Unit Testing
- Frontend unit tests:
  - Card editing interaction: user can update title and details.
  - API client functions handle success and network error states.
- Criteria: Vitest unit tests pass.

#### Integration Testing
- Playwright E2E test:
  1. Login as `user`.
  2. Add a new card to "Backlog".
  3. Edit card title and details.
  4. Move card from "Backlog" to "In Progress".
  5. Rename column "In Progress" to "Active Development".
  6. Reload browser.
  7. Verify newly added card, edited details, new position, and renamed column are all preserved from Supabase.
- Criteria: Full board editing and persistence loop verified end-to-end in browser.

#### Stage Gate
- Frontend and backend integration tests pass. User confirmation to proceed to Part 8.

---

### Part 8: AI Connectivity
Configure OpenAI client with `.env` credentials and model `openai/gpt-oss-120b`, verifying basic API connectivity.

- [x] Add `openai` client package to backend `pyproject.toml` managed by `uv`.
- [x] Create AI service module in `backend/` loading `OPENAI_API_KEY` from `.env`.
- [x] Configure target model `openai/gpt-oss-120b`.
- [x] Add test endpoint `POST /api/ai/test` performing a simple "What is 2+2?" prompt.

#### Unit Testing
- Backend unit test with mocked OpenAI client verifying:
  - Correct client initialization.
  - Handling of missing or invalid API keys.
  - Graceful error response formatting.
- Criteria: Unit tests pass without external network call.

#### Integration Testing
- Execute live integration test against `POST /api/ai/test` using the `.env` API key.
- Verify the response status is 200 and the model output answers the prompt (contains "4").
- Criteria: Live connectivity with `openai/gpt-oss-120b` verified.

#### Stage Gate
- AI connectivity verified with live model. User confirmation to proceed to Part 9.

---

### Part 9: AI Structured Outputs for Kanban Operations
Enable the AI to accept board state, conversation history, and user requests, returning Structured Outputs with conversational replies and optional board updates.

- [x] Define Pydantic schema for Structured Output:
  - `reply`: message text to the user.
  - `board`: optional `BoardData` structure reflecting any card creation, edit, move, or column changes.
- [x] Implement endpoint `POST /api/ai/chat`:
  - Accepts `{ message: string, history: list, board: BoardData }`.
  - Sends system instructions and board JSON to `openai/gpt-oss-120b`.
  - Enforces structured JSON output matching schema.
- [x] Persist updated board in Supabase if AI modifies board.
- [x] Return structured response `{ reply: string, board: BoardData | null }`.

#### Unit Testing
- Backend unit tests with mocked LLM responses:
  - Validates schema parsing when AI only responds with text.
  - Validates schema parsing and persistence when AI modifies cards/columns.
  - Validates rejection of malformed board mutations.
- Criteria: Pytest suite passes all structured output test cases.

#### Integration Testing
- Run integration test with live model:
  - Send message: "Add a card to Backlog called 'Automated Test Card' with details 'Created via AI'."
  - Verify `reply` contains conversational confirmation.
  - Verify `board` contains the new card in the "Backlog" column.
  - Send follow-up: "Move 'Automated Test Card' to Done."
  - Verify updated board shows the card in "Done".
- Criteria: Live AI board manipulation passes validation and persists to Supabase.

#### Stage Gate
- AI structured outputs and board mutation logic pass all tests. User confirmation to proceed to Part 10.

---

### Part 10: AI Chat Sidebar Widget and Auto-Refresh
Build the AI chat sidebar in the frontend, integrate it with the chat endpoint, and auto-refresh the Kanban board when the AI updates it.

- [x] Build `ChatSidebar.tsx` matching project colors (`#032147` header, `#753991` send button, `#209dd7` highlights, `#888888` timestamps/subtitles).
- [x] Provide sidebar toggle button (open/collapse) in the Kanban board layout.
- [x] Maintain chat history in UI state.
- [x] On AI response:
  - Append AI message to chat history.
  - If `board` payload is present, update board state immediately in UI without manual page reload.
- [x] Handle loading states, disable inputs during requests, and display error messages cleanly.

#### Unit Testing
- Frontend unit tests for `ChatSidebar`:
  - Toggle open/close behavior.
  - Sending message appends to chat list and invokes API client.
  - Loading state disables submit button.
  - Board refresh callback triggered upon receiving updated board payload.
- Criteria: All Vitest unit tests pass.

#### Integration Testing
- Full end-to-end integration test with Playwright running in Docker:
  1. Login as `user`.
  2. Open AI chat sidebar.
  3. Send: "Create a card called 'Release v1.0' in Review column with details 'Ready for signoff'."
  4. Wait for AI response in chat.
  5. Verify "Release v1.0" card appears in "Review" column on the Kanban board automatically.
  6. Reload page and confirm persisted card from Supabase.
  7. Verify start and stop scripts work cleanly on the target platform.
- Criteria: End-to-end workflow functions flawlessly inside Docker.

#### Stage Gate
- Full MVP acceptance criteria met. Project complete.