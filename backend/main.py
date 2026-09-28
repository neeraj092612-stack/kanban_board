from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError

from src import ai_service, database
from src.models import BoardData, ChatRequest, ChatResponse

# MVP: a single hardcoded user; the database supports more.
USERNAME = "user"


@asynccontextmanager
async def lifespan(app: FastAPI):
    await database.init_db()
    yield
    await database.close_db()


app = FastAPI(title="Project Management MVP API", lifespan=lifespan)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/board", response_model=BoardData)
async def read_board():
    return await database.get_board(USERNAME)


@app.put("/api/board", response_model=BoardData)
async def update_board(board: BoardData):
    await database.save_board(USERNAME, board)
    return board


@app.post("/api/ai/chat", response_model=ChatResponse)
async def ai_chat(request: ChatRequest):
    """Ask the AI about the board; persist the board if the AI changed it."""
    try:
        result = await ai_service.chat_with_ai(request)
    except ai_service.AIUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except (ValueError, ValidationError) as exc:
        raise HTTPException(status_code=502, detail=f"Invalid AI response: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI provider request failed: {exc}") from exc
    if result.board is not None:
        await database.save_board(USERNAME, result.board)
    return result


static_dir = Path(__file__).resolve().parent / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
