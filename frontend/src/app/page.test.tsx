import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";
import { setStoredUser } from "@/lib/auth";
import { demoApiBoard } from "@/test/fixtures";

const mockFetch = vi.fn();
global.fetch = mockFetch;

const ok = (body: unknown) => ({ ok: true, json: async () => body });
const calls = (method: string) =>
  mockFetch.mock.calls.filter(([, init]) => (init?.method ?? "GET") === method);

describe("Home", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    localStorage.clear();
    setStoredUser("user");
  });

  it("shows the login form when signed out", () => {
    localStorage.clear();
    render(<Home />);
    expect(screen.getByRole("heading", { name: "Sign In" })).toBeInTheDocument();
  });

  it("shows a load error and retries", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ detail: "db down" }) });
    render(<Home />);
    expect(await screen.findByTestId("load-error")).toHaveTextContent("db down");

    mockFetch.mockResolvedValueOnce(ok(demoApiBoard));
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Align roadmap themes")).toBeInTheDocument();
    expect(calls("PUT")).toHaveLength(0);
  });

  it("saves edits and reports save status", async () => {
    mockFetch.mockResolvedValueOnce(ok(demoApiBoard));
    render(<Home />);
    await screen.findByText("Align roadmap themes");
    expect(screen.getByTestId("save-status")).toHaveTextContent("Saved");

    mockFetch.mockResolvedValueOnce(ok({}));
    await userEvent.click(screen.getByRole("button", { name: "Delete Align roadmap themes" }));
    await waitFor(() => expect(calls("PUT")).toHaveLength(1));
    const saved = JSON.parse(calls("PUT")[0][1].body);
    expect(saved.columns[0].cards.map((card: { id: string }) => card.id)).toEqual(["card-2"]);
    await waitFor(() => expect(screen.getByTestId("save-status")).toHaveTextContent("Saved"));
  });

  it("shows save failure", async () => {
    mockFetch.mockResolvedValueOnce(ok(demoApiBoard));
    render(<Home />);
    await screen.findByText("Align roadmap themes");
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => null });
    await userEvent.click(screen.getByRole("button", { name: "Delete Align roadmap themes" }));
    await waitFor(() => expect(screen.getByTestId("save-status")).toHaveTextContent("Save failed"));
  });

  it("applies AI board updates without saving them again and locks the board meanwhile", async () => {
    mockFetch.mockResolvedValueOnce(ok(demoApiBoard));
    render(<Home />);
    await screen.findByText("Align roadmap themes");

    const aiBoard = structuredClone(demoApiBoard);
    aiBoard.columns[0].cards.push({ id: "card-ai", title: "AI card", details: "" });
    let respond: (value: unknown) => void = () => {};
    mockFetch.mockReturnValueOnce(new Promise((resolve) => (respond = resolve)));

    await userEvent.click(screen.getByRole("button", { name: "Open AI chat" }));
    await userEvent.type(screen.getByTestId("chat-input"), "Add AI card");
    await userEvent.click(screen.getByTestId("send-button"));
    expect(screen.getByTestId("board-columns")).toBeDisabled();

    respond(ok({ reply: "Added.", board: aiBoard }));
    const backlog = screen.getByTestId("column-col-backlog");
    expect(await within(backlog).findByText("AI card")).toBeInTheDocument();
    expect(screen.getByTestId("board-columns")).not.toBeDisabled();
    expect(screen.getByText("Added.")).toBeInTheDocument();
    expect(calls("PUT")).toHaveLength(0);
  });
});
