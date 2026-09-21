import { useState } from 'react';
import { BoardData, fromApiBoard, toApiBoard } from '@/lib/kanban';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface UseChatReturn {
  messages: ChatMessage[];
  sendMessage: (msg: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Hook to manage AI chat interactions.
 * Keeps messages in memory, handles loading/error states, and calls the backend AI endpoint.
 * If the AI response includes a board payload, calls `onBoardUpdate` to sync UI.
 */
export function useChat(board: BoardData, onBoardUpdate: (b: BoardData) => void): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const sendMessage = async (msg: string) => {
    const userMsg: ChatMessage = { role: 'user', content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history: messages.concat(userMsg),
          board: toApiBoard(board),
        }),
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(err || 'AI request failed');
      }
      const data = await response.json();
      const assistantMsg: ChatMessage = { role: 'assistant', content: data.reply };
      setMessages((prev) => [...prev, assistantMsg]);
      if (data.board) {
        onBoardUpdate(fromApiBoard(data.board));
      }
    } catch (e: any) {
      setError(e.message ?? 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  return { messages, sendMessage, loading, error, clearError };
}

