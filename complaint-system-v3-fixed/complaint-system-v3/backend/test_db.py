"""Quick MySQL connectivity check script."""

from __future__ import annotations

import pymysql

import config


def test_connection() -> None:
    for host in ("127.0.0.1", "localhost"):
        try:
            print(f"Testing {host}...")
            conn = pymysql.connect(
                host=host,
                port=config.DB_PORT,
                user=config.DB_USER,
                password=config.DB_PASSWORD,
                connect_timeout=5,
            )
            conn.close()
            print(f"✅ Connected to {host}!")
        except Exception as exc:
            print(f"❌ Failed {host}: {exc}")


if __name__ == "__main__":
    test_connection()
