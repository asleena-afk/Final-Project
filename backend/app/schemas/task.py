from datetime import date
from typing import Literal
from pydantic import BaseModel, Field, model_validator
from app.services.stages import STAGES

Stage = Literal[tuple(STAGES)]  # type: ignore[valid-type]

class TaskIn(BaseModel):
    project_id: str
    meeting_id: str | None = None
    title: str = Field(min_length=1, max_length=160)
    notes: str = ""
    status: Literal["todo", "in_progress", "pending_review", "done"] = "todo"
    priority: Literal["high", "medium", "low"] = "medium"
    due_date: date | None = None
    assignee: str | None = Field(default=None, max_length=80)
    is_blocked: bool = False
    blocker_reason: str | None = Field(default=None, max_length=300)
    ticket_ref: str | None = Field(default=None, max_length=40)
    module: str | None = Field(default=None, max_length=60)
    estimate_hrs: float | None = Field(default=None, ge=0)
    ticket_stage: Stage | None = None

    @model_validator(mode="after")
    def blocker_needs_reason(self):
        if self.is_blocked and not (self.blocker_reason or "").strip():
            raise ValueError("blocker_reason is required when is_blocked is true")
        if not self.is_blocked:
            self.blocker_reason = None
        return self
