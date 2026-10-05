"""
Forces the test suite onto an isolated SQLite file instead of the real demo
database (backend/data/pathfortune.db). Must set DATABASE_URL before `main`
or `app.core.database` is imported anywhere else, so this runs first as a
pytest conftest (auto-collected before test modules import the app).

Previously the tests wrote directly into the real demo DB - every pytest run
permanently mutated the dataset the dashboard/viva demo reads from.
"""
import os
import sys

_TEST_DB_PATH = os.path.join(os.path.dirname(__file__), "_test_pathfortune.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DB_PATH}"

# Clean slate each run so tests aren't affected by leftovers from a previous run.
if os.path.exists(_TEST_DB_PATH):
    os.remove(_TEST_DB_PATH)

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
