# Supabase Database Schema for Project Management MVP

## Overview
The MVP uses a **Supabase** (PostgreSQL) database to store user accounts and a single Kanban board per user. Tables are automatically created on backend startup if they do not exist.

## Tables

### `users`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | `PRIMARY KEY`, default `gen_random_uuid()` |
| `username` | `text` | `UNIQUE NOT NULL` |
| `created_at` | `timestamptz` | `DEFAULT now()` |

### `boards`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | `PRIMARY KEY`, default `gen_random_uuid()` |
| `user_id` | `uuid` | `REFERENCES users(id) ON DELETE CASCADE NOT NULL` |
| `data` | `jsonb` | `NOT NULL` – stores the board JSON (columns, cards, etc.) |
| `updated_at` | `timestamptz` | `DEFAULT now()` |

## Seed Data
A default user is created for the MVP:
- **username**: `user`
- **password**: stored only in the frontend (hard‑coded) – the backend does not manage passwords yet.

The default board for this user contains five columns (`Backlog`, `To Do`, `In Progress`, `Review`, `Done`) with no cards. The JSON structure matches the `BoardData` Pydantic model used in the API.

## Initialization
The backend provides a helper `init_db()` (see `backend/src/database.py`) that:
1. Creates the tables if they do not exist.
2. Inserts the default user if missing.
3. Inserts the default board for that user if missing.

All operations are **idempotent** – running `init_db()` multiple times will not duplicate rows or violate constraints.

