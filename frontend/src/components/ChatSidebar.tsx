import React, { useState, FormEvent } from 'react';
import { BoardData } from '@/lib/kanban';
import { useChat } from '@/hooks/useChat';

interface ChatSidebarProps {
  board: BoardData;
  onClose: () => void;
  onBoardUpdate: (newBoard: BoardData) => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ board, onClose, onBoardUpdate }) => {
  const { messages, sendMessage, loading, error, clearError } = useChat(board, onBoardUpdate);
  const [input, setInput] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    await sendMessage(input);
    setInput('');
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[320px] bg-white shadow-lg p-4 flex flex-col" role="dialog" aria-modal="true">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold" style={{ color: '#032147' }}>
          AI Assistant
        </h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto mb-4" data-testid="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`mb-2 ${msg.role === 'assistant' ? 'text-right' : ''}`}>
            <span className="inline-block px-3 py-1 rounded" style={{
              backgroundColor: msg.role === 'assistant' ? '#209dd7' : '#f0f0f0',
              color: msg.role === 'assistant' ? '#fff' : '#000',
            }}>
              {msg.content}
            </span>
          </div>
        ))}
        {loading && (
          <div className="text-sm text-gray-500" data-testid="loading-indicator">Thinking...</div>
        )}
        {error && (
          <div className="text-sm text-red-600" data-testid="error-message">
            {error}
            <button onClick={clearError} className="ml-2 underline">Dismiss</button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border border-gray-300 rounded-l px-2 py-1 focus:outline-none"
          placeholder="Ask AI..."
          disabled={loading}
          data-testid="chat-input"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-[#753991] text-white px-4 py-1 rounded-r hover:bg-[#5c2e73]"
          data-testid="send-button"
        >
          Send
        </button>
      </form>
    </div>
  );
};

