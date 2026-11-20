from typing import Literal
from pydantic import BaseModel, Field

class ProjectIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = ""
    status: Literal["active", "on_hold", "done"] = "active"
    health: Literal["green", "amber", "red"] = "green"
    health_note: str | None = Field(default=None, max_length=300)
