from datetime import date
from pydantic import BaseModel, Field


class SummaryRow(BaseModel):
    no: int
    topic: str = Field(max_length=200)
    details: str = ""
    action_items: list[str] = []


class MeetingIn(BaseModel):
    project_id: str
    title: str = Field(min_length=1, max_length=160)
    meeting_date: date | None = None
    meeting_time: str | None = Field(default=None, max_length=60)
    location: str | None = Field(default=None, max_length=120)
    attendees: str | None = Field(default=None, max_length=2000)
    transcript: str = Field(default="", max_length=200_000)
    summary_rows: list[SummaryRow] | None = Field(default=None, max_length=50)
    next_actions: list[str] | None = Field(default=None, max_length=50)


class SummaryResult(BaseModel):
    rows: list[SummaryRow] = Field(max_length=50)
    next_actions: list[str] = []
