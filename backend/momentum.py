import requests
from datetime import datetime, timedelta
import json
import os

# Built-in strategy catalog. Each entry carries its own securities AND its own
# selection rule. `assets` is an ordered list (maps to DB slots 0-3). `canonical`
# strategies also declare `roles`; `argmax` holds every asset as an equal candidate.
STRATEGIES = {
    "gem-us": {
        "name": "Canonical GEM US",
        "rule": "canonical",
        "assets": ["SPY", "VEU", "BND", "^IRX"],
        "roles": {"equity": "SPY", "intl": "VEU", "bond": "BND", "threshold": "^IRX"},
    },
    "gem-eu": {
        "name": "Canonical GEM EU",
        "rule": "canonical",
        "assets": ["CSPX.AS", "EXUS.L", "AGGH.AS", "PJEU.DE"],
        "roles": {"equity": "CSPX.AS", "intl": "EXUS.L", "bond": "AGGH.AS", "threshold": "PJEU.DE"},
    },
    "max-gem-eu": {
        "name": "Max GEM EU",
        "rule": "argmax",
        "assets": ["EIMI.L", "CNDX.L", "CBU0.L", "IB01.L"],
    },
}


def compute_signal(config, momentum):
    """
    Pure rule engine: given a strategy config and a {ticker: 12mo-momentum} map,
    return the ticker to hold. Takes a config object (not an id) so a future
    user-supplied strategy plugs in here unchanged.
    """
    rule = config["rule"]

    if rule == "canonical":
        # Canonical Antonacci GEM: absolute-momentum gate on the ANCHOR equity only,
        # then relative momentum between the two equities, else the bond.
        r = config["roles"]
        if momentum[r["equity"]] > momentum[r["threshold"]]:
            return r["equity"] if momentum[r["equity"]] >= momentum[r["intl"]] else r["intl"]
        return r["bond"]

    if rule == "argmax":
        # Every asset competes (cash included) — buy the single top performer.
        return max(config["assets"], key=lambda t: momentum[t])

    raise ValueError(f"Unknown rule: {rule}")

# Simple in-memory cache for ticker data
# Reduces Yahoo Finance API calls and improves response time
_TICKER_CACHE = {}
_CACHE_TIMESTAMPS = {}
CACHE_DURATION_MINUTES = int(os.getenv("CACHE_DURATION_MINUTES", "15"))  # Default 15 minutes

def _is_cache_valid(ticker: str) -> bool:
    """Check if cached data for ticker is still valid."""
    if ticker not in _CACHE_TIMESTAMPS:
        return False
    age = datetime.now() - _CACHE_TIMESTAMPS[ticker]
    return age < timedelta(minutes=CACHE_DURATION_MINUTES)

def fetch_ticker_data(ticker):
    """
    Fetch 5 years of daily data from Yahoo Finance Chart API.
    Uses in-memory cache to reduce API calls and improve performance.
    Returns list of dicts: {'date': timestamp, 'price': adjClose}
    """
    # Check cache first
    if _is_cache_valid(ticker):
        print(f"Cache hit for {ticker}")
        return _TICKER_CACHE[ticker]
    
    print(f"Cache miss for {ticker}, fetching from Yahoo Finance...")
    
    # Use random user agents or specific ones to avoid 429
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    # query2 is often more reliable
    url = f"https://query2.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=5y"
    
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
        
        # Store in cache
        _TICKER_CACHE[ticker] = clean_data
        _CACHE_TIMESTAMPS[ticker] = datetime.now()
        
        return clean_data
    except Exception as e:
        print(f"Error parsing data for {ticker}: {e}")
        return []

def fetch_momentum_data(strategy="gem-us"):
    """
    Fetches historical data and calculates 12-month momentum for a strategy,
    then derives the signal via that strategy's rule.
    """
    if strategy not in STRATEGIES:
        strategy = "gem-us"

    config = STRATEGIES[strategy]
    momentum = {}
    prices = {}

    lookback_days = 252  # standard trading year

    for ticker in config["assets"]:
        data = fetch_ticker_data(ticker)

        if not data:
            momentum[ticker] = 0.0
            prices[ticker] = 0.0
            continue

        current = data[-1]['price']
        prices[ticker] = current

        # Find price ~252 records ago
        if len(data) > lookback_days:
            past = data[-1 - lookback_days]['price']
        else:
            past = data[0]['price']  # Fallback

        momentum[ticker] = 0.0 if past == 0 else (current / past) - 1.0

    signal = compute_signal(config, momentum)

    return {
        "strategy": strategy,
        "name": config["name"],
        "rule": config["rule"],
        "assets": config["assets"],
        "roles": config.get("roles"),
        "signal": signal,
        "momentum": momentum,   # keyed by ticker
        "prices": prices,
        "last_updated": datetime.now().isoformat()
    }


if __name__ == "__main__":
    # Rule self-check (pure, no network). Proves canonical vs argmax diverge on the
    # cases that matter, and that canonical gates on the anchor equity only.
    canon = STRATEGIES["gem-us"]
    argmax_cfg = {"rule": "argmax", "assets": canon["assets"]}

    # Bonds rip: canonical stays in the anchor equity; argmax buys bonds.
    m = {"SPY": 0.05, "VEU": 0.03, "BND": 0.09, "^IRX": 0.02}
    assert compute_signal(canon, m) == "SPY"
    assert compute_signal(argmax_cfg, m) == "BND"

    # Everything falls: canonical holds the losing bond; argmax parks in cash (^IRX).
    m = {"SPY": -0.03, "VEU": -0.05, "BND": -0.02, "^IRX": 0.02}
    assert compute_signal(canon, m) == "BND"
    assert compute_signal(argmax_cfg, m) == "^IRX"

    # Anchor-only gate: US anchor weak, intl strong -> canonical goes to bonds
    # (the old "either equity" variant would have picked VEU here).
    m = {"SPY": -0.01, "VEU": 0.08, "BND": 0.01, "^IRX": 0.02}
    assert compute_signal(canon, m) == "BND"
    assert compute_signal(argmax_cfg, m) == "VEU"

    print("momentum rule self-check passed")
