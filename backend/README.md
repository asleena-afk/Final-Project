# Task Tracker backend

1. Create a Supabase project, run `schema.sql` in the SQL editor.
2. `cp .env.example .env` and fill in the three values (DATABASE_URL is the Postgres connection string).
3. `python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
4. `uvicorn app.main:app --reload` then open http://localhost:8000/docs
5. `pytest` runs the checks that need no database.

## Getting a token (Swagger)

1. In Supabase: Authentication > Providers > Email, switch off "Confirm email" while developing.
2. In /docs run `POST /signup` with your email and a password of 6+ characters (once), then `POST /login`.
3. Copy `access_token` from the response, click Authorize at the top of /docs, paste it, and Authorize.
4. Try `GET /me`. The token lasts about an hour; run `POST /login` again when it expires.
