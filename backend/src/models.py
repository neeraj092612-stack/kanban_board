from pydantic import BaseModel, Field
from typing import List, Optional

class Card(BaseModel):
    id: str
    title: str
    details: str = Field(default="", alias="description")

class Column(BaseModel):
    id: str
    title: str
    cards: List[Card] = Field(default_factory=list)

class BoardData(BaseModel):
    columns: List[Column]

# --- AI chat request/response schemas ---
class ChatRequest(BaseModel):
    """Payload for AI chat endpoint"""
    message: str
    history: List[dict] = Field(default_factory=list)
    board: Optional[BoardData] = None

class StructuredOutput(BaseModel):
    """Response schema containing AI reply and optional updated board"""
    reply: str
    board: Optional[BoardData] = None
