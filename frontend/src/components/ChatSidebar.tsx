import { useState, type FormEvent } from "react";
import clsx from "clsx";
import type { ChatMessage } from "@/lib/api";

type ChatSidebarProps = {
  open: boolean;
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  onSend: (message: string) => void;
  onDismissError: () => void;
  onClose: () => void;
};

export const ChatSidebar = ({
  open,
  messages,
  loading,
  error,
  onSend,
  onDismissError,
  onClose,
}: ChatSidebarProps) => {
  const [input, setInput] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <aside
      aria-label="AI Assistant"
      hidden={!open}
      className="fixed inset-y-0 right-0 z-40 flex w-[340px] flex-col border-l border-[var(--stroke)] bg-white p-5 shadow-[var(--shadow)]"
    >
      <div className="mb-4 flex items-center justify-between border-b-2 border-[var(--accent-yellow)] pb-3">
        <h2 className="font-display text-lg font-semibold text-[var(--navy-dark)]">AI Assistant</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="rounded-full border border-[var(--stroke)] px-3 py-1 text-xs font-semibold text-[var(--gray-text)] transition hover:text-[var(--navy-dark)]"
        >
          Close
        </button>
      </div>

      <div className="mb-4 flex flex-1 flex-col gap-2 overflow-y-auto" data-testid="chat-messages">
        {messages.length === 0 && (
          <p className="text-sm text-[var(--gray-text)]">Ask me to create, edit, or move cards.</p>
        )}
        {messages.map((message, index) => (
          <p
            key={index}
            className={clsx(
              "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
              message.role === "assistant"
                ? "self-start bg-[var(--primary-blue)] text-white"
                : "self-end bg-[var(--surface)] text-[var(--navy-dark)]"
            )}
          >
            {message.content}
          </p>
        ))}
        {loading && (
          <p className="text-sm text-[var(--gray-text)]" data-testid="loading-indicator">
            Thinking...
          </p>
        )}
        {error && (
          <div className="text-sm text-red-700" data-testid="error-message">
            {error}
            <button type="button" onClick={onDismissError} className="ml-2 underline">
              Dismiss
            </button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask AI..."
          disabled={loading}
          aria-label="Message"
          data-testid="chat-input"
          className="flex-1 rounded-xl border border-[var(--stroke)] px-3 py-2 text-sm text-[var(--navy-dark)] outline-none focus:border-[var(--primary-blue)]"
        />
        <button
          type="submit"
          disabled={loading}
          data-testid="send-button"
          className="rounded-xl bg-[var(--purple-secondary)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110 disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </aside>
  );
};
