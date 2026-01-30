from sqlmodel import SQLModel, Field, create_engine, Session, select
from datetime import datetime
from typing import Optional

# Define the Model
class MomentumHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    date: datetime = Field(default_factory=datetime.now)
    spy_mom: float
    veu_mom: float
    bnd_mom: float
    signal: str

import os

# Setup Database
sqlite_file_name = "database.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

# Check for DATABASE_URL environment variable (from Vercel/Cloud)
database_url = os.getenv("DATABASE_URL", sqlite_url)

# If using Postgres, we may need to replace 'postgres://' with 'postgresql://' for SQLAlchemy 1.4+
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if "sqlite" in database_url else {}
engine = create_engine(database_url, echo=False, connect_args=connect_args)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

def save_momentum_record(spy: float, veu: float, bnd: float, signal: str):
    """Saves a momentum record to the database."""
    with Session(engine) as session:
        record = MomentumHistory(
            spy_mom=spy,
            veu_mom=veu,
            bnd_mom=bnd,
            signal=signal
        )
        session.add(record)
        session.commit()
        session.refresh(record)
        print(f"Saved record: {record}")
        return record

def get_history(limit: int = 180):
    """Fetches the last N records."""
    with Session(engine) as session:

        statement = select(MomentumHistory).order_by(MomentumHistory.date.desc()).limit(limit)
        results = session.exec(statement).all()
        return results
