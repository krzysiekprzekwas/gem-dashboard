from sqlmodel import Session, SQLModel, create_engine, select
from backend.database import MomentumHistory, engine
from datetime import datetime, timedelta
import yfinance as yf
import pandas as pd
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ASSETS = {
    "US": "SPY",
    "Global_ex_US": "VEU",
    "Bond": "BND"
}

def seed_real_data():
    SQLModel.metadata.create_all(engine)
    
    with Session(engine) as session:
        # Clear existing data to avoid duplicates/conflicts for this demo
        logger.info("Clearing existing history...")
        # Proper deletion in SQLModel
        statement = select(MomentumHistory)
        results = session.exec(statement).all()
        for res in results:
            session.delete(res)
        session.commit()


        logger.info("Fetching real market data for backfill...")
        
        # We need data for the last 180 days + 12 months lookback
        end_date = datetime.now()
        start_date = end_date - timedelta(days=800) # Buffer for 12 months + 180 days
        
        tickers = list(ASSETS.values())
        data = yf.download(tickers, start=start_date, end=end_date, progress=False)
        
        # Handle MultiIndex if necessary (same logic as momentum.py)
        if isinstance(data.columns, pd.MultiIndex):
            if 'Adj Close' in data.columns.get_level_values(0):
               df = data.xs('Adj Close', axis=1, level=0)
            elif 'Close' in data.columns.get_level_values(0):
               df = data.xs('Close', axis=1, level=0)
            else:
               df = data
        else:
            df = data

        # Generate records for the last 180 days
        # We look at the last 180 *trading* days available in the dataframe
        
        recent_data = df.tail(180) 

        
        for date, row in recent_data.iterrows():
            # For each day, we need the price ~252 trading days prior TO THAT DATE
            
            # Find the index of the current date in the full dataframe
            try:
                current_idx = df.index.get_loc(date)
                
                # Check if we have enough history for lookback
                if current_idx < 252:
                    logger.warning(f"Not enough history for {date}, skipping.")
                    continue
                
                prev_idx = current_idx - 252
                
                # Calculate momentum
                moms = {}
                for ticker in tickers:
                    curr_price = df[ticker].iloc[current_idx]
                    prev_price = df[ticker].iloc[prev_idx]
                    moms[ticker] = (curr_price / prev_price) - 1
                
                # Determine Signal
                spy_mom = moms['SPY']
                veu_mom = moms['VEU']
                signal = "BND"
                
                if spy_mom > 0 or veu_mom > 0:
                    if spy_mom > veu_mom:
                        signal = "SPY"
                    else:
                        signal = "VEU"
                
                record = MomentumHistory(
                    date=date, # Pandas Timestamp is compatible
                    spy_mom=spy_mom,
                    veu_mom=veu_mom,
                    bnd_mom=moms['BND'],
                    signal=signal
                )
                session.add(record)
                
            except Exception as e:
                logger.error(f"Error processing {date}: {e}")
                continue
                
        session.commit()
        logger.info("Successfully backfilled real data!")

if __name__ == "__main__":
    seed_real_data()
