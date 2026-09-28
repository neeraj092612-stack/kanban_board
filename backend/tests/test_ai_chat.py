import asyncio
import json
from types import SimpleNamespace

import pytest

from src import ai_service
from src.database import DEFAULT_BOARD
from src.ai_service import AIResponse, Operation, apply_operations
from src.models import BoardData, ChatRequest


class FakeCompletions:
    """Stands in for client.chat.completions; records the call and returns a canned result."""

    def __init__(self, parsed=None, refusal=None, error=None):
        self.parsed, self.refusal, self.error = parsed, refusal, error
        self.kwargs = None

    async def parse(self, **kwargs):
        self.kwargs = kwargs
        if self.error:
            raise self.error
        message = SimpleNamespace(parsed=self.parsed, refusal=self.refusal)
        return SimpleNamespace(choices=[SimpleNamespace(message=message)])


@pytest.fixture
def fake_openai(monkeypatch):
    def install(**kwargs):
        completions = FakeCompletions(**kwargs)
        client = SimpleNamespace(chat=SimpleNamespace(completions=completions))
        monkeypatch.setattr(ai_service, "get_client", lambda: client)
        return completions

    return install


def op(action, card_id=None, column_id=None, title=None, details=None, position=None):
    return Operation(action=action, card_id=card_id, column_id=column_id, title=title, details=details, position=position)


def column_cards(board, column_id):
    return [card for column in board.columns if column.id == column_id for card in column.cards]


def chat_request(**overrides):
    body = {"message": "Add a card", "history": [], "board": DEFAULT_BOARD} | overrides
    return ChatRequest.model_validate(body)


# --- ai_service ---

def test_prompt_contains_board_history_and_single_user_message(fake_openai):
    completions = fake_openai(parsed=AIResponse(reply="ok", operations=[]))
    history = [{"role": "user", "content": "hi"}, {"role": "assistant", "content": "hello"}]
    asyncio.run(ai_service.chat_with_ai(chat_request(history=history)))

    messages = completions.kwargs["messages"]
    assert messages[0]["role"] == "system"
    assert json.dumps(DEFAULT_BOARD["columns"][0]["cards"][0]["title"]) in messages[0]["content"]
    assert messages[1:] == [*history, {"role": "user", "content": "Add a card"}]
    assert completions.kwargs["response_format"] is AIResponse


# --- apply_operations ---

BOARD = BoardData.model_validate(DEFAULT_BOARD)


def test_create_card_gets_server_generated_unique_id():
    board = apply_operations(BOARD, [op("create_card", column_id="col-review", title="A", details="B"),
                                     op("create_card", column_id="col-review", title="C", details=None)])
    new = column_cards(board, "col-review")[1:]
    assert [(c.title, c.details) for c in new] == [("A", "B"), ("C", "")]
    assert new[0].id != new[1].id and new[0].id.startswith("card-")


def test_update_card_changes_only_given_fields():
    board = apply_operations(BOARD, [op("update_card", card_id="card-1", title="New")])
    card = column_cards(board, "col-backlog")[0]
    assert (card.title, card.details) == ("New", column_cards(BOARD, "col-backlog")[0].details)


def test_move_card_to_position_and_end():
    board = apply_operations(BOARD, [op("move_card", card_id="card-1", column_id="col-done", position=0),
                                     op("move_card", card_id="card-2", column_id="col-done")])
    assert [c.id for c in column_cards(board, "col-done")] == ["card-1", "card-7", "card-8", "card-2"]
    assert column_cards(board, "col-backlog") == []


def test_delete_card_and_rename_column():
    board = apply_operations(BOARD, [op("delete_card", card_id="card-6"),
                                     op("rename_column", column_id="col-review", title="QA")])
    review = next(c for c in board.columns if c.id == "col-review")
    assert (review.title, review.cards) == ("QA", [])


def test_operations_leave_other_columns_untouched():
    board = apply_operations(BOARD, [op("create_card", column_id="col-backlog", title="X")])
    assert board.columns[1:] == BOARD.columns[1:]
    assert BOARD == BoardData.model_validate(DEFAULT_BOARD)  # input not mutated


@pytest.mark.parametrize("operation", [
    op("update_card", card_id="missing", title="x"),
    op("move_card", card_id="card-1", column_id="missing"),
    op("create_card", column_id=None, title="x"),
])
def test_unknown_ids_raise(operation):
    with pytest.raises(ValueError, match="Unknown"):
        apply_operations(BOARD, [operation])


def test_refusal_raises_value_error(fake_openai):
    fake_openai(parsed=None, refusal="I cannot help with that")
    with pytest.raises(ValueError, match="cannot help"):
        asyncio.run(ai_service.chat_with_ai(chat_request()))


def test_missing_api_key_raises_unavailable_error(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    ai_service.get_client.cache_clear()
    with pytest.raises(ai_service.AIUnavailableError, match="OPENAI_API_KEY"):
        ai_service.get_client()
    ai_service.get_client.cache_clear()


def test_chat_request_rejects_unknown_history_role():
    with pytest.raises(ValueError):
        chat_request(history=[{"role": "system", "content": "x"}])


# --- /api/ai/chat endpoint ---

def test_chat_reply_only_leaves_board_unchanged(client, fake_openai):
    fake_openai(parsed=AIResponse(reply="Sure.", operations=[]))
    response = client.post("/api/ai/chat", json={"message": "Hello", "history": [], "board": DEFAULT_BOARD})
    assert response.status_code == 200
    assert response.json() == {"reply": "Sure.", "board": None}
    assert client.get("/api/board").json() == DEFAULT_BOARD


def test_chat_board_update_is_persisted(client, fake_openai):
    fake_openai(parsed=AIResponse(reply="Moved.", operations=[op("move_card", card_id="card-1", column_id="col-done")]))
    response = client.post("/api/ai/chat", json={"message": "Move", "history": [], "board": DEFAULT_BOARD})
    assert response.status_code == 200
    board = response.json()["board"]
    assert board["columns"][4]["cards"][-1]["id"] == "card-1"
    assert client.get("/api/board").json() == board


def test_chat_invalid_ai_output_returns_502_and_keeps_board(client, fake_openai):
    fake_openai(parsed=AIResponse(reply="Done.", operations=[op("delete_card", card_id="missing")]))
    response = client.post("/api/ai/chat", json={"message": "Delete", "history": [], "board": DEFAULT_BOARD})
    assert response.status_code == 502
    assert "Unknown card id" in response.json()["detail"]
    assert client.get("/api/board").json() == DEFAULT_BOARD


def test_chat_missing_api_key_returns_503(client, monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    ai_service.get_client.cache_clear()
    response = client.post("/api/ai/chat", json={"message": "Hi", "history": [], "board": DEFAULT_BOARD})
    ai_service.get_client.cache_clear()
    assert response.status_code == 503
