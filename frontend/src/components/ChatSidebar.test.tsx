import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatSidebar } from "@/components/ChatSidebar";

const props = {
  open: true,
  messages: [],
  loading: false,
  error: null,
  onSend: vi.fn(),
  onDismissError: vi.fn(),
  onClose: vi.fn(),
};

describe("ChatSidebar", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends the trimmed message and clears the input", async () => {
    render(<ChatSidebar {...props} />);
    const input = screen.getByTestId("chat-input");
    await userEvent.type(input, "  Add a card  ");
    await userEvent.click(screen.getByTestId("send-button"));
    expect(props.onSend).toHaveBeenCalledWith("Add a card");
    expect(input).toHaveValue("");
  });

  it("renders messages, loading state, and errors", async () => {
    render(
      <ChatSidebar
        {...props}
        loading
        error="Invalid AI response"
        messages={[
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi there" },
        ]}
      />
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("Hi there")).toBeInTheDocument();
    expect(screen.getByTestId("loading-indicator")).toBeInTheDocument();
    expect(screen.getByTestId("send-button")).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(props.onDismissError).toHaveBeenCalled();
  });

  it("is hidden when closed and closes via the close button", async () => {
    const { rerender } = render(<ChatSidebar {...props} />);
    await userEvent.click(screen.getByRole("button", { name: "Close chat" }));
    expect(props.onClose).toHaveBeenCalled();
    rerender(<ChatSidebar {...props} open={false} />);
    expect(screen.queryByRole("complementary", { name: "AI Assistant" })).not.toBeInTheDocument();
  });
});
