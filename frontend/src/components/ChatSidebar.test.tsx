import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ChatSidebar } from '@/components/ChatSidebar';
import { BoardData, initialData } from '@/lib/kanban';

// Mock fetch globally
global.fetch = vi.fn();

describe('ChatSidebar', () => {
  const mockBoard: BoardData = initialData;
  const onClose = vi.fn();
  const onBoardUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends a message and displays AI reply', async () => {
    // Mock API response
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reply: 'AI response', board: null }),
    });

    render(
      <ChatSidebar board={mockBoard} onClose={onClose} onBoardUpdate={onBoardUpdate} />
    );

    const input = screen.getByTestId('chat-input') as HTMLInputElement;
    const sendButton = screen.getByTestId('send-button');

    fireEvent.change(input, { target: { value: 'Hello AI' } });
    fireEvent.click(sendButton);

    await waitFor(() => expect(screen.getByText('AI response')).toBeInTheDocument());
    const requestBody = JSON.parse((fetch as any).mock.calls[0][1].body);
    expect(requestBody.board.columns[0].cards).toHaveLength(2);
    expect(onBoardUpdate).not.toHaveBeenCalled();
  });

  it('handles board update payload', async () => {
    const updatedApiBoard = {
      columns: [{
        id: mockBoard.columns[0].id,
        title: 'New Title',
        cards: [mockBoard.cards[mockBoard.columns[0].cardIds[0]]],
      }],
    };
    const updatedBoard: BoardData = {
      columns: [{
        id: mockBoard.columns[0].id,
        title: 'New Title',
        cardIds: [mockBoard.columns[0].cardIds[0]],
      }],
      cards: {
        [mockBoard.columns[0].cardIds[0]]: mockBoard.cards[mockBoard.columns[0].cardIds[0]],
      },
    };
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reply: 'Board updated', board: updatedApiBoard }),
    });

    render(
      <ChatSidebar board={mockBoard} onClose={onClose} onBoardUpdate={onBoardUpdate} />
    );

    const input = screen.getByTestId('chat-input') as HTMLInputElement;
    const sendButton = screen.getByTestId('send-button');
    fireEvent.change(input, { target: { value: 'Update board' } });
    fireEvent.click(sendButton);

    await waitFor(() => expect(screen.getByText('Board updated')).toBeInTheDocument());
    expect(onBoardUpdate).toHaveBeenCalledWith(updatedBoard);
  });

  it('displays error on failed request', async () => {
    (fetch as any).mockResolvedValueOnce({ ok: false, text: async () => 'Server error' });
    render(
      <ChatSidebar board={mockBoard} onClose={onClose} onBoardUpdate={onBoardUpdate} />
    );
    const input = screen.getByTestId('chat-input') as HTMLInputElement;
    const sendButton = screen.getByTestId('send-button');
    fireEvent.change(input, { target: { value: 'bad' } });
    fireEvent.click(sendButton);
    await waitFor(() => expect(screen.getByTestId('error-message')).toBeInTheDocument());
    expect(screen.getByText('Server error')).toBeInTheDocument();
  });
});

