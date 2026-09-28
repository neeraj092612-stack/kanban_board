import { fetchBoard, saveBoard, sendChat } from "@/lib/api";
import { toApiBoard } from "@/lib/kanban";
import { demoApiBoard, demoBoard } from "@/test/fixtures";

const mockFetch = vi.fn();
global.fetch = mockFetch;

const ok = (body: unknown) => ({ ok: true, json: async () => body });
const fail = (status: number, body: unknown = null) => ({ ok: false, status, json: async () => body });

describe("api", () => {
  beforeEach(() => mockFetch.mockReset());

  it("loads the board from the API", async () => {
    mockFetch.mockResolvedValueOnce(ok(demoApiBoard));
    await expect(fetchBoard()).resolves.toEqual(demoBoard);
    expect(mockFetch.mock.calls[0][0]).toBe("/api/board");
  });

  it("rejects with the status when loading fails", async () => {
    mockFetch.mockResolvedValueOnce(fail(500));
    await expect(fetchBoard()).rejects.toThrow("500");
  });

  it("saves the board in API shape", async () => {
    mockFetch.mockResolvedValueOnce(ok(demoApiBoard));
    await saveBoard(demoBoard);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/board");
    expect(options.method).toBe("PUT");
    expect(JSON.parse(options.body)).toEqual(toApiBoard(demoBoard));
  });

  it("rejects on network error", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(saveBoard(demoBoard)).rejects.toThrow("Failed to fetch");
  });

  it("sends chat history without the new message and converts the board", async () => {
    mockFetch.mockResolvedValueOnce(ok({ reply: "Done.", board: demoApiBoard }));
    const history = [{ role: "user" as const, content: "hi" }];
    const result = await sendChat("Add a card", history, demoBoard);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({ message: "Add a card", history, board: demoApiBoard });
    expect(result).toEqual({ reply: "Done.", board: demoBoard });
  });

  it("surfaces the server detail message on chat errors", async () => {
    mockFetch.mockResolvedValueOnce(fail(502, { detail: "Invalid AI response" }));
    await expect(sendChat("x", [], demoBoard)).rejects.toThrow("Invalid AI response");
  });
});
