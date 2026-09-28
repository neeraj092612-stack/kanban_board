# Frontend Architecture and Conventions

## Overview
The frontend is a single-board Kanban web application built with Next.js (App Router), React, and Tailwind CSS. It allows users to view columns, drag and drop cards between columns or reorder within a column, rename columns, add new cards, and remove cards.

## Tech Stack
- Framework: Next.js 16 (App Router)
- UI Library: React 19
- Styling: Tailwind CSS v4 with custom CSS variables in `src/app/globals.css`
- Drag and Drop: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- Unit Testing: Vitest, React Testing Library, jsdom
- End-to-End Testing: Playwright

## Directory Structure
- `src/app/`
  - `page.tsx`: Page entry point. Owns auth gating, board state (load, load error with retry, one-at-a-time saves, save status) and chat state; locks the board while the AI responds.
  - `layout.tsx`: Global layout and metadata.
  - `globals.css`: Theme variables and global styles.
- `src/components/`
  - `KanbanBoard.tsx`: Controlled board (`board`, `onBoardChange`, `locked`). Manages drag-and-drop sensors, card add/edit/delete, column renames, and drag overlay.
  - `KanbanColumn.tsx`: Renders a column with SortableContext, a title input that commits on blur or Enter, card list, and card creation trigger.
  - `KanbanCard.tsx`: Draggable card with inline edit form (drag disabled while editing) and remove button.
  - `KanbanCardPreview.tsx`: Preview ghost card rendered inside DragOverlay during dragging.
  - `NewCardForm.tsx`: Collapsible form to enter card title and details.
  - `ChatSidebar.tsx` / `ChatToggleButton.tsx`: Presentational AI chat panel and its open button.
- `src/hooks/useChat.ts`: Chat messages, loading and error state; calls `sendChat`.
- `src/lib/`
  - `kanban.ts`: Data models (`Card`, `Column`, `BoardData`, `ApiBoardData`), shape conversion, pure helpers (`moveCard`, `createId`).
  - `api.ts`: `fetchBoard`, `saveBoard`, `sendChat`; errors carry the server `detail` message.
  - `auth.ts`: Hardcoded credential check and a localStorage-backed user store for `useSyncExternalStore`.
- `src/test/fixtures.ts`: Demo board mirroring the backend seed, shared by unit and E2E tests.
- `tests/`
  - `kanban.spec.ts`: Playwright tests against the running app (default `http://127.0.0.1:8000`); each test resets the stored board. Includes one live AI test.

## Theme & Color Palette
- Accent Yellow: `#ecad0a` (`--accent-yellow`)
- Blue Primary: `#209dd7` (`--primary-blue`)
- Purple Secondary: `#753991` (`--purple-secondary`)
- Dark Navy: `#032147` (`--navy-dark`)
- Gray Text: `#888888` (`--gray-text`)

## Rules & Coding Standards
- No emojis anywhere in UI text or logs.
- Keep components focused and simple; avoid over-engineering.
- Preserve existing styling and responsive layout.

