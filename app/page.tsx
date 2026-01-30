"use client";

import { useEffect, useState } from "react";
import { fetchMomentumData, fetchHistory, MomentumData, HistoryRecord } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { AllocationChanges } from "@/components/allocation-changes";
import { HistoryTable } from "@/components/history-table";
import { HistoryChart } from "@/components/history-chart";

export default function Home() {
  const [data, setData] = useState<MomentumData | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [resMom, resHist] = await Promise.all([
          fetchMomentumData(),
          fetchHistory()
        ]);
        setData(resMom);
        setHistory(resHist);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("Failed to connect to backend service.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
    // Poll every 60 seconds
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatPercent = (val: number) => (val * 100).toFixed(2) + "%";
  const formatPrice = (val: number) => "$" + val.toFixed(2);

  const getSignalColor = (signal: string) => {
    if (signal === "SPY") return "bg-green-600 hover:bg-green-700";
    if (signal === "VEU") return "bg-blue-600 hover:bg-blue-700";
    return "bg-yellow-600 hover:bg-yellow-700"; // BND
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 font-mono">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex justify-between items-center border-b border-neutral-800 pb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tighter text-white">GEM DASHBOARD</h1>
            <p className="text-sm text-neutral-500">Global Equity Momentum • 12-Month Lookback</p>
          </div>
          <div className="text-right">
            <Badge variant="outline" className="text-neutral-400 border-neutral-700">
              {loading ? "CONNECTING..." : "LIVE"}
            </Badge>
          </div>
        </header>

        <main className="grid gap-6 md:grid-cols-2">
          {/* SIGNAL CARD */}
          <Card className="col-span-2 md:col-span-1 bg-neutral-900 border-neutral-800">
            <CardHeader>
              <CardTitle className="text-neutral-400 text-sm uppercase tracking-wider">Current Allocation</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-16 w-32 bg-neutral-800" />
              ) : error ? (
                <div className="text-red-500">{error}</div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Badge className={`text-4xl px-6 py-2 ${getSignalColor(data?.signal || "")}`}>
                    {data?.signal}
                  </Badge>
                  <div className="text-sm text-neutral-400">
                    Target Allocation
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* STATUS / INFO CARD */}
          <Card className="col-span-2 md:col-span-1 bg-neutral-900 border-neutral-800">
            <CardHeader>
              <CardTitle className="text-neutral-400 text-sm uppercase tracking-wider">System Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Last Updated</span>
                <span className="text-neutral-200">
                  {data ? new Date(data.last_updated).toLocaleTimeString() : "--:--:--"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Data Source</span>
                <span className="text-neutral-200">Yahoo Finance (Real-time*)</span>
              </div>
            </CardContent>
          </Card>

          {/* MOMENTUM TABLE */}
          <Card className="col-span-2 bg-neutral-900 border-neutral-800">
            <CardHeader>
              <CardTitle className="text-neutral-400 text-sm uppercase tracking-wider">Momentum Analysis (12-Mo)</CardTitle>
              <CardDescription className="text-neutral-600">Assets ranked by 12-month return. Logic: Buy best of SPY/VEU if &gt; 0, else BND.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-neutral-800 hover:bg-transparent">
                    <TableHead className="text-neutral-500">Asset</TableHead>
                    <TableHead className="text-neutral-500">Name</TableHead>
                    <TableHead className="text-right text-neutral-500">Momentum</TableHead>
                    <TableHead className="text-right text-neutral-500">Current Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-neutral-500">Loading market data...</TableCell>
                    </TableRow>
                  ) : data ? (
                    ["SPY", "VEU", "BND"].sort((a, b) => (data.momentum[b as keyof typeof data.momentum] || 0) - (data.momentum[a as keyof typeof data.momentum] || 0)).map((ticker) => (
                      <TableRow key={ticker} className="border-neutral-800 hover:bg-neutral-800/50">
                        <TableCell className="font-medium text-white">{ticker}</TableCell>
                        <TableCell className="text-neutral-400">
                          {ticker === "SPY" ? "US Stocks" : ticker === "VEU" ? "Global ex-US" : "Total Bond Market"}
                        </TableCell>
                        <TableCell className={`text-right ${(data.momentum[ticker as keyof typeof data.momentum] || 0) > 0 ? "text-green-500" : "text-red-500"}`}>
                          {formatPercent(data.momentum[ticker as keyof typeof data.momentum] || 0)}
                        </TableCell>
                        <TableCell className="text-right text-neutral-300">
                          {formatPrice(data.prices[ticker as keyof typeof data.prices] || 0)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* HISTORY SECTION */}
          <div className="col-span-2 pt-8">
            <h2 className="text-2xl font-bold tracking-tighter text-white mb-4">History Analysis</h2>

            <AllocationChanges data={history} />

            <div className="grid gap-6">
              <HistoryChart data={history} />
              <HistoryTable data={history} />
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
