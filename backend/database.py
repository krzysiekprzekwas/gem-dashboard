from sqlmodel import SQLModel, Field, create_engine, Session, select
from datetime import datetime
from typing import Optional

# Define the Model
class MomentumHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    date: datetime = Field(default_factory=datetime.now)
    region: str = Field(default="US", index=True)
    spy_mom: float
    veu_mom: float
    bnd_mom: float
    tbill_mom: Optional[float] = None
    signal: str

import os

# Setup Database
base_dir = os.path.dirname(os.path.abspath(__file__))
sqlite_file_name = os.path.join(base_dir, "database.db")
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

def save_momentum_record(spy: float, veu: float, bnd: float, signal: str, tbill: float = None, region: str = "US"):
    """Saves a momentum record to the database."""
    with Session(engine) as session:
        record = MomentumHistory(
            region=region,
            spy_mom=spy,
            veu_mom=veu,
            bnd_mom=bnd,
            tbill_mom=tbill,
            signal=signal
        )
        session.add(record)
        session.commit()
        session.refresh(record)
        print(f"Saved record: {record}")
        return record

def get_history(region: str = "US", limit: int = 100):
    """Fetches the last N records for a specific region. Default reduced to 100 for performance."""
    with Session(engine) as session:
        statement = select(MomentumHistory)\
            .where(MomentumHistory.region == region)\
            .order_by(MomentumHistory.date.desc())\
            .limit(limit)
        results = session.exec(statement).all()
        return results

def get_latest_signal_change(region: str = "US"):
    """
    Analyzes the full history to find the most recent signal change.
    Returns data about current signal, last change date, and previous signal.
    
    Returns:
        dict with keys:
        - has_history: bool
        - current_signal: str
        - days_since_change: int
        - last_change_date: str (ISO format)
        - previous_signal: str
        - previous_signal_duration_days: int
        - no_change_in_history: bool (optional, true if signal never changed)
    """
    with Session(engine) as session:
        # Query ALL records for the region, sorted by date DESC
        statement = select(MomentumHistory)\
            .where(MomentumHistory.region == region)\
            .order_by(MomentumHistory.date.desc())
        
        records = session.exec(statement).all()
        
        # Edge case: No history or insufficient data
        if not records or len(records) < 1:
            return {"has_history": False}
        
        current_signal = records[0].signal
        current_date = records[0].date
        
        # Edge case: Only one record
        if len(records) == 1:
            return {
                "has_history": True,
                "current_signal": current_signal,
                "days_since_change": 0,
                "no_change_in_history": True
            }
        
        # Find the first occurrence where signal differs from current
        change_index = None
        for i in range(1, len(records)):
            if records[i].signal != current_signal:
                change_index = i
                break
        
        # Edge case: Signal never changed in entire history
        if change_index is None:
            oldest_date = records[-1].date
            total_days = (datetime.now() - oldest_date).days
            return {
                "has_history": True,
                "current_signal": current_signal,
                "days_since_change": total_days,
                "no_change_in_history": True
            }
        
        # Normal case: Found a signal change
        change_date = records[change_index - 1].date  # Date when current signal started
        days_since_change = (datetime.now() - change_date).days
        previous_signal = records[change_index].signal
        
        # Calculate previous signal duration
        # Find where previous signal started
        prev_end_index = change_index
        prev_start_index = len(records) - 1  # Default to oldest record
        
        for i in range(change_index + 1, len(records)):
            if records[i].signal != previous_signal:
                prev_start_index = i - 1  # Last record of previous signal
                break
        
        prev_start_date = records[prev_start_index].date
        prev_end_date = records[prev_end_index].date
        prev_duration_days = (prev_end_date - prev_start_date).days
        
        return {
            "has_history": True,
            "current_signal": current_signal,
            "days_since_change": days_since_change,
            "last_change_date": change_date.isoformat(),
            "previous_signal": previous_signal,
            "previous_signal_duration_days": prev_duration_days
        }
