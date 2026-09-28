import { fromApiBoard, type ApiBoardData } from "@/lib/kanban";

// Mirrors the backend seed board (backend/src/database.py DEFAULT_BOARD).
export const demoApiBoard: ApiBoardData = {
  columns: [
    {
      id: "col-backlog",
      title: "Backlog",
      cards: [
        { id: "card-1", title: "Align roadmap themes", details: "Draft quarterly themes with impact statements and metrics." },
        { id: "card-2", title: "Gather customer signals", details: "Review support tags, sales notes, and churn feedback." },
      ],
    },
    {
      id: "col-discovery",
      title: "Discovery",
      cards: [{ id: "card-3", title: "Prototype analytics view", details: "Sketch initial dashboard layout and key drill-downs." }],
    },
    {
      id: "col-progress",
      title: "In Progress",
      cards: [
        { id: "card-4", title: "Refine status language", details: "Standardize column labels and tone across the board." },
        { id: "card-5", title: "Design card layout", details: "Add hierarchy and spacing for scanning dense lists." },
      ],
    },
    {
      id: "col-review",
      title: "Review",
      cards: [{ id: "card-6", title: "QA micro-interactions", details: "Verify hover, focus, and loading states." }],
    },
    {
      id: "col-done",
      title: "Done",
      cards: [
        { id: "card-7", title: "Ship marketing page", details: "Final copy approved and asset pack delivered." },
        { id: "card-8", title: "Close onboarding sprint", details: "Document release notes and share internally." },
      ],
    },
  ],
};

export const demoBoard = fromApiBoard(demoApiBoard);
