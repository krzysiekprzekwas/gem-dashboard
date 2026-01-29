import requests

try:
    res = requests.get('http://localhost:8000/api/history')
    data = res.json()
    print(f"API returned {len(data)} items")
except Exception as e:
    print(e)
