import os
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from app.auth import current_user_id
from app.services.transcript_parser import SUPPORTED, UnsupportedFile, parse_transcript

router = APIRouter(prefix="/transcripts", tags=["transcripts"])
MAX_BYTES = 2 * 1024 * 1024
MAX_CHARS = 200_000


@router.post("/parse")
async def parse(file: UploadFile = File(...), uid: str = Depends(current_user_id)):
    """Read an uploaded file and return its text. Nothing is stored."""
    if not (file.filename or "").lower().endswith(SUPPORTED):
        raise HTTPException(415, "File type not supported. Use .docx, .vtt, .srt or .txt")
    data = await file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "File is over 2 MB")
    try:
        text = parse_transcript(file.filename, data)
    except UnsupportedFile:
        raise HTTPException(415, "File type not supported")
    except Exception:
        raise HTTPException(422, "Could not read that file")
    if len(text) > MAX_CHARS:
        raise HTTPException(422, "Transcript is over 200,000 characters")
    return {"text": text, "characters": len(text)}
