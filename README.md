# 💎 GEM Dashboard (Global Equity Momentum)

[![Status](https://img.shields.io/badge/Status-Live-success)]()
[![Stack](https://img.shields.io/badge/Stack-FastAPI%20%7C%20Next.js%20%7C%20Tailwind-blue)]()

A "Bloomberg-lite" dashboard for tracking **Global Equity Momentum (GEM)**. This application monitors the 12-month momentum of US Stocks (SPY), Global ex-US Stocks (VEU), and Aggregate Bonds (BND) to generate clear, actionable asset allocation signals.

![GEM Dashboard Preview](https://github.com/user-attachments/assets/PLACEHOLDER_IMAGE)

## 🚀 Features

- **Live Signal Generation**: Real-time calculation of GEM signals based on 12-month adjusted close momentum.
- **Historical Tracking**: automated daily tacking of momentum scores and signal changes.
- **Allocation Analysis**: Visualizes signal shifts, current trend duration, and historical effectiveness.
- **Robust Backend**: FastAPI service with background scheduling and SQLite persistence.
- **Modern Frontend**: Responsive Next.js dashboard with Shadcn/UI and Recharts.

## 🛠 Tech Stack

- **Backend**: Python, FastAPI, yfinance, Pandas, SQLite
- **Frontend**: TypeScript, Next.js (App Router), Tailwind CSS, Shadcn/UI, Recharts
- **DevOps**: standard `pip` and `npm` workflows

## ⚡️ Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python main.py
```
*The API will be available at `http://localhost:8000`*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*The Dashboard will be available at `http://localhost:3000`*

## 📈 How It Works

The **Global Equity Momentum** strategy is a rule-based trend-following model:
1. **Compare**: Calculate 12-month return for SPY and VEU.
2. **Filter**: If the best asset's return is positive (> bill rate), allocate to that asset.
3. **Safety**: If both equities are negative, move to defensive Bonds (BND).

This dashboard automates this logic, providing a persistent "Check Engine Light" for your portfolio.

## 📄 License
MIT
