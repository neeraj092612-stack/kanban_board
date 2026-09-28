"use client";

import { useState } from "react";
import clsx from "clsx";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  rectIntersection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "@/components/KanbanColumn";
import { KanbanCardPreview } from "@/components/KanbanCardPreview";
import { createId, moveCard, type BoardData } from "@/lib/kanban";

type KanbanBoardProps = {
  board: BoardData;
  onBoardChange: (update: (board: BoardData) => BoardData) => void;
  user?: string;
  onLogout?: () => void;
  saveStatus?: string;
  // Disables editing, e.g. while the AI is working on the board.
  locked?: boolean;
};

export const KanbanBoard = ({
  board,
  onBoardChange: setBoard,
  user,
  onLogout,
  saveStatus,
  locked = false,
}: KanbanBoardProps) => {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);
    if (!over || active.id === over.id) return;
    setBoard(prev => ({
      ...prev,
      columns: moveCard(prev.columns, active.id as string, over.id as string),
    }));
  };

  const handleRenameColumn = (columnId: string, title: string) => {
    setBoard(prev => ({
      ...prev,
      columns: prev.columns.map(col =>
        col.id === columnId ? { ...col, title } : col
      ),
    }));
  };

  const handleAddCard = (columnId: string, title: string, details: string) => {
    const id = createId("card");
    setBoard(prev => ({
      ...prev,
      cards: {
        ...prev.cards,
        [id]: { id, title, details },
      },
      columns: prev.columns.map(col =>
        col.id === columnId ? { ...col, cardIds: [...col.cardIds, id] } : col
      ),
    }));
  };

  const handleEditCard = (cardId: string, title: string, details: string) => {
    setBoard(prev => ({
      ...prev,
      cards: { ...prev.cards, [cardId]: { id: cardId, title, details } },
    }));
  };

  const handleDeleteCard = (columnId: string, cardId: string) => {
    setBoard(prev => ({
      ...prev,
      cards: Object.fromEntries(
        Object.entries(prev.cards).filter(([id]) => id !== cardId)
      ),
      columns: prev.columns.map(col =>
        col.id === columnId
          ? { ...col, cardIds: col.cardIds.filter(id => id !== cardId) }
          : col
      ),
    }));
  };

  const activeCard = activeCardId ? board.cards[activeCardId] : null;

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.25)_0%,_rgba(32,157,215,0.05)_55%,_transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.18)_0%,_rgba(117,57,145,0.05)_55%,_transparent_75%)]" />
      <main className="relative mx-auto flex min-h-screen max-w-[1500px] flex-col gap-10 px-6 pb-16 pt-12">
        <header className="flex flex-col gap-6 rounded-[32px] border border-[var(--stroke)] bg-white/80 p-8 shadow-[var(--shadow)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">Single Board Kanban</p>
              <h1 className="mt-3 font-display text-4xl font-semibold text-[var(--navy-dark)]">Kanban Studio</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--gray-text)]">
                Keep momentum visible. Rename columns, drag cards between stages, and capture quick notes without getting buried in settings.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--gray-text)]">Focus</p>
                <p className="mt-2 text-lg font-semibold text-[var(--primary-blue)]">One board. Five columns. Zero clutter.</p>
              </div>
              {user && onLogout && (
                <div className="flex flex-col items-start justify-between gap-2 rounded-2xl border border-[var(--stroke)] bg-white px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--gray-text)]">Account</p>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-[var(--navy-dark)]">{user}</span>
                    {saveStatus && (
                      <span data-testid="save-status" className="text-xs font-semibold text-[var(--gray-text)]">
                        {saveStatus}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={onLogout}
                      data-testid="logout-button"
                      className="rounded-xl border border-[var(--stroke)] px-3 py-1 text-xs font-semibold text-[var(--navy-dark)] transition hover:bg-[var(--surface-strong)]"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {board.columns.map(column => (
              <div key={column.id} className="flex items-center gap-2 rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--navy-dark)]">
                <span className="h-2 w-2 rounded-full bg-[var(--accent-yellow)]" />
                {column.title}
              </div>
            ))}
          </div>
        </header>
        <DndContext sensors={sensors} collisionDetection={rectIntersection} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <fieldset
            disabled={locked}
            aria-busy={locked}
            data-testid="board-columns"
            className={clsx("grid min-w-0 gap-6 lg:grid-cols-5", locked && "pointer-events-none opacity-60")}
          >
            {board.columns.map(column => (
              <KanbanColumn
                key={column.id}
                column={column}
                cards={column.cardIds.map(cardId => board.cards[cardId])}
                onRename={handleRenameColumn}
                onAddCard={handleAddCard}
                onEditCard={handleEditCard}
                onDeleteCard={handleDeleteCard}
              />
            ))}
          </fieldset>
          <DragOverlay>
            {activeCard && (
              <div className="w-[260px]">
                <KanbanCardPreview card={activeCard} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </main>
    </div>
  );
};
