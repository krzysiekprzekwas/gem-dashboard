from fastapi import FastAPI, HTTPException, BackgroundTasks, Header
import os
from fastapi.middleware.cors import CORSMiddleware

try:
    from .momentum import fetch_momentum_data, REGION_CONFIGS
    from .database import (
        create_db_and_tables,
        save_momentum_record,
        get_history,
        get_latest_signal_change,
    )
except ImportError:
    from momentum import fetch_momentum_data, REGION_CONFIGS
    from database import (
        create_db_and_tables,
        save_momentum_record,
        get_history,
        get_latest_signal_change,
    )

from contextlib import asynccontextmanager
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def update_momentum_history():
    """
    Fetch momentum data and save to history for all regions.
    Called by Vercel cron job via /api/cron-update endpoint.
    """
    logger.info(f"=== Cron job started at {datetime.now().isoformat()} ===")
    regions = ["US", "EU"]
    success_count = 0

    for region in regions:
        try:
            logger.info(f"Starting scheduled momentum update for {region}...")
            data = fetch_momentum_data(region=region)

            # Extract tickers for the region to mapping to spy_mom, veu_mom etc
            # This is a bit tricky because the DB schema is fixed with spy_mom, veu_mom
            # We'll map Eq1 -> spy, Eq2 -> veu, Bond -> bnd, Threshold -> tbill
            config = REGION_CONFIGS[region]

            record = save_momentum_record(
                spy=data["momentum"][config["Equity1"]],
                veu=data["momentum"][config["Equity2"]],
                bnd=data["momentum"][config["Bond"]],
                tbill=data["momentum"]["THRESHOLD"],
                signal=data["signal"],
                region=region,
            )
            logger.info(
                f"✓ Successfully saved momentum record for {region}: ID={record.id}, Signal={record.signal}"
            )
            success_count += 1
        except Exception as e:
            logger.error(
                f"✗ Failed to update momentum history for {region}: {e}", exc_info=True
            )

    logger.info(
        f"=== Cron job completed. Success: {success_count}/{len(regions)} regions ==="
    )
    return {"success_count": success_count, "total_regions": len(regions)}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for FastAPI application.

    Note: APScheduler background jobs are NOT compatible with Vercel's serverless architecture.
    Scheduled updates are handled by Vercel Cron Jobs calling /api/cron-update endpoint.
    See vercel.json for cron configuration (runs weekdays at 12:00 UTC / 13:00 CET).
    """
    # Startup: Initialize database
    logger.info("Initializing database...")
    create_db_and_tables()
    logger.info("Database initialized successfully")

    yield

    # Shutdown: No cleanup needed for serverless
    logger.info("Application shutdown")


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
def cron_update(
    background_tasks: BackgroundTasks,
    auth_header: str | None = Header(default=None, alias="Authorization"),
):
    """
    Triggered by Vercel Cron Job (weekdays at 12:00 UTC / 13:00 CET).
    Authenticates using CRON_SECRET environment variable.
    Updates momentum history for all regions (US, EU).
    """
    logger.info(f"Cron endpoint called at {datetime.now().isoformat()}")

    # Verify authentication
    cron_secret = os.getenv("CRON_SECRET")
    if cron_secret and auth_header != f"Bearer {cron_secret}":
        logger.warning(
            f"Unauthorized cron attempt from header: {auth_header[:20] if auth_header else 'None'}..."
        )
        raise HTTPException(status_code=401, detail="Unauthorized")

    if not cron_secret:
        logger.warning("CRON_SECRET not set in environment variables!")

    logger.info("Authentication successful, triggering momentum update...")
    background_tasks.add_task(update_momentum_history)

    return {
        "message": "Momentum history update triggered successfully",
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
    }


if __name__ == "__main__":
    import uvicorn

    # run with reload for dev
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
