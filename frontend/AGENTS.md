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
  - `page.tsx`: Page entry point that renders `KanbanBoard`.
  - `layout.tsx`: Global layout and metadata.
  - `globals.css`: Theme variables and global styles.
- `src/components/`
  - `KanbanBoard.tsx`: Central state container for the board. Manages drag-and-drop sensors, column renames, card additions, card deletions, and drag overlay.
  - `KanbanColumn.tsx`: Renders a column with SortableContext, column header with inline renaming, card list, and card creation trigger.
  - `KanbanCard.tsx`: Draggable card component with remove button.
  - `KanbanCardPreview.tsx`: Preview ghost card rendered inside DragOverlay during dragging.
  - `NewCardForm.tsx`: Collapsible form to enter card title and details.
- `src/lib/`
  - `kanban.ts`: Core data models (`Card`, `Column`, `BoardData`), seed data (`initialData`), pure helper functions (`moveCard`, `createId`).
  - `kanban.test.ts`: Unit tests for helper logic.
- `tests/`
  - `kanban.spec.ts`: Playwright end-to-end browser tests.

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

