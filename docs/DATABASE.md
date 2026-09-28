# Database Schema for Project Management MVP

## Overview
The MVP uses PostgreSQL from the `supabase/postgres` image, accessed directly with `asyncpg` (no Supabase APIs). It stores user accounts and one Kanban board per user. The database named in `DATABASE_URL` (default `pm`), its tables and seed data are created automatically on backend startup.

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
| `user_id` | `uuid` | `REFERENCES users(id) ON DELETE CASCADE NOT NULL`, `UNIQUE` (one board per user) |
| `data` | `jsonb` | `NOT NULL`: the board as `{"columns": [{"id", "title", "cards": [{"id", "title", "details"}]}]}` |
| `updated_at` | `timestamptz` | `DEFAULT now()` |

## Seed Data
- User `user`. The password is checked only in the frontend; the backend does not manage passwords yet.
- The demo board (`DEFAULT_BOARD` in `backend/src/database.py`): five columns (Backlog, Discovery, In Progress, Review, Done) with eight cards.

## Initialization
`init_db()` in `backend/src/database.py`:
1. Creates the database if it does not exist.
2. Creates the tables if they do not exist.
3. Inserts the default user and, only if the user has no board yet, the demo board.

It is idempotent: re-running it never duplicates rows or overwrites a saved board.
