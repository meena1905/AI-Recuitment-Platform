"""Migrate the local recruitment_platform database into the production (Render) database.

Usage:
    python migrate_to_render.py --render-url "postgresql://..."
    # or set the RENDER_DATABASE_URL environment variable

Copies companies, users, jobs, applications, and interviews in dependency order.
Password hashes are copied as-is so existing logins keep working.

WARNING: this TRUNCATES the target tables (interviews, applications, jobs,
users, companies) before inserting, so the production DB ends up a mirror of
the local DB.
"""
import argparse
import os
import sys
from pathlib import Path

from sqlalchemy import create_engine, text

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from database import Base  # noqa: E402
import models  # noqa: E402  (registers tables on Base.metadata)

COPY_ORDER = [models.Company, models.User, models.Job, models.Application, models.Interview]
PROMETHEUS_TABLES = ["metrics_registry", "latest_series"]


def build_row_mapping(table_row):
    return {c.name: getattr(table_row, c.name) for c in table_row._sa_instance_state.class_.__table__.columns}


def main():
    parser = argparse.ArgumentParser(description="Migrate local DB to production (Render) DB.")
    parser.add_argument("--render-url", default=os.getenv("RENDER_DATABASE_URL"), help="Target Postgres connection string (Render).")
    parser.add_argument("--local-url", default=os.getenv("DATABASE_URL"), help="Source Postgres connection string. Defaults to local .env.")
    parser.add_argument("--list-only", action="store_true", help="Only print what would be copied, make no changes.")
    args = parser.parse_args()

    if not args.render_url:
        sys.exit("ERROR: provide the Render database URL via --render-url or RENDER_DATABASE_URL")
    if not args.local_url:
        sys.exit("ERROR: could not determine local DATABASE_URL (backend/.env missing?)")

    local_engine = create_engine(args.local_url)
    render_engine = create_engine(args.render_url)

    counts = {}
    with local_engine.connect() as local_conn:
        for model in COPY_ORDER:
            counts[model.__tablename__] = local_conn.execute(text(f'SELECT count(*) FROM "{model.__tablename__}"')).scalar_one()

    print("Source (local DB):")
    for table, count in counts.items():
        print(f"  {table}: {count} rows")
    print()

    if args.list_only:
        return

    answer = input("This will REPLACE all data in the production database. Type 'yes' to continue: ")
    if answer.strip().lower() != "yes":
        sys.exit("Aborted.")

    with render_engine.connect() as conn:
        for table in PROMETHEUS_TABLES:
            conn.execute(text(f"DROP TABLE IF EXISTS {table}"))
        conn.commit()

    with local_engine.connect() as local_conn, render_engine.begin() as render_conn:
        render_conn.execute(text("TRUNCATE TABLE interviews, applications, jobs, users, companies CASCADE"))

        for model in COPY_ORDER:
            rows = local_conn.execute(model.__table__.select()).mappings().all()
            if rows:
                render_conn.execute(model.__table__.insert(), [dict(r) for r in rows])
            print(f"  copied {len(rows)} {model.__tablename__}")

        for table in reversed([m.__tablename__ for m in COPY_ORDER]):
            pk = {"companies": "id", "users": "id", "jobs": "id", "applications": "id", "interviews": "id"}[table]
            render_conn.execute(text(
                f"SELECT setval(pg_get_serial_sequence('{table}', '{pk}'), COALESCE(MAX({pk}), 1), MAX({pk}) IS NOT NULL) FROM {table}"
            ))

    print("\nMigration complete.")
    with render_engine.connect() as render_conn:
        for model in COPY_ORDER:
            total = render_conn.execute(text(f'SELECT count(*) FROM "{model.__tablename__}"')).scalar_one()
            print(f"  production {model.__tablename__}: {total}")


if __name__ == "__main__":
    main()