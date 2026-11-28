"""MySQL connection pool and async query helpers using PyMySQL."""

from __future__ import annotations

from contextlib import contextmanager
from decimal import Decimal
from queue import Empty, Queue
from typing import Any, Iterator

import pymysql
from pymysql.cursors import DictCursor
from starlette.concurrency import run_in_threadpool

import config


class _MySQLPool:
    """Thread-safe connection pool backed by PyMySQL."""

    def __init__(self, max_size: int = 10) -> None:
        self._max_size = max_size
        self._pool: Queue[pymysql.connections.Connection] = Queue(maxsize=max_size)

    def _create_connection(self) -> pymysql.connections.Connection:
        return pymysql.connect(
            host=config.DB_HOST,
            port=config.DB_PORT,
            user=config.DB_USER,
            password=config.DB_PASSWORD,
            database=config.DB_NAME,
            charset="utf8mb4",
            cursorclass=DictCursor,
            autocommit=True,
            connect_timeout=5,
        )

    @contextmanager
    def connection(self) -> Iterator[pymysql.connections.Connection]:
        conn: pymysql.connections.Connection | None = None
        try:
            conn = self._pool.get_nowait()
            conn.ping(reconnect=True)
        except (Empty, pymysql.MySQLError):
            if conn is not None:
                try:
                    conn.close()
                except Exception:
                    pass
            conn = self._create_connection()

        try:
            yield conn
        finally:
            try:
                self._pool.put_nowait(conn)
            except Exception:
                try:
                    conn.close()
                except Exception:
                    pass


_pool = _MySQLPool(max_size=10)


def _normalize_row(row: dict[str, Any] | None) -> dict[str, Any] | None:
    if row is None:
        return None
    normalized: dict[str, Any] = {}
    for key, val in row.items():
        if isinstance(val, Decimal):
            normalized[key] = int(val) if val == val.to_integral_value() else float(val)
        else:
            normalized[key] = val
    return normalized


def _sync_query_all(sql: str, params: tuple[Any, ...] | list[Any] | None = None) -> list[dict[str, Any]]:
    with _pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            rows = cur.fetchall()
            return [_normalize_row(r) for r in rows if r is not None]


def _sync_query_one(sql: str, params: tuple[Any, ...] | list[Any] | None = None) -> dict[str, Any] | None:
    with _pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            row = cur.fetchone()
            return _normalize_row(row)


def _sync_execute(sql: str, params: tuple[Any, ...] | list[Any] | None = None) -> tuple[int, int]:
    with _pool.connection() as conn:
        with conn.cursor() as cur:
            rowcount = cur.execute(sql, params or ())
            return cur.lastrowid, rowcount


async def query_all(sql: str, params: tuple[Any, ...] | list[Any] | None = None) -> list[dict[str, Any]]:
    """Run a SELECT query and return all rows as dictionaries."""
    return await run_in_threadpool(_sync_query_all, sql, params)


async def query_one(sql: str, params: tuple[Any, ...] | list[Any] | None = None) -> dict[str, Any] | None:
    """Run a SELECT query and return the first row or None."""
    return await run_in_threadpool(_sync_query_one, sql, params)


async def execute(sql: str, params: tuple[Any, ...] | list[Any] | None = None) -> tuple[int, int]:
    """Run an INSERT/UPDATE/DELETE query and return (lastrowid, rowcount)."""
    return await run_in_threadpool(_sync_execute, sql, params)


def _safe_print(msg: str) -> None:
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode("ascii", errors="replace").decode("ascii"))


def test_connection() -> bool:
    """Verify MySQL connectivity on startup without crashing the app."""
    try:
        with _pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
        _safe_print("[OK] MySQL Connected successfully!")
        return True
    except Exception as exc:
        _safe_print(f"[ERROR] MySQL connection failed: {exc}")
        _safe_print("   -> Check DB_HOST, DB_USER, DB_PASSWORD, DB_NAME in backend/.env")
        return False
