# Backend Architecture and Conventions

## Overview
FastAPI backend for the Project Management MVP. Serves the API endpoints for board state, authentication, AI operations, and serves the static frontend at `/`.

## Environment and Dependency Management
- Package manager: uv
- Configuration: `backend/pyproject.toml`
- Lockfile: `backend/uv.lock`
- Python version: 3.12+ (managed by uv)

## Key Endpoints
- `GET /api/health`: Health check endpoint returning `{"status": "ok"}`.
- `GET /`: Serves static web application files from `backend/static/`.
- Future endpoints:
  - `GET /api/board`: Fetch user Kanban board from Supabase.
  - `PUT /api/board`: Save user Kanban board to Supabase.
  - `POST /api/ai/test`: Connectivity test with OpenAI.
  - `POST /api/ai/chat`: AI chat interaction with Structured Outputs.

## Testing
- Framework: pytest with pytest-asyncio and httpx
- Run tests:
  ```bash
  uv run pytest
  ```