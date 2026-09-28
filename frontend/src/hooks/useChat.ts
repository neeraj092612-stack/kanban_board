import { useState } from "react";
import { sendChat, type ChatMessage } from "@/lib/api";
import type { BoardData } from "@/lib/kanban";

/**
 * AI chat state. Sends the message with prior history and the current board;
 * when the AI changed the board (already saved by the server), calls onBoardUpdate.
 */
export function useChat(board: BoardData | null, onBoardUpdate: (board: BoardData) => void) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (message: string) => {
    if (!board) return;
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setLoading(true);
    setError(null);
    try {
      const result = await sendChat(message, messages, board);
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
      if (result.board) onBoardUpdate(result.board);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return { messages, sendMessage, loading, error, clearError: () => setError(null) };
}
