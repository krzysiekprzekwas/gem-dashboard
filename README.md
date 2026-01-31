# GEM Dashboard 📈

A full-stack web application that implements the **Global Equity Momentum (GEM)** investment strategy. Track real-time momentum signals, visualize historical performance, and monitor allocation changes across multiple regional markets.

![Next.js](https://img.shields.io/badge/Next.js-16.1-black) ![React](https://img.shields.io/badge/React-19.2-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-latest-green) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Python](https://img.shields.io/badge/Python-3.x-yellow)

---

## 🎯 Features

- **📊 Real-Time Momentum Tracking** - Live 12-month momentum calculation for equity and bond assets
- **🌍 Multi-Region Support** - US markets and EU UCITS-compliant instruments
- **📈 Historical Visualization** - Interactive charts showing momentum trends over time
- **🔔 Allocation Signals** - Clear buy/hold recommendations based on momentum analysis
- **📅 Signal History** - Timeline of allocation changes with date tracking
- **🌓 Dark/Light Theme** - Full theme support with automatic preference detection
- **🔄 Auto-Updates** - Data refreshes every 60 seconds with scheduled daily updates
- **📱 Responsive Design** - Mobile-friendly interface built with TailwindCSS v4

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Next.js 16](https://nextjs.org) (App Router) with [React 19](https://react.dev)
- **Language**: [TypeScript](https://www.typescriptlang.org) (Strict mode)
- **Styling**: [TailwindCSS v4](https://tailwindcss.com)
- **UI Components**: [Radix UI](https://www.radix-ui.com) primitives
- **Charts**: [Recharts](https://recharts.org) for data visualization
- **Theme**: [next-themes](https://github.com/pacocoursey/next-themes)

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com) (Python)
- **Database**: [SQLModel](https://sqlmodel.tiangolo.com) with SQLite (dev) / PostgreSQL (prod)
- **Scheduler**: [APScheduler](https://apscheduler.readthedocs.io) for automated updates
- **Data Source**: Yahoo Finance Chart API

### Deployment
- **Platform**: [Vercel](https://vercel.com) (Serverless Functions)
- **Cron Jobs**: Vercel Cron for scheduled data updates

---

## 📋 Prerequisites

- **Node.js** 20.x or higher
- **Python** 3.10 or higher
- **npm** or **yarn** or **pnpm**

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/krzysiekprzekwas/gem-dashboard.git
cd gem-dashboard
```

### 2. Install Dependencies

#### Frontend (Node.js)
```bash
npm install
```

#### Backend (Python)
```bash
cd backend
pip install -r requirements.txt
cd ..
```

### 3. Environment Configuration

Create a `.env.local` file in the root directory:

```env
# Optional: API URL for frontend (defaults to /api via rewrites)
NEXT_PUBLIC_API_URL=http://localhost:8000/api

# Production only: PostgreSQL connection string
DATABASE_URL=postgresql://user:password@host:port/database

# Production only: Cron endpoint authentication
CRON_SECRET=your-secret-token-here
```

### 4. Run Development Servers

You need to run **both** the frontend and backend servers:

#### Terminal 1: Backend (FastAPI)
```bash
cd backend
python main.py
```
Backend runs on **http://localhost:8000**

#### Terminal 2: Frontend (Next.js)
```bash
npm run dev
```
Frontend runs on **http://localhost:3000**

### 5. Open the Application

Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗂️ Project Structure

```
gem-triggers/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Main dashboard page
│   ├── layout.tsx                # Root layout with providers
│   └── globals.css               # Global styles & Tailwind
│
├── components/                   # React components
│   ├── allocation-changes.tsx    # Signal change timeline
│   ├── history-chart.tsx         # Momentum visualization
│   ├── history-table.tsx         # Historical data table
│   ├── theme-toggle.tsx          # Dark/light mode switcher
│   └── ui/                       # Radix UI component wrappers
│
├── lib/                          # Utilities
│   ├── api.ts                    # API client & TypeScript types
│   └── utils.ts                  # Helper functions (cn)
│
├── backend/                      # Python FastAPI backend
│   ├── main.py                   # FastAPI app & endpoints
│   ├── momentum.py               # Momentum calculation logic
│   ├── database.py               # SQLModel schema & operations
│   └── requirements.txt          # Python dependencies
│
├── api/                          # Vercel serverless functions
│   └── index.py                  # Entry point for Vercel
│
├── public/                       # Static assets
├── AGENTS.md                     # Developer guide (concise)
├── Agents.md                     # Comprehensive documentation
└── vercel.json                   # Vercel config (rewrites, crons)
```

---

## 🌐 API Endpoints

### Backend (FastAPI)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/api/momentum?region={US\|EU}` | GET | Real-time momentum data |
| `/api/history?region={US\|EU}` | GET | Historical momentum records |
| `/api/cron-update` | GET | Scheduled update (requires auth) |

---

## 📊 Supported Markets

### US Region
- **SPY** - S&P 500 ETF Trust
- **VEU** - Vanguard FTSE All-World ex-US ETF
- **BND** - Vanguard Total Bond Market ETF
- **^IRX** - 13-week Treasury Bill (risk-free rate)

### EU Region (UCITS)
- **CSPX.AS** - iShares Core S&P 500 UCITS ETF (Amsterdam)
- **EXUS.L** - iShares MSCI World ex-US UCITS ETF (London)
- **AGGH.AS** - iShares Core Global Aggregate Bond UCITS ETF (Amsterdam)
- **PJEU.DE** - Invesco EUR Liquidity Portfolio (Frankfurt)

---

## 🎨 Available Scripts

### Frontend
```bash
npm run dev      # Start development server
npm run build    # Create production build
npm start        # Run production build
npm run lint     # Run ESLint
```

### Backend
```bash
python backend/main.py              # Development server (hot reload)
uvicorn backend.main:app --reload   # Alternative dev command
```

---

## 🚢 Deployment (Vercel)

### 1. Push to GitHub
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Connect to Vercel
1. Import your repository on [Vercel](https://vercel.com/new)
2. Framework Preset: **Next.js**
3. Root Directory: `/` (default)

### 3. Environment Variables
Add these in Vercel Dashboard → Settings → Environment Variables:

| Variable | Value | Required |
|----------|-------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Production |
| `CRON_SECRET` | Random secure token | Production |

### 4. Deploy
Vercel automatically:
- Builds the Next.js frontend
- Deploys Python backend as serverless functions
- Sets up API rewrites (`/api/*` → `api/index.py`)
- Configures cron jobs for daily updates

---

## 📊 Analytics & Monitoring

The dashboard includes **Vercel Analytics** and **Vercel Speed Insights** for production monitoring.

### Features
- 📈 Page views and visitor tracking
- ⚡ Core Web Vitals (LCP, FID, CLS, TTFB)
- 🌍 Geographic and device breakdown
- 🚀 Real User Monitoring (RUM)
- 🔒 Privacy-friendly (no cookies, GDPR compliant)

### Viewing Data
1. Go to your project on [Vercel](https://vercel.com)
2. Click **Analytics** tab for Web Analytics
3. Click **Speed Insights** tab for performance data

**Note:** Analytics are automatically enabled on Vercel deployments and disabled in local development.

---

## 🔧 Configuration

### Momentum Calculation
- **Lookback Period**: 252 trading days (~12 months)
- **Formula**: `(current_price / price_252_days_ago) - 1`
- **Update Schedule**: Mon-Fri at 4:10 PM EST (market close)

### Signal Logic
1. If either equity momentum > threshold momentum:
   - Allocate to equity with higher momentum
2. Otherwise:
   - Allocate to bonds (defensive positioning)

### Data Retention
- Historical records: Unlimited (1000 max per query)
- Database: SQLite (dev), PostgreSQL (prod)

---

## 🐛 Troubleshooting

### "Failed to connect to backend service"
- Ensure backend is running: `python backend/main.py`
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Verify CORS settings in `backend/main.py`

### "Failed to fetch {ticker}"
- Yahoo Finance API may be temporarily unavailable
- Check ticker symbols are valid and not delisted
- Rate limiting: Add delays between requests

### Database Locked Error (SQLite)
- Multiple processes accessing same database file
- Use PostgreSQL for production deployments
- Ensure `check_same_thread=False` in SQLite config

### Charts Not Displaying
- Check browser console for errors
- Verify historical data exists in database
- Ensure date formats are valid ISO strings

---

## 📚 Documentation

- **[AGENTS.md](AGENTS.md)** - Concise coding guide for AI agents and developers (150 lines)
- **[Agents.md](Agents.md)** - Comprehensive project documentation (529 lines)

---

## 🎓 Strategy Background

The **Global Equity Momentum (GEM)** strategy is a dual momentum approach developed by Gary Antonacci:

1. **Absolute Momentum**: Compare equity returns vs. risk-free rate
2. **Relative Momentum**: Compare domestic vs. international equities
3. **Defensive Positioning**: Rotate to bonds when momentum is negative

### References
- [Global Equity Momentum Executive Summary](https://investresolve.com/global-equity-momentum-executive-summary/)
- [Original Research Paper (Antonacci, 2014)](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2435323)
- [Dual Momentum GEM Analysis](https://blog.thinknewfound.com/2019/01/fragility-case-study-dual-momentum-gem/)

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the code style in [AGENTS.md](AGENTS.md)
4. Test both US and EU regions
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

---

## 📝 License

This project is open source and available for personal and educational use.

---

## 💖 Support

**Built by**: [Kristof.pro](https://kristof.pro)

If you find this project helpful, consider supporting:

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Support-yellow?style=for-the-badge&logo=buy-me-a-coffee)](https://buymeacoffee.com/kristof.pro)

---

## 🔮 Future Enhancements

- [ ] Multiple strategy support (trend following, risk parity)
- [ ] Backtesting module with performance metrics
- [ ] Email/SMS notifications for signal changes
- [ ] Portfolio integration with brokerage APIs
- [ ] Custom asset selection
- [ ] Advanced metrics (Sharpe ratio, max drawdown, CAGR)
- [ ] Export data to CSV/PDF
- [ ] Comprehensive test suite

---

## ⭐ Star History

If you find this project useful, please give it a star! ⭐

---

*Last updated: January 2025*
