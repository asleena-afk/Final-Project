import psycopg
from psycopg.rows import dict_row
from app import config


def get_db():
    """One connection per request; commits on success, rolls back on error."""
    with psycopg.connect(config.DATABASE_URL, row_factory=dict_row) as conn:
        yield conn
