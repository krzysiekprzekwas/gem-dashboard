from fastapi import FastAPI, HTTPException, BackgroundTasks, Header
import os
from fastapi.middleware.cors import CORSMiddleware

try:
    from .momentum import fetch_momentum_data, STRATEGIES
    from .database import (
        create_db_and_tables,
        save_momentum_record,
        get_history,
        get_latest_signal_change,
    )
except ImportError:
    from momentum import fetch_momentum_data, STRATEGIES
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
    Fetch momentum data and save to history for every strategy.
    Called by Vercel cron job via /api/cron-update endpoint.
    """
    logger.info(f"=== Cron job started at {datetime.now().isoformat()} ===")
    success_count = 0

    for strategy in STRATEGIES:
        try:
            logger.info(f"Starting scheduled momentum update for {strategy}...")
            data = fetch_momentum_data(strategy=strategy)

            # Ordered assets map to the 4 fixed DB slots (spy/veu/bnd/tbill).
            # See database.py — the columns are generic slots now, not real tickers.
            assets = data["assets"]
            mom = data["momentum"]

            record = save_momentum_record(
                spy=mom[assets[0]],
                veu=mom[assets[1]],
                bnd=mom[assets[2]],
                tbill=mom[assets[3]] if len(assets) > 3 else None,
                signal=data["signal"],
                region=strategy,
            )
            logger.info(
                f"✓ Successfully saved momentum record for {strategy}: ID={record.id}, Signal={record.signal}"
            )
            success_count += 1
        except Exception as e:
            logger.error(
                f"✗ Failed to update momentum history for {strategy}: {e}", exc_info=True
            )

    logger.info(
        f"=== Cron job completed. Success: {success_count}/{len(STRATEGIES)} strategies ==="
    )
    return {"success_count": success_count, "total_strategies": len(STRATEGIES)}


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
def get_momentum(strategy: str = "gem-us"):
    try:
        data = fetch_momentum_data(strategy=strategy)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/history")
def read_history(strategy: str = "gem-us", limit: int = 100):
    """
    Fetch persistent history for a specific strategy.

    Args:
        strategy: Strategy id (e.g. gem-us, gem-eu, max-gem-eu)
        limit: Maximum number of records to return (default 100)
    """
    return get_history(region=strategy, limit=limit)


@app.get("/api/allocation-changes")
def get_allocation_changes(strategy: str = "gem-us"):
    """
    Get allocation change analysis for a specific strategy.

    Returns information about the most recent signal change,
    independent of any date range filtering.

    Args:
        strategy: Strategy id (e.g. gem-us, gem-eu, max-gem-eu)
    """
    try:
        result = get_latest_signal_change(region=strategy)
        return result
    except Exception as e:
        logger.error(f"Error fetching allocation changes for {strategy}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/cron-update")
def cron_update(
    background_tasks: BackgroundTasks,
    auth_header: str | None = Header(default=None, alias="Authorization"),
):
    """
    Triggered by Vercel Cron Job (weekdays at 12:00 UTC / 13:00 CET).
    Authenticates using CRON_SECRET environment variable.
    Updates momentum history for every strategy in the catalog.
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
