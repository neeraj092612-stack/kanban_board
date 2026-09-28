from typing import Literal

from pydantic import BaseModel, model_validator


class Card(BaseModel):
    id: str
    title: str
    details: str


class Column(BaseModel):
    id: str
    title: str
    cards: list[Card]


class BoardData(BaseModel):
    columns: list[Column]

    @model_validator(mode="after")
    def unique_ids(self) -> "BoardData":
        card_ids = [card.id for column in self.columns for card in column.cards]
        if len(card_ids) != len(set(card_ids)):
            raise ValueError("Card ids must be unique")
        column_ids = [column.id for column in self.columns]
        if len(column_ids) != len(set(column_ids)):
            raise ValueError("Column ids must be unique")
        return self


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []
    board: BoardData


class ChatResponse(BaseModel):
    """AI reply plus the updated board, or null when nothing changed."""

    reply: str
    board: BoardData | None
