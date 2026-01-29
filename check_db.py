from sqlmodel import Session, select
from backend.database import MomentumHistory, engine

def check_count():
    with Session(engine) as session:
        statement = select(MomentumHistory)
        results = session.exec(statement).all()
        print(f"Total records in DB: {len(results)}")
        if results:
            print(f"Oldest: {results[0].date}")
            print(f"Newest: {results[-1].date}")

if __name__ == "__main__":
    check_count()
