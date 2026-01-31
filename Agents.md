# AGENTS.md - GEM Dashboard Coding Guide

## Quick Reference

**Project**: Global Equity Momentum (GEM) Dashboard - Next.js 16 + FastAPI investment strategy tracker  
**Stack**: Next.js 16 (React 19) + TypeScript + TailwindCSS v4 | FastAPI + SQLModel + SQLite/PostgreSQL  

---

## Build, Lint & Test Commands

### Frontend (Next.js)
```bash
npm run dev          # Development server (http://localhost:3000)
npm run build        # Production build
npm start            # Run production build
npm run lint         # Run ESLint
```

### Backend (FastAPI)
```bash
cd backend
python main.py       # Development server with hot reload (http://localhost:8000)

# Production
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Testing
**Currently no test suite configured.** When adding tests:
- Frontend: Install and use Vitest or Jest
- Backend: Install and use pytest
- Run single test: `pytest backend/test_momentum.py::test_function_name`

---

## Code Style Guidelines

### TypeScript/React

#### Imports
- Use `@/` path alias for project root imports
- Order: React → Next.js → External libs → Internal components → Types → Utils
- Example:
```typescript
"use client";

import { useEffect, useState } from "react";
import { fetchMomentumData, MomentumData } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
```

#### Component Structure
- **Always** use `"use client"` directive for client components
- Prefer functional components with hooks (no class components)
- Use TypeScript interfaces for props and data structures
- Example:
```typescript
"use client";

interface MyComponentProps {
  data: MomentumData;
  onUpdate: () => void;
}

export function MyComponent({ data, onUpdate }: MyComponentProps) {
  const [loading, setLoading] = useState(false);
  // ...
}
```

#### Naming Conventions
- **Components**: PascalCase with descriptive names (`AllocationChanges`, `HistoryTable`)
- **Files**: kebab-case matching component name (`allocation-changes.tsx`, `history-table.tsx`)
- **Functions**: camelCase (`fetchMomentumData`, `handleRegionChange`)
- **Interfaces/Types**: PascalCase (`MomentumData`, `HistoryRecord`)
- **Constants**: SCREAMING_SNAKE_CASE or camelCase based on context

#### Type Safety
- Enable strict mode (already configured in `tsconfig.json`)
- Avoid `any` - use `unknown` or proper types
- Define interfaces for all API responses (see `lib/api.ts`)
- Optional properties use `?` syntax: `tbill_mom?: number`
- Union types for state: `type Range = "3m" | "1y" | "max"`

#### Styling
- **TailwindCSS v4**: Use utility classes exclusively
- **Theme variables**: Use CSS variables (`text-foreground`, `bg-background`, `border-border`)
- **Dark mode**: Automatic via `next-themes`, use theme-aware color classes
- **Responsive**: Mobile-first with breakpoints (`sm:`, `md:`, `lg:`)
- **DO NOT** use inline styles or CSS-in-JS
- Use `cn()` utility from `lib/utils` for conditional classes

#### Error Handling
```typescript
try {
  const data = await fetchMomentumData(region);
  setData(data);
  setError(null);
} catch (err) {
  console.error(err);
  setError("Failed to connect to backend service.");
}
```

### Python/FastAPI

#### Imports
- Standard library → Third-party → Local modules
- Use try/except for relative imports (supports both local and Vercel deployment)
```python
try:
    from .momentum import fetch_momentum_data
except ImportError:
    from momentum import fetch_momentum_data
```

#### Code Style
- Follow PEP 8
- Use type hints for function signatures
- Docstrings for all public functions (Google style preferred)
```python
def fetch_momentum_data(region: str = "US") -> dict:
    """
    Fetches historical data and calculates 12-month momentum.
    
    Args:
        region: Market region ("US" or "EU")
        
    Returns:
        Dictionary with signal, momentum, prices, and timestamp
    """
```

#### Naming Conventions
- **Functions**: snake_case (`fetch_ticker_data`, `update_momentum_history`)
- **Classes**: PascalCase (`MomentumHistory`, `BackgroundScheduler`)
- **Constants**: SCREAMING_SNAKE_CASE (`REGION_CONFIGS`, `API_BASE`)
- **Variables**: snake_case (`adj_close`, `spy_mom`)

#### Error Handling
- Always catch and log exceptions with context
- Use FastAPI's `HTTPException` for API errors
- Log with descriptive messages
```python
try:
    data = fetch_momentum_data(region=region)
    return data
except Exception as e:
    logger.error(f"Failed to fetch momentum for {region}: {e}")
    raise HTTPException(status_code=500, detail=str(e))
```

#### Database Operations
- Use SQLModel ORM (no raw SQL)
- Always use context managers for sessions
- Index frequently queried fields (region already indexed)

---

## Project-Specific Patterns

### State Management
- React `useState` for local state
- `useEffect` for data fetching and polling
- `useMemo` for expensive computations
- `localStorage` for user preferences (region selection)

### API Communication
- All API functions in `lib/api.ts`
- Use `API_BASE` from env or default to `/api` (rewrite routing)
- Always handle fetch errors with try/catch
- Poll interval: 60 seconds for live data

### UI Components
- Radix UI primitives wrapped in `components/ui/`
- **DO NOT** modify UI component files directly
- Custom components in `components/` root
- Use `variant` prop for styling variations

### Region Configuration
- All regions defined in `backend/momentum.py` `REGION_CONFIGS`
- Frontend labels in `app/page.tsx` `regionLabels` object
- Database schema uses fixed columns (spy_mom, veu_mom, etc.) regardless of region

---

## Common Tasks

### Adding a New Feature
1. Define TypeScript interfaces in `lib/api.ts` if API changes needed
2. Add backend endpoint in `backend/main.py`
3. Create/modify component in `components/`
4. Update main page in `app/page.tsx`
5. Test both US and EU regions
6. Verify dark/light theme compatibility

### Modifying Database Schema
1. Update `MomentumHistory` model in `backend/database.py`
2. For production: Create migration or handle schema evolution
3. Update API response types in `lib/api.ts`
4. Update frontend components to display new fields

### Debugging Tips
- Backend logs: Check console output from `python main.py`
- Frontend: Check browser DevTools console and Network tab
- Yahoo Finance failures: Common issue - check ticker symbols and API availability
- CORS errors: Verify origin in `backend/main.py` CORS config

---

## Important Notes

- **No Prettier/Formatter configured**: Follow existing code style exactly
- **No test suite**: Add tests before making significant changes
- **SQLite in dev**: Single connection, PostgreSQL recommended for production
- **Cron auth**: `/api/cron-update` requires `CRON_SECRET` Bearer token
- **Vercel deployment**: API routes proxy through Next.js rewrites (see `vercel.json`)

---

## File Locations Reference

```
├── app/page.tsx                    # Main dashboard UI
├── components/
│   ├── allocation-changes.tsx      # Signal timeline
│   ├── history-chart.tsx           # Recharts visualization
│   ├── history-table.tsx           # Data table with pagination
│   └── ui/                         # Radix UI wrappers (DO NOT modify)
├── lib/
│   ├── api.ts                      # API client + TypeScript interfaces
│   └── utils.ts                    # cn() utility
├── backend/
│   ├── main.py                     # FastAPI app + endpoints
│   ├── momentum.py                 # Calculation logic + REGION_CONFIGS
│   └── database.py                 # SQLModel schema + DB operations
└── api/index.py                    # Vercel serverless entry point
```

---

*For comprehensive documentation see Agents.md (529 lines). Last updated: January 2025*
