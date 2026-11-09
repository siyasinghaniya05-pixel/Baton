import os
import sys
from sqlalchemy import text
from app.database import engine

def migrate():
    with engine.begin() as conn:
        # Check users table
        existing_user_cols = set(row[0] for row in conn.execute(text(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'users';"
        )))
        print("Existing user columns:", existing_user_cols)

        user_migrations = [
            ("is_verified", "BOOLEAN DEFAULT TRUE"),
            ("verification_token", "VARCHAR(255)"),
            ("reset_token", "VARCHAR(255)"),
            ("reset_token_expires", "TIMESTAMP"),
            ("failed_login_attempts", "INTEGER DEFAULT 0"),
            ("locked_until", "TIMESTAMP"),
            ("tokens_revoked_before", "TIMESTAMP"),
            ("is_active", "BOOLEAN DEFAULT TRUE"),
        ]

        for col, col_type in user_migrations:
            if col not in existing_user_cols:
                print(f"Adding column {col} to users...")
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {col_type};"))
            else:
                print(f"Column {col} already exists on users.")

        # Check claims table
        existing_claim_cols = set(row[0] for row in conn.execute(text(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'claims';"
        )))
        print("Existing claim columns:", existing_claim_cols)

        if "verification_report" not in existing_claim_cols:
            print("Adding column verification_report to claims...")
            conn.execute(text("ALTER TABLE claims ADD COLUMN verification_report JSON DEFAULT '{}'::json;"))
        else:
            print("Column verification_report already exists on claims.")

        # Also ensure users have is_verified=True and failed_login_attempts=0 if NULL
        conn.execute(text("UPDATE users SET is_verified = TRUE WHERE is_verified IS NULL;"))
        conn.execute(text("UPDATE users SET failed_login_attempts = 0 WHERE failed_login_attempts IS NULL;"))
        conn.execute(text("UPDATE users SET is_active = TRUE WHERE is_active IS NULL;"))
        conn.execute(text("UPDATE claims SET verification_report = '{}'::json WHERE verification_report IS NULL;"))

        print("Migration complete!")

if __name__ == "__main__":
    migrate()

