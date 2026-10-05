from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Respect DATABASE_URL if the environment sets one (e.g. tests pointing at an
# isolated file instead of the real demo DB) - falls back to the original
# absolute-path default unchanged for everyone who doesn't set it.
_env_url = os.getenv("DATABASE_URL")
if _env_url:
    SQLALCHEMY_DATABASE_URL = _env_url
else:
    DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
    os.makedirs(DB_DIR, exist_ok=True)
    DB_PATH = os.path.join(DB_DIR, "pathfortune.db")
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
