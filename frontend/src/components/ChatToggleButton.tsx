type ChatToggleButtonProps = {
  onClick: () => void;
};

export const ChatToggleButton = ({ onClick }: ChatToggleButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Open AI chat"
    className="fixed bottom-6 right-6 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-blue)] text-white shadow-[var(--shadow)] transition hover:brightness-110"
  >
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" strokeLinejoin="round" />
    </svg>
  </button>
);
