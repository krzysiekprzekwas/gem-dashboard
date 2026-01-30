import requests
import json
from datetime import datetime

def test_fetch(ticker):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=2y"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36"
    }
    
    try:
        resp = requests.get(url, headers=headers)
        data = resp.json()
        
        result = data['chart']['result'][0]
        meta = result['meta']
        indicators = result['indicators']['quote'][0]
        adjclose = result['indicators']['adjclose'][0]['adjclose']
        
        print(f"Success for {ticker}")
        print(f"Latest Price: {adjclose[-1]}")
        
    except Exception as e:
        print(f"Failed for {ticker}: {e}")
        print(resp.text[:200])

test_fetch("SPY")
