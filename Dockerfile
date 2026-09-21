# Stage 1: Build frontend static assets
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: Backend runner with uv and static assets
FROM python:3.12-slim AS runner

# Install uv
COPY --from=ghcr.io/astral-sh/uv:0.11.7 /uv /uvx /bin/

WORKDIR /app

# Copy dependency files
COPY backend/pyproject.toml backend/uv.lock /app/

# Install backend dependencies using uv
RUN uv sync --frozen --no-dev

# Copy backend source code. main.py imports modules from src at runtime.
COPY backend/main.py /app/main.py
COPY backend/src /app/src

# Copy static frontend export from builder stage
COPY --from=frontend-builder /app/frontend/out /app/static

ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
