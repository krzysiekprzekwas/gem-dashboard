import useSWR from 'swr';

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

// Generic fetcher for SWR
const fetcher = async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch: ${url}`);
    return response.json();
};

export async function fetchMomentumData(region: string = "US"): Promise<MomentumData> {
    const response = await fetch(`${API_BASE}/momentum?region=${region}`);
    if (!response.ok) throw new Error("Failed to fetch momentum data");
    return response.json();
}

export async function fetchHistory(region: string = "US", limit?: number): Promise<HistoryRecord[]> {
    const url = limit 
        ? `${API_BASE}/history?region=${region}&limit=${limit}`
        : `${API_BASE}/history?region=${region}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch history");
    return response.json();
}

// SWR Hooks for automatic caching and revalidation
export function useMomentumData(region: string) {
    const { data, error, isLoading } = useSWR<MomentumData>(
        `${API_BASE}/momentum?region=${region}`,
        fetcher,
        {
            refreshInterval: 60000, // Auto-refresh every 60 seconds
            revalidateOnFocus: false, // Don't refetch when window regains focus
            dedupingInterval: 5000, // Dedupe requests within 5 seconds
        }
    );
    
    return {
        data,
        isLoading,
        error: error ? "Failed to connect to backend service." : null
    };
}

export function useHistoryData(region: string, limit: number) {
    const url = `${API_BASE}/history?region=${region}&limit=${limit}`;
    const { data, error, isLoading } = useSWR<HistoryRecord[]>(
        url,
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 5000,
            keepPreviousData: true, // Show previous data while fetching new data to prevent UI "blink"
        }
    );
    
    return {
        data: data || [],
        isLoading,
        error: error ? "Failed to fetch history" : null
    };
}

export async function triggerUpdate(): Promise<void> {
    await fetch(`${API_BASE}/trigger-update`, { method: 'POST' });
}
