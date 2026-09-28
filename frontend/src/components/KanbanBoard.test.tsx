import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanBoard } from "@/components/KanbanBoard";
import { demoBoard } from "@/test/fixtures";

const Board = ({ locked = false }: { locked?: boolean }) => {
  const [board, setBoard] = useState(demoBoard);
  return <KanbanBoard board={board} onBoardChange={setBoard} locked={locked} />;
};

const getFirstColumn = () => screen.getAllByTestId(/column-/i)[0];

describe("KanbanBoard", () => {
  it("renders five columns", () => {
    render(<Board />);
    expect(screen.getAllByTestId(/column-/i)).toHaveLength(5);
  });

  it("renames a column", async () => {
    render(<Board />);
    const column = getFirstColumn();
    const input = within(column).getByLabelText("Column title");
    await userEvent.clear(input);
    await userEvent.type(input, "New Name{Enter}");
    expect(input).toHaveValue("New Name");
    // The header chip reflects the committed rename.
    expect(screen.getAllByText("New Name")).toHaveLength(1);
  });

  it("restores the column title when cleared", async () => {
    render(<Board />);
    const input = within(getFirstColumn()).getByLabelText("Column title");
    await userEvent.clear(input);
    await userEvent.tab();
    expect(input).toHaveValue("Backlog");
  });

  it("disables editing while locked", () => {
    render(<Board locked />);
    expect(screen.getByTestId("board-columns")).toBeDisabled();
    expect(within(getFirstColumn()).getByLabelText("Column title")).toBeDisabled();
  });

  it("adds and removes a card", async () => {
    render(<Board />);
    const column = getFirstColumn();
    const addButton = within(column).getByRole("button", {
      name: /add a card/i,
    });
    await userEvent.click(addButton);

    const titleInput = within(column).getByPlaceholderText(/card title/i);
    await userEvent.type(titleInput, "New card");
    const detailsInput = within(column).getByPlaceholderText(/details/i);
    await userEvent.type(detailsInput, "Notes");

    await userEvent.click(within(column).getByRole("button", { name: /add card/i }));

    expect(within(column).getByText("New card")).toBeInTheDocument();

    const deleteButton = within(column).getByRole("button", {
      name: /delete new card/i,
    });
    await userEvent.click(deleteButton);

    expect(within(column).queryByText("New card")).not.toBeInTheDocument();
  });

  it("edits a card title and details", async () => {
    render(<Board />);
    const column = getFirstColumn();
    const card = within(column).getByTestId("card-card-1");
    await userEvent.click(within(card).getByRole("button", { name: /^edit /i }));

    const titleInput = within(card).getByLabelText("Edit card title");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Edited title");
    const detailsInput = within(card).getByLabelText("Edit card details");
    await userEvent.clear(detailsInput);
    await userEvent.type(detailsInput, "Edited details");
    await userEvent.click(within(card).getByRole("button", { name: /save/i }));

    expect(within(column).getByText("Edited title")).toBeInTheDocument();
    expect(within(column).getByText("Edited details")).toBeInTheDocument();
  });

  it("discards card edits on cancel", async () => {
    render(<Board />);
    const column = getFirstColumn();
    const card = within(column).getByTestId("card-card-1");
    const originalTitle = within(card).getByRole("heading").textContent!;
    await userEvent.click(within(card).getByRole("button", { name: /^edit /i }));

    const titleInput = within(card).getByLabelText("Edit card title");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Discarded");
    await userEvent.click(within(card).getByRole("button", { name: /cancel/i }));

    expect(within(column).getByText(originalTitle)).toBeInTheDocument();
    expect(within(column).queryByText("Discarded")).not.toBeInTheDocument();
  });
});
