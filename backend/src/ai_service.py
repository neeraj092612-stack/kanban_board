import json
import os
from pathlib import Path

from dotenv import load_dotenv
from models import ChatRequest, StructuredOutput

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

MODEL_NAME = os.getenv("OPENAI_MODEL", "gpt-4o-mini")


def _api_key() -> str:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")
    return api_key


async def get_ai_response(prompt: str) -> str:
    """Send a plain prompt to the configured OpenAI-compatible model."""
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=_api_key())
    response = await client.chat.completions.create(
        model=MODEL_NAME,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content or ""


async def chat_with_ai(request: ChatRequest) -> StructuredOutput:
    """Interact with OpenAI to get a structured reply and optional board update.

    The model is instructed to return JSON matching StructuredOutput.
    """
    # Build system prompt describing the schema and allowed actions.
    system_prompt = (
        "You are an AI assistant for a Kanban board application. The user may ask to create, edit, move, or rename cards/columns. "
        "Respond ONLY with a JSON object matching this schema: {\"reply\": string, \"board\": optional board JSON or null}. "
        "If the board should be updated, include the full updated BoardData JSON. If no board changes, set \"board\": null. "
        "Do NOT include any explanatory text outside the JSON."
    )

    # Include current board state if provided, to give context.
    if request.board is not None:
        board_json = request.board.model_dump_json(by_alias=True)
        system_prompt += f"\nCurrent board state: {board_json}"

    history = [
        message
        for message in request.history
        if message.get("role") in {"user", "assistant"}
        and isinstance(message.get("content"), str)
    ]
    messages = [
        {"role": "system", "content": system_prompt},
        *history,
        {"role": "user", "content": request.message},
    ]

    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=_api_key())
    response = await client.chat.completions.create(
        model=MODEL_NAME,
        messages=messages,
        temperature=0,
        response_format={"type": "json_object"},
    )
    content = (response.choices[0].message.content or "").strip()
    if not content:
        raise ValueError("AI response was empty")
    try:
        data = json.loads(content)
    except json.JSONDecodeError as e:
        raise ValueError(f"AI response is not valid JSON: {e}")
    # Validate against StructuredOutput model
    return StructuredOutput(**data)

