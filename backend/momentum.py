import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta

# Assets
ASSETS = {
    "US": "SPY",
    "Global_ex_US": "VEU",
    "Bond": "BND"
}

def fetch_momentum_data():
    """
    Fetches historical data for SPY, VEU, BND and calculates 12-month momentum.
    Returns a dictionary with momentum values and the current signal.
    """
    end_date = datetime.now()
    start_date = end_date - timedelta(days=400) # Fetch more than 365 days to ensure coverage

    tickers = list(ASSETS.values())
    
    # Download data
    data = yf.download(tickers, start=start_date, end=end_date, progress=False)
    
    # Check if data is empty
    if data.empty:
        raise Exception("Failed to fetch data from yfinance")

    # Handle MultiIndex columns (Price, Ticker)
    if isinstance(data.columns, pd.MultiIndex):
        try:
            # Try to get Adj Close, if not available use Close
            if 'Adj Close' in data.columns.get_level_values(0):
               df = data.xs('Adj Close', axis=1, level=0)
            elif 'Close' in data.columns.get_level_values(0):
               df = data.xs('Close', axis=1, level=0)
            else:
               # Fallback: assume columns are tickers if single level, or try to flatten
               df = data
        except Exception as e:
            print(f"Error processing columns: {e}")
            df = data # Last resort
    else:
        data = data # Single ticker or different format
    
    # Update data reference
    data = df



    results = {}
    
    for name, ticker in ASSETS.items():
        if ticker not in data.columns:
            results[name] = None
            continue
            
        series = data[ticker].dropna()
        if len(series) == 0:
            results[name] = None
            continue

        current_price = series.iloc[-1]
        
        # approximate 12 months ago (252 trading days)
        # Using exact date might fail if it was a weekend, so iloc is safer for 'momentum' 
        # usually 12-month momentum is defined as price today / price 12 months ago - 1
        # or log returns. We will use simple percentage change.
        
        try:
            # Get price roughly 1 year ago (252 trading days is standard, but calendar year is 365 days)
            # Simplest approach: resample or find closest index.
            # Let's use 252 trading days lookback.
            dist = 252
            if len(series) < dist:
                 # Fallback if not enough data (unlikely for these ETFs)
                 price_12m_ago = series.iloc[0]
            else:
                 price_12m_ago = series.iloc[-dist]
                 
            momentum = (current_price / price_12m_ago) - 1
            results[ticker] = momentum
        except Exception as e:
            print(f"Error calcing momentum for {ticker}: {e}")
            results[ticker] = 0.0

    # Determine Signal
    # Logic:
    # 1. Compare SPY and VEU.
    # 2. Winner must be > Risk Free (0).
    # 3. If both < 0, go to BND.
    
    spy_mom = results.get('SPY', 0)
    veu_mom = results.get('VEU', 0)
    
    signal = "BND" # Default defensive
    
    if spy_mom > 0 or veu_mom > 0:
        if spy_mom > veu_mom:
            signal = "SPY"
        else:
            signal = "VEU"
    
    # Return structured data
    return {
        "signal": signal,
        "momentum": {
            "SPY": spy_mom,
            "VEU": veu_mom,
            "BND": results.get("BND", 0)
        },
        "prices": {
             # Return latest prices for display if needed
             t: data[t].dropna().iloc[-1] for t in tickers if t in data.columns
        },
        "last_updated": end_date.isoformat()
    }

if __name__ == "__main__":
    print(fetch_momentum_data())
