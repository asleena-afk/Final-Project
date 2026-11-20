import json
import os

from pydantic import ValidationError
from app.schemas.meeting import SummaryResult

MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

PROMPT = """You write minutes of meeting (MOM) from a transcript.
Return JSON only, in this shape:
{"rows":[{"no":1,"topic":"...","details":"...","action_items":["..."]}],"next_actions":["..."]}
Rules:
- One row per topic discussed, in the order discussed, at most 50 rows.
- "details" is plain text: numbered points, with "- " sub-points on new lines.
- "action_items" are things someone must do, written as short tasks. Use [] when there are none.
- "next_actions" are the 3 to 8 key follow-ups for the whole meeting.
- Use only what the transcript says. Do not invent names, dates or decisions.
- Write in the same language as the transcript.

Transcript:
"""


class AIBusy(Exception):
    pass


class AIBadOutput(Exception):
    pass


def summarize(transcript: str) -> SummaryResult:
    from google import genai
    from google.genai import errors, types

    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY", ""))
    try:
        resp = client.models.generate_content(
            model=MODEL,
            contents=PROMPT + transcript,
            config=types.GenerateContentConfig(response_mime_type="application/json", temperature=0.2),
        )
    except errors.APIError as e:
        if getattr(e, "code", None) in (429, 500, 503):
            raise AIBusy() from e
        raise
    try:
        result = SummaryResult.model_validate(json.loads(resp.text))
    except (ValueError, ValidationError) as e:
        raise AIBadOutput() from e
    for i, row in enumerate(result.rows, 1):
        row.no = i
    return result
