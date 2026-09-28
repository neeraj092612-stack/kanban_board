import { fromApiBoard, toApiBoard, type ApiBoardData, type BoardData } from "@/lib/kanban";

export type ChatMessage = { role: "user" | "assistant"; content: string };

// Throws with the server's `detail` message when present.
const request = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? `Request failed: ${response.status}`);
  }
  return response.json();
};

export const fetchBoard = async (): Promise<BoardData> =>
  fromApiBoard(await request<ApiBoardData>("/api/board"));

export const saveBoard = async (board: BoardData): Promise<void> => {
  await request("/api/board", { method: "PUT", body: JSON.stringify(toApiBoard(board)) });
};

export const sendChat = async (
  message: string,
  history: ChatMessage[],
  board: BoardData
): Promise<{ reply: string; board: BoardData | null }> => {
  const data = await request<{ reply: string; board: ApiBoardData | null }>("/api/ai/chat", {
    method: "POST",
    body: JSON.stringify({ message, history, board: toApiBoard(board) }),
  });
  return { reply: data.reply, board: data.board && fromApiBoard(data.board) };
};
