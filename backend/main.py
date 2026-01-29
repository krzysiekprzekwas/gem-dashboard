from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
try:
    from .momentum import fetch_momentum_data
    from .database import create_db_and_tables, save_momentum_record, get_history
except ImportError:
    from momentum import fetch_momentum_data
    from database import create_db_and_tables, save_momentum_record, get_history

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from contextlib import asynccontextmanager
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def update_momentum_history():
    """Detailed logic to fetch data and save to history."""
    try:
        logger.info("Starting scheduled momentum update...")
        data = fetch_momentum_data()
        record = save_momentum_record(
            spy=data['momentum']['SPY'],
            veu=data['momentum']['VEU'],
            bnd=data['momentum']['BND'],
            signal=data['signal']
        )
        logger.info(f"Successfully saved momentum record: {record}")
    except Exception as e:
        logger.error(f"Failed to update momentum history: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    create_db_and_tables()
    
    scheduler = BackgroundScheduler()
    # Schedule for 4:00 PM EST (New York time) every week day
    trigger = CronTrigger(day_of_week='mon-fri', hour=16, minute=0, timezone='America/New_York')
    scheduler.add_job(update_momentum_history, trigger)
    scheduler.start()
    logger.info("Scheduler started for 4:00 PM EST.")
    
    yield
    
    # Shutdown
    scheduler.shutdown()

app = FastAPI(title="GEM Dashboard API", lifespan=lifespan)

# Configure CORS
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "GEM Dashboard API is running"}

@app.get("/api/momentum")
def get_momentum():
    try:
        data = fetch_momentum_data()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history")
def read_history():
    """Fetch persistent history."""
    return get_history()

@app.post("/api/trigger-update")
def trigger_update(background_tasks: BackgroundTasks):
    """Manually trigger an update (for testing or backfill)."""
    background_tasks.add_task(update_momentum_history)
    return {"message": "Update triggered in background"}

if __name__ == "__main__":
    import uvicorn
    # run with reload for dev
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
