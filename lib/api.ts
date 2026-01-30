export interface MomentumData {
    signal: string;
    momentum: {
        SPY: number;
        VEU: number;
        BND: number;
        TBILL: number;
    };
    prices: {
        SPY: number;
        VEU: number;
        BND: number;
    };
    last_updated: string;
}

export interface HistoryRecord {
    id: number;
    date: string;
    spy_mom: number;
    veu_mom: number;
    bnd_mom: number;
    signal: string;
}

// In Vercel (Production), use relative path to route via rewrites.
// In Development, use localhost:8000 IF running separate backend, 
// OR use relative if using Next.js rewrites in next.config.ts (preferred).
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export async function fetchMomentumData(): Promise<MomentumData> {
    const res = await fetch(`${API_BASE}/momentum`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch momentum data');
    return res.json();
}

export async function fetchHistory(): Promise<HistoryRecord[]> {
    const res = await fetch(`${API_BASE}/history`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch history');
    return res.json();
}

export async function triggerUpdate(): Promise<void> {
    await fetch(`${API_BASE}/trigger-update`, { method: 'POST' });
}
