import React from 'react';

interface ChatToggleButtonProps {
  onClick: () => void;
}

export const ChatToggleButton: React.FC<ChatToggleButtonProps> = ({ onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#209dd7] text-white shadow-lg hover:bg-[#1a86c2]"
      aria-label="Open AI chat sidebar"
    >
      💬
    </button>
  );
};

