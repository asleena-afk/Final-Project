import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from app.main import app
from app.schemas.task import TaskIn
from app.services.stages import STAGES, status_for_stage

client = TestClient(app)


def test_health_open():
    assert client.get("/health").json() == {"ok": True}


@pytest.mark.parametrize("path", ["/me", "/projects", "/tasks?project_id=x", "/dashboard"])
def test_protected_routes_need_token(path):
    assert client.get(path).status_code == 401


def test_stage_mapping():
    assert len(STAGES) == 11
    assert status_for_stage("CLOSED", "todo") == "done"
    assert status_for_stage("TEST FAILED", "todo") == "in_progress"
    assert status_for_stage("FOR TESTING", "todo") == "pending_review"
    assert status_for_stage("FOR CODE MERGE & DEPLOYMENT", "todo") == "in_progress"
    assert status_for_stage("FOR PROD DEPLOYMENT", "todo") == "pending_review"
    assert status_for_stage(None, "in_progress") == "in_progress"


def test_blocked_needs_reason():
    with pytest.raises(ValidationError):
        TaskIn(project_id="p", title="x", is_blocked=True)
    assert TaskIn(project_id="p", title="x", is_blocked=True, blocker_reason="client").is_blocked


def test_title_and_estimate_rules():
    with pytest.raises(ValidationError):
        TaskIn(project_id="p", title="")
    with pytest.raises(ValidationError):
        TaskIn(project_id="p", title="x", estimate_hrs=-1)


# ---- transcript parsing and Excel export (no database needed)
import io
from datetime import date
from docx import Document
from openpyxl import load_workbook
from app.services.transcript_parser import parse_transcript
from app.services.excel import build_mom


def test_docx_timestamps_removed():
    d = Document(); d.add_paragraph("0:05\nHello team"); d.add_paragraph("1:12\nLet us start")
    buf = io.BytesIO(); d.save(buf)
    assert parse_transcript("a.docx", buf.getvalue()) == "Hello team\nLet us start"


def test_vtt_keeps_speakers():
    vtt = "WEBVTT\n\n1\n00:00:01.000 --> 00:00:03.000\n<v Aisha>Morning all</v>\n\n00:00:04.000 --> 00:00:06.000\nplain line\n"
    assert parse_transcript("a.vtt", vtt.encode()) == "Aisha: Morning all\nplain line"


def test_srt_and_txt():
    srt = "1\n00:00:01,000 --> 00:00:02,000\nHi there\n"
    assert parse_transcript("a.srt", srt.encode()) == "Hi there"
    assert parse_transcript("a.txt", b"  plain  ") == "plain"


def test_unsupported_type_rejected():
    from app.services.transcript_parser import UnsupportedFile
    with pytest.raises(UnsupportedFile):
        parse_transcript("a.pdf", b"x")


def test_excel_layout():
    m = {"title": "Weekly update", "meeting_date": date(2025, 7, 9), "meeting_time": "2.30pm", "location": "Teams",
         "attendees": "Our team: A", "summary_rows": [{"no": 1, "topic": "UAT", "details": "1. Dates", "action_items": ["Send plan"]}],
         "next_actions": ["Confirm UAT date"]}
    ws = load_workbook(io.BytesIO(build_mom(m))).active
    assert ws["A1"].value == "Weekly update"
    assert [c.value for c in ws[8]][:4] == ["No.", "Topic", "Details", "Action Items"]
    assert ws["D9"].value == "- Send plan"
    assert ws["A11"].value == "Next action:" and ws["B12"].value == "Confirm UAT date"


def test_new_routes_need_token():
    assert client.get("/meetings").status_code == 401
    assert client.post("/transcripts/parse", files={"file": ("a.txt", b"x")}).status_code == 401


def test_login_validation():
    assert client.post("/login", json={"email": "bad", "password": "123456"}).status_code == 422
    assert client.post("/signup", json={"email": "a@b.co", "password": "123"}).status_code == 422
