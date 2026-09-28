import os
from functools import cache
from pathlib import Path
from typing import Literal
from uuid import uuid4

from dotenv import load_dotenv
from openai import AsyncOpenAI
from pydantic import BaseModel

from src.models import BoardData, Card, ChatRequest, ChatResponse

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

MODEL_NAME = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

SYSTEM_PROMPT = (
    "You are an assistant for a Kanban board. Reply briefly in `reply`. To change the board, list "
    "operations in `operations` (empty list when nothing changes). Use only ids from the current board. "
    "Operations: create_card (column_id, title, details); update_card (card_id, and title and/or details "
    "to change); move_card (card_id, column_id, optional 0-based position, null for the end); "
    "delete_card (card_id); rename_column (column_id, title). Set fields an operation does not use to null. "
    "Columns are fixed: they can be renamed but never added or removed."
)


class Operation(BaseModel):
    action: Literal["create_card", "update_card", "move_card", "delete_card", "rename_column"]
    card_id: str | None
    column_id: str | None
    title: str | None
    details: str | None
    position: int | None


class AIResponse(BaseModel):
    reply: str
    operations: list[Operation]


class AIUnavailableError(Exception):
    pass


@cache
def get_client() -> AsyncOpenAI:
    if not os.getenv("OPENAI_API_KEY"):
        raise AIUnavailableError("OPENAI_API_KEY is not configured")
    return AsyncOpenAI()


def apply_operations(board: BoardData, operations: list[Operation]) -> BoardData:
    """Apply AI operations to a copy of the board. Raises ValueError on unknown ids."""
    board = board.model_copy(deep=True)
    columns = {column.id: column for column in board.columns}

    def column(column_id: str | None):
        if column_id not in columns:
            raise ValueError(f"Unknown column id: {column_id}")
        return columns[column_id]

    def find_card(card_id: str | None):
        for col in board.columns:
            for card in col.cards:
                if card.id == card_id:
                    return col, card
        raise ValueError(f"Unknown card id: {card_id}")

    for op in operations:
        if op.action == "create_card":
            card = Card(id=f"card-{uuid4().hex[:12]}", title=op.title or "Untitled", details=op.details or "")
            column(op.column_id).cards.append(card)
        elif op.action == "update_card":
            _, card = find_card(op.card_id)
            card.title = op.title if op.title is not None else card.title
            card.details = op.details if op.details is not None else card.details
        elif op.action == "move_card":
            source, card = find_card(op.card_id)
            target = column(op.column_id)
            source.cards.remove(card)
            position = len(target.cards) if op.position is None else op.position
            target.cards.insert(position, card)
        elif op.action == "delete_card":
            source, card = find_card(op.card_id)
            source.cards.remove(card)
        elif op.action == "rename_column":
            column(op.column_id).title = op.title or column(op.column_id).title
    return board


async def chat_with_ai(request: ChatRequest) -> ChatResponse:
    messages = [
        {"role": "system", "content": f"{SYSTEM_PROMPT}\nCurrent board: {request.board.model_dump_json()}"},
        *(message.model_dump() for message in request.history),
        {"role": "user", "content": request.message},
    ]
    response = await get_client().chat.completions.parse(
        model=MODEL_NAME,
        messages=messages,
        temperature=0,
        response_format=AIResponse,
    )
    message = response.choices[0].message
    if message.parsed is None:
        raise ValueError(message.refusal or "AI returned no structured output")
    result = message.parsed
    board = apply_operations(request.board, result.operations) if result.operations else None
    return ChatResponse(reply=result.reply, board=board)
