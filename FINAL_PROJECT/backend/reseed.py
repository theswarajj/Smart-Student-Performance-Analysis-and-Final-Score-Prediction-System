import os
import sqlite3

try:
    os.remove('acadiq.db')
    print("Deleted acadiq.db")
except Exception as e:
    print(f"Could not delete: {e}")

from app import init_db, seed_demo_data

init_db()
seed_demo_data()
print("Successfully re-seeded the database with new students and classes.")
