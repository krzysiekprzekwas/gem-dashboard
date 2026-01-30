import requests
from datetime import datetime
import json
import os

# Assets configuration by region
REGION_CONFIGS = {
    "US": {
        "Equity1": "SPY",
        "Equity2": "VEU",
        "Bond": "BND",
        "Threshold": "^IRX"
    },
    "EU": {
        "Equity1": "CSPX.AS",
        "Equity2": "EXUS.L",
        "Bond": "AGGH.AS",
        "Threshold": "PJEU.DE"
    }
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
    
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code != 200:
            print(f"Failed to fetch {ticker}: {resp.status_code}")
            return []
            
        data = resp.json()
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

def fetch_momentum_data(region="US"):
    """
    Fetches historical data and calculates 12-month momentum for a specific region.
    """
    if region not in REGION_CONFIGS:
        region = "US"
        
    config = REGION_CONFIGS[region]
    results = {}
    current_prices = {}
    
    lookback_days = 252 # standard trading year
    
    for key, ticker in config.items():
        data = fetch_ticker_data(ticker)
        
        if not data:
            results[key] = 0.0
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
            results[key] = 0.0
        else:
            results[key] = (current / past) - 1.0

    # Get momentum values
    eq1_mom = results.get('Equity1', 0)
    eq2_mom = results.get('Equity2', 0)
    threshold_mom = results.get('Threshold', 0)
    
    # Determine Signal
    signal = config["Bond"]
    if eq1_mom > threshold_mom or eq2_mom > threshold_mom:
        if eq1_mom > eq2_mom:
            signal = config["Equity1"]
        else:
            signal = config["Equity2"]
            
    return {
        "region": region,
        "signal": signal,
        "momentum": {
            config["Equity1"]: eq1_mom,
            config["Equity2"]: eq2_mom,
            config["Bond"]: results.get("Bond", 0),
            "THRESHOLD": threshold_mom  # Generic key for frontend
        },
        "prices": current_prices,
        "last_updated": datetime.now().isoformat()
    }
