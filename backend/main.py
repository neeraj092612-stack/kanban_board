from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import sys, os
import os
sys.path.append(os.path.join(os.path.dirname(__file__), "src"))
from fastapi import APIRouter
from models import BoardData
from db_service import get_board, save_board, _fetch_user_id
import ai_service


from database import init_db

app = FastAPI(title="Project Management MVP API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

# Board API router
router = APIRouter()

@router.get("/api/board", response_model=BoardData)
async def read_board():
    user_id = await _fetch_user_id("user")
    return await get_board(user_id)

@router.put("/api/board", response_model=BoardData)
async def update_board(board: BoardData):
    user_id = await _fetch_user_id("user")
    await save_board(user_id, board)
    return board

from fastapi import HTTPException
from models import ChatRequest, StructuredOutput
import db_service

# Re‑add simple test endpoint (used by existing unit tests)
@router.post("/api/ai/test", response_model=dict)
async def test_ai_endpoint():
    """Simple test endpoint calling OpenAI with a basic arithmetic prompt."""
    try:
        answer = await ai_service.get_ai_response("What is 2+2?")
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI provider request failed: {exc}") from exc
    return {"answer": answer}

# New AI chat endpoint
@router.post("/api/ai/chat", response_model=StructuredOutput)
async def ai_chat_endpoint(request: ChatRequest):
    """Handle AI chat request, return structured reply and optionally persist board updates."""
    try:
        result = await ai_service.chat_with_ai(request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI provider request failed: {exc}") from exc
    # Persist board if returned
    if result.board is not None:
        user_id = await _fetch_user_id("user")
        await db_service.save_board(user_id, result.board)
    return result

app.include_router(router)



static_dir = Path(__file__).resolve().parent / "static"
@app.on_event("startup")
async def on_startup() -> None:
    """Initialize database tables and seed data on app startup."""
    try:
        await init_db()
    except Exception as exc:
        # Keep health and the static app available while the database starts.
        print(f"Database initialization unavailable: {exc}")
if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
