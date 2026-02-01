from fastapi import FastAPI, HTTPException, BackgroundTasks, Header
import os
from fastapi.middleware.cors import CORSMiddleware
try:
    from .momentum import fetch_momentum_data
    from .database import create_db_and_tables, save_momentum_record, get_history, get_latest_signal_change
except ImportError:
    from momentum import fetch_momentum_data
    from database import create_db_and_tables, save_momentum_record, get_history, get_latest_signal_change

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from contextlib import asynccontextmanager
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def update_momentum_history():
    """Detailed logic to fetch data and save to history for all regions."""
    regions = ["US", "EU"]
    for region in regions:
        try:
            logger.info(f"Starting scheduled momentum update for {region}...")
            data = fetch_momentum_data(region=region)
            
            # Extract tickers for the region to mapping to spy_mom, veu_mom etc
            # This is a bit tricky because the DB schema is fixed with spy_mom, veu_mom
            # We'll map Eq1 -> spy, Eq2 -> veu, Bond -> bnd, Threshold -> tbill
            from momentum import REGION_CONFIGS
            config = REGION_CONFIGS[region]
            
            record = save_momentum_record(
                spy=data['momentum'][config['Equity1']],
                veu=data['momentum'][config['Equity2']],
                bnd=data['momentum'][config['Bond']],
                tbill=data['momentum']['THRESHOLD'],
                signal=data['signal'],
                region=region
            )
            logger.info(f"Successfully saved momentum record for {region}: {record}")
        except Exception as e:
            logger.error(f"Failed to update momentum history for {region}: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    create_db_and_tables()
    
    scheduler = BackgroundScheduler()
    # Schedule for 4:00 PM EST (New York time) every week day
    trigger = CronTrigger(day_of_week='mon-fri', hour=16, minute=10, timezone='America/New_York')
    scheduler.add_job(update_momentum_history, trigger)
    scheduler.start()
    logger.info("Scheduler started.")
    
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
def get_momentum(region: str = "US"):
    try:
        data = fetch_momentum_data(region=region)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history")
def read_history(region: str = "US", limit: int = 100):
    """
    Fetch persistent history for a specific region.
    
    Args:
        region: Market region (US or EU)
        limit: Maximum number of records to return (default 100)
    """
    return get_history(region=region, limit=limit)

@app.get("/api/allocation-changes")
def get_allocation_changes(region: str = "US"):
    """
    Get allocation change analysis for a specific region.
    
    Returns information about the most recent signal change,
    independent of any date range filtering.
    
    Args:
        region: Market region (US or EU)
    """
    try:
        result = get_latest_signal_change(region=region)
        return result
    except Exception as e:
        logger.error(f"Error fetching allocation changes for {region}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/cron-update")
def cron_update(background_tasks: BackgroundTasks, auth_header: str | None = Header(default=None, alias="Authorization")):
    """
    Triggered by Vercel Cron. 
    """
    cron_secret = os.getenv("CRON_SECRET")
    if cron_secret and auth_header != f"Bearer {cron_secret}":
         logger.warning("Unauthorized cron attempt")
         raise HTTPException(status_code=401, detail="Unauthorized")

    background_tasks.add_task(update_momentum_history)
    return {"message": "Update triggered", "status": "ok"}


if __name__ == "__main__":
    import uvicorn
    # run with reload for dev
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
