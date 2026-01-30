import requests
from datetime import datetime
import json
import os

# Assets
ASSETS = {
    "US": "SPY",
    "Global_ex_US": "VEU",
    "Bond": "BND",
    "TBill": "^IRX"
}

def fetch_ticker_data(ticker):
    """
    Fetch 2 years of daily data from Yahoo Finance Chart API.
    Returns list of dicts: {'date': timestamp, 'price': adjClose}
    """
    # Use random user agents or specific ones to avoid 429
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    # query2 is often more reliable
    url = f"https://query2.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=2y"
    
    resp = requests.get(url, headers=headers)
    if resp.status_code != 200:
        print(f"Failed to fetch {ticker}: {resp.status_code} {resp.text}")
        return []
        
    data = resp.json()
    try:
        result = data['chart']['result'][0]
        timestamps = result['timestamp']
        adj_close = result['indicators']['adjclose'][0]['adjclose']
        
        # Zip them (filtering out any None values)
        clean_data = []
        for t, p in zip(timestamps, adj_close):
            if p is not None:
                clean_data.append({'date': t, 'price': p})
        
        return clean_data
    except Exception as e:
        print(f"Error parsing data for {ticker}: {e}")
        return []

def fetch_momentum_data():
    """
    Fetches historical data and calculates 12-month momentum (approx 252 trading days).
    Uses T-Bill returns as the threshold for equity allocation.
    No Pandas/Numpy required.
    """
    results = {}
    current_prices = {}
    
    lookback_days = 252 # standard trading year
    
    for name, ticker in ASSETS.items():
        data = fetch_ticker_data(ticker)
        
        if not data:
            results[ticker] = 0.0
            current_prices[ticker] = 0.0
            continue
            
        current = data[-1]['price']
        current_prices[ticker] = current
        
        # Find price ~252 records ago
        if len(data) > lookback_days:
            past = data[-1 - lookback_days]['price']
        else:
            past = data[0]['price'] # Fallback
            
        if past == 0:
            results[ticker] = 0.0
        else:
            results[ticker] = (current / past) - 1.0

    # Get momentum values
    spy_mom = results.get('SPY', 0)
    veu_mom = results.get('VEU', 0)
    tbill_mom = results.get('^IRX', 0)
    
    # Determine Signal - use T-Bill as threshold instead of 0
    signal = "BND"
    if spy_mom > tbill_mom or veu_mom > tbill_mom:
        if spy_mom > veu_mom:
            signal = "SPY"
        else:
            signal = "VEU"
            
    return {
        "signal": signal,
        "momentum": {
            "SPY": spy_mom,
            "VEU": veu_mom,
            "BND": results.get("BND", 0),
            "TBILL": tbill_mom
        },
        "prices": {
             t: current_prices.get(t, 0) for t in ASSETS.values()
        },
        "last_updated": datetime.now().isoformat()
    }
