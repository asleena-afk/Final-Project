"""Load ONLY the meetings from sample_data.json into projects that already exist.

Run from the folder containing sample_data.json:
    Windows PowerShell:
        $env:TOKEN = "paste_access_token_here"
        py load_meetings.py --dry-run
        py load_meetings.py
    macOS:
        export TOKEN="paste_access_token_here"
        python3 load_meetings.py --dry-run
        python3 load_meetings.py

It looks up each project by name through GET /projects, so it does not
create any projects or tasks. Do not commit your token.
"""
import json
import os
import re
import sys
import urllib.error
import urllib.request

API_URL = os.getenv("API_URL", "http://localhost:8000")
TOKEN = os.getenv("TOKEN", "eyJhbGciOiJFUzI1NiIsImtpZCI6IjU2MzZiOTZjLTZmMTMtNGIzMC1hYmExLWZlMjZiZmE3NGFmOSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3BpdWVuYW1vYnZzZ2RzY25mZ3VzLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI4MWI0N2UyYS0zNWYzLTQ3ZTEtODNkZi1kYWRjMzIyNzI3YTEiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzk1MDY4MzY2LCJpYXQiOjE3OTUwNjQ3NjYsImVtYWlsIjoiYXNsZWVuYS5tYXJpeWFyYXNAZ21haWwuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbCI6ImFzbGVlbmEubWFyaXlhcmFzQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInN1YiI6IjgxYjQ3ZTJhLTM1ZjMtNDdlMS04M2RmLWRhZGMzMjI3MjdhMSJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzk1MDY0NzY2fV0sInNlc3Npb25faWQiOiI4M2YzNjJjMS1iNWRiLTQ3ZDgtOGVlMi1hYzFkMjJjNjUzMGQiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.Y64d97oYR0W_JAvwW9o3l9kQCciPLaJ0WyPSLkeD8AZD0UBMMrRCwbmZrjjlgjoLwvuIzouxoxp4P0zrGqIRCw")
DRY_RUN = "--dry-run" in sys.argv


def call(method, path, body=None):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    request = urllib.request.Request(
        API_URL + path,
        data=data,
        headers={"Content-Type": "application/json",
                 "Authorization": f"Bearer {TOKEN}"},
        method=method,
    )
    try:
        with urllib.request.urlopen(request) as response:
            return json.loads(response.read())
    except urllib.error.HTTPError as error:
        print(f"FAILED {method} {path}: HTTP {error.code}")
        print(error.read().decode("utf-8"))
        if body is not None:
            print("Request body was:")
            print(json.dumps(body, indent=2))
        sys.exit(1)


def to_list(text):
    """Turn 'Do A. Do B.' into ['Do A.', 'Do B.']."""
    return [part.strip() for part in re.split(r"(?<=\.)\s+", text) if part.strip()]


def main():
    if not TOKEN:
        sys.exit("Set the TOKEN environment variable first.")

    with open("sample_data.json", encoding="utf-8") as file:
        data = json.load(file)

    existing = {p["name"]: p["id"] for p in call("GET", "/projects")}
    sample_name = {p["id"]: p["name"] for p in data["projects"]}

    for m in data["meetings"]:
        name = sample_name[m["project_id"]]
        if name not in existing:
            sys.exit(f"Project not found in the app: {name}")
        rows = [
            {"no": r["no"], "topic": r["topic"], "details": r["details"],
             "action_items": to_list(r["action_items"])}
            for r in m["summary"]
        ]
        body = {
            "project_id": existing[name],
            "title": m["title"],
            "meeting_date": m["date"],
            "attendees": ", ".join(m["attendees"]),
            "transcript": m["transcript"],
            "summary_rows": rows,
            "next_actions": [item for row in rows for item in row["action_items"]],
        }
        if DRY_RUN:
            print(f"[dry run] POST /meetings\n{json.dumps(body, indent=2)}\n")
        else:
            call("POST", "/meetings", body)
            print(f"Created meeting: {m['title']}")

    print("Done.")


if __name__ == "__main__":
    main()
