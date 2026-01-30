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
    tbill_mom?: number;
    signal: string;
}

// In Vercel (Production), use relative path to route via rewrites.
// In Development, use localhost:8000 IF running separate backend, 
// OR use relative if using Next.js rewrites in next.config.ts (preferred).
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export async function fetchMomentumData(region: string = "US"): Promise<MomentumData> {
    const response = await fetch(`${API_BASE}/momentum?region=${region}`);
    if (!response.ok) throw new Error("Failed to fetch momentum data");
    return response.json();
}

export async function fetchHistory(region: string = "US"): Promise<HistoryRecord[]> {
    const response = await fetch(`${API_BASE}/history?region=${region}`);
    if (!response.ok) throw new Error("Failed to fetch history");
    return response.json();
}

export async function triggerUpdate(): Promise<void> {
    await fetch(`${API_BASE}/trigger-update`, { method: 'POST' });
}
