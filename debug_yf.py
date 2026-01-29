import yfinance as yf
import pandas as pd

tickers = ["SPY", "VEU", "BND"]
data = yf.download(tickers, period="1mo", progress=False)
print("Columns:", data.columns)
print("Head:", data.head())
try:
    print("Adj Close:", data['Adj Close'])
except Exception as e:
    print("Error accessing Adj Close:", e)
