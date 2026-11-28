"""Safe rollback script for v4 transportation tables & complaint columns."""

from __future__ import annotations

import pymysql
from pymysql.cursors import DictCursor

import config


def rollback() -> None:
    conn = pymysql.connect(
        host=config.DB_HOST,
        port=config.DB_PORT,
        user=config.DB_USER,
        password=config.DB_PASSWORD,
        database=config.DB_NAME,
        charset="utf8mb4",
        cursorclass=DictCursor,
        autocommit=True,
    )
    try:
        with conn.cursor() as cur:
            print("⚠️ Reverting v4 migration changes...\n")
            for tbl in (
                "bus_complaint_audit_log",
                "bus_complaint_responses",
                "bus_complaint_attachments",
                "bus_complaints",
                "routes",
                "buses",
            ):
                cur.execute(f"DROP TABLE IF EXISTS {tbl}")
            print("✅ Dropped transportation tables")

            for col in (
                "original_description",
                "ai_structured_summary",
                "sentiment_score",
                "urgency_level",
                "is_safety_hazard",
                "ai_confidence",
                "assigned_coordinator_id",
            ):
                cur.execute(
                    """
                    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'complaints' AND COLUMN_NAME = %s
                    """,
                    (config.DB_NAME, col),
                )
                if cur.fetchone() is not None:
                    cur.execute(f"ALTER TABLE complaints DROP COLUMN {col}")
                    print(f"✅ Dropped complaints.{col}")

            print("\n🎉 Rollback complete!\n")
    finally:
        conn.close()


if __name__ == "__main__":
    rollback()
