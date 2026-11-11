import os

import psycopg
from psycopg.rows import dict_row

DATABASE_URL = os.environ["DATABASE_URL"]


def get_conn():
    """Vrati pripojeni k PostgreSQL. Radky prijdou jako slovniky (row["sloupec"])."""
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)
