import useSWR from 'swr';

export interface StrategyRoles {
    equity: string;
    intl: string;
    bond: string;
    threshold: string;
}

export interface MomentumData {
    strategy: string;
    name: string;
    rule: 'canonical' | 'argmax';
    assets: string[];              // ordered ticker list
    roles: StrategyRoles | null;   // canonical only
    signal: string;
    momentum: Record<string, number>;  // keyed by ticker
    prices: Record<string, number>;
    last_updated: string;
}

export interface HistoryRecord {
    id: number;
    date: string;
    // Generic ordered slots (asset[0..3]) — see backend database.py.
    spy_mom: number;
    veu_mom: number;
    bnd_mom: number;
    tbill_mom?: number;
    signal: string;
}

// What the history chart/table need to render a strategy generically:
// ordered assets (slot map) + roles (canonical only).
export interface StrategyView {
    rule: 'canonical' | 'argmax';
    assets: string[];
    roles: StrategyRoles | null;
}

// Signal color by slot index — consistent across any strategy's tickers.
export const SLOT_TEXT_COLORS = ["text-green-500", "text-blue-500", "text-yellow-500", "text-slate-400"];
export function signalColor(assets: string[], ticker: string): string {
    const i = assets.indexOf(ticker);
    return SLOT_TEXT_COLORS[i] ?? SLOT_TEXT_COLORS[SLOT_TEXT_COLORS.length - 1];
}

export interface AllocationChangesData {
    has_history: boolean;
    current_signal?: string;
    days_since_change?: number;
    last_change_date?: string;
    previous_signal?: string;
    previous_signal_duration_days?: number;
    no_change_in_history?: boolean;
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

// SWR Hooks for automatic caching and revalidation
export function useMomentumData(strategy: string) {
    const { data, error, isLoading } = useSWR<MomentumData>(
        `${API_BASE}/momentum?strategy=${strategy}`,
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

export function useHistoryData(strategy: string, limit: number) {
    const url = `${API_BASE}/history?strategy=${strategy}&limit=${limit}`;
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

export function useAllocationChanges(strategy: string) {
    const url = `${API_BASE}/allocation-changes?strategy=${strategy}`;
    const { data, error, isLoading } = useSWR<AllocationChangesData>(
        url,
        fetcher,
        {
            refreshInterval: 60000, // Auto-refresh every 60 seconds
            revalidateOnFocus: false,
            dedupingInterval: 5000,
            keepPreviousData: true, // Prevent UI blink during strategy changes
        }
    );
    
    return {
        data,
        isLoading,
        error: error ? "Failed to fetch allocation changes" : null
    };
}
