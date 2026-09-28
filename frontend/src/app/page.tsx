"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { LoginForm } from "@/components/LoginForm";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatToggleButton } from "@/components/ChatToggleButton";
import { useChat } from "@/hooks/useChat";
import { fetchBoard, saveBoard } from "@/lib/api";
import type { BoardData } from "@/lib/kanban";
import { clearStoredUser, getStoredUser, setStoredUser, subscribeToUser } from "@/lib/auth";

const noopSubscribe = () => () => {};

export default function Home() {
  // false during prerender and hydration, true once running in the browser.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const user = useSyncExternalStore(subscribeToUser, getStoredUser, () => null);

  const [board, setBoard] = useState<BoardData | null>(null);
  // Last board confirmed by the server; saving happens whenever board differs from it.
  const [savedBoard, setSavedBoard] = useState<BoardData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const saving = useRef(false);

  const loadBoard = useCallback(() => {
    fetchBoard()
      .then((loaded) => {
        setBoard(loaded);
        setSavedBoard(loaded);
        setLoadError(null);
      })
      .catch((error: Error) => setLoadError(error.message));
  }, []);

  useEffect(() => {
    if (user) loadBoard();
  }, [user, loadBoard]);

  // One save in flight at a time; when it lands, savedBoard changes and this
  // effect runs again to send any newer board.
  useEffect(() => {
    if (!board || !savedBoard || board === savedBoard || saving.current) return;
    saving.current = true;
    saveBoard(board)
      .then(() => {
        saving.current = false;
        setSaveFailed(false);
        setSavedBoard(board);
      })
      .catch(() => {
        saving.current = false;
        setSaveFailed(true);
      });
  }, [board, savedBoard]);

  // The chat endpoint has already saved the AI's board.
  const handleAiBoard = (aiBoard: BoardData) => {
    setBoard(aiBoard);
    setSavedBoard(aiBoard);
  };
  const chat = useChat(board, handleAiBoard);

  const handleLogout = () => {
    clearStoredUser();
    setBoard(null);
    setSavedBoard(null);
  };

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary-blue)] border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <LoginForm onLogin={setStoredUser} />;
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm font-semibold text-[var(--navy-dark)]" data-testid="load-error">
          Could not load your board: {loadError}
        </p>
        <button
          type="button"
          onClick={loadBoard}
          className="rounded-full bg-[var(--purple-secondary)] px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--gray-text)]">
        Loading board...
      </div>
    );
  }

  const saveStatus = saveFailed ? "Save failed" : board === savedBoard ? "Saved" : "Saving...";

  return (
    <>
      <KanbanBoard
        board={board}
        onBoardChange={(update) => setBoard((prev) => prev && update(prev))}
        user={user}
        onLogout={handleLogout}
        saveStatus={saveStatus}
        locked={chat.loading}
      />
      {!showChat && <ChatToggleButton onClick={() => setShowChat(true)} />}
      <ChatSidebar
        open={showChat}
        messages={chat.messages}
        loading={chat.loading}
        error={chat.error}
        onSend={chat.sendMessage}
        onDismissError={chat.clearError}
        onClose={() => setShowChat(false)}
      />
    </>
  );
}
