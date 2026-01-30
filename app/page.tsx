"use client";

import { useEffect, useState } from "react";
import { fetchMomentumData, fetchHistory, MomentumData, HistoryRecord } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AllocationChanges } from "@/components/allocation-changes";
import { HistoryTable } from "@/components/history-table";
import { HistoryChart } from "@/components/history-chart";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  const [data, setData] = useState<MomentumData | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);

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

  const getSignalInterpretation = (signal: string, momentum: any) => {
    if (!momentum) return "";

    const spyMom = momentum.SPY || 0;
    const veuMom = momentum.VEU || 0;
    const bndMom = momentum.BND || 0;

    if (signal === "SPY") {
      return `US equity markets (${formatPercent(spyMom)}) show the strongest momentum, exceeding international stocks (${formatPercent(veuMom)}). The strategy allocates 100% to US stocks for maximum growth potential.`;
    } else if (signal === "VEU") {
      return `International equity markets (${formatPercent(veuMom)}) demonstrate superior momentum compared to US stocks (${formatPercent(spyMom)}). The strategy rotates to global ex-US equities for optimal returns.`;
    } else if (signal === "BND") {
      if (spyMom < 0 && veuMom < 0) {
        return `Both US (${formatPercent(spyMom)}) and international (${formatPercent(veuMom)}) equity markets show negative momentum. The strategy moves to bonds (${formatPercent(bndMom)}) for capital preservation during market downturns.`;
      } else {
        const bestEquity = spyMom > veuMom ? `US stocks (${formatPercent(spyMom)})` : `international stocks (${formatPercent(veuMom)})`;
        return `While ${bestEquity} show positive momentum, they don't meet the threshold for equity allocation. The strategy defensively positions in bonds (${formatPercent(bndMom)}) to protect capital.`;
      }
    }
    return "";
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 font-mono">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-border pb-4 gap-4 md:gap-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tighter text-foreground">GEM DASHBOARD</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Global Equity Momentum • 12-Month Lookback</p>
          </div>
          <div className="flex items-center gap-4 self-end md:self-auto">
            <ThemeToggle />

            <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
              <Badge
                variant="outline"
                className="text-muted-foreground border-border cursor-pointer hover:bg-accent"
                onClick={() => setStatusOpen(true)}
              >
                {loading ? "CONNECTING..." : "LIVE"}
              </Badge>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-foreground">System Status</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Real-time monitoring and data source information
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span className="text-foreground font-mono">
                      {data ? new Date(data.last_updated).toLocaleTimeString() : "--:--:--"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Data Source</span>
                    <span className="text-foreground">Yahoo Finance</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Update Frequency</span>
                    <span className="text-foreground">Every 60 seconds</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Connection Status</span>
                    <span className={error ? "text-destructive" : "text-green-500"}>
                      {error ? "Disconnected" : "Connected"}
                    </span>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* GEM STRATEGY INFO SECTION */}
        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle className="text-foreground text-lg flex items-center gap-2">
              📚 About the GEM Strategy
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Understanding Global Equity Momentum investing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold text-foreground mb-2">What is GEM?</h3>
              <p className="text-muted-foreground leading-relaxed">
                Global Equity Momentum (GEM) is a systematic investment strategy that rotates between US stocks (SPY),
                international stocks (VEU), and bonds (BND) based on 12-month momentum. The strategy selects the
                best-performing equity asset if its momentum is positive; otherwise, it allocates to bonds for downside protection.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2">How it Works</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 leading-relaxed">
                <li>Calculate 12-month total return for SPY and VEU</li>
                <li>Select the equity asset with higher momentum</li>
                <li>If selected momentum is positive (&gt;0%), allocate 100% to that equity</li>
                <li>If negative, move to bonds (BND) for capital preservation</li>
                <li>Rebalance monthly based on updated momentum signals</li>
              </ul>
            </div>

            <Separator className="bg-border" />

            <div>
              <h3 className="font-semibold text-foreground mb-2">External Resources</h3>
              <div className="grid md:grid-cols-2 gap-2">
                <a
                  href="https://allocatesmartly.com/gem-global-equities-momentum/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-400 underline underline-offset-4 flex items-center gap-1"
                >
                  <span>AllocateSmartly: GEM Overview</span>
                  <span className="text-xs">↗</span>
                </a>
                <a
                  href="https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2435323"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-400 underline underline-offset-4 flex items-center gap-1"
                >
                  <span>Research Paper (Antonacci, 2014)</span>
                  <span className="text-xs">↗</span>
                </a>
                <a
                  href="https://www.etf.com/sections/index-investor-corner/swedroe-momentum-investing-works"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-400 underline underline-offset-4 flex items-center gap-1"
                >
                  <span>Why Momentum Works (ETF.com)</span>
                  <span className="text-xs">↗</span>
                </a>
                <a
                  href="https://www.optimizedportfolio.com/gem/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-400 underline underline-offset-4 flex items-center gap-1"
                >
                  <span>Backtest Results (Optimized Portfolio)</span>
                  <span className="text-xs">↗</span>
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        <main className="grid gap-6 md:grid-cols-2">
          {/* SIGNAL CARD - FULL WIDTH */}
          <Card className="col-span-2 border-border bg-card">
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm uppercase tracking-wider">Current Allocation</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-16 w-32 bg-muted" />
              ) : error ? (
                <div className="text-destructive">{error}</div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <Badge className={`text-4xl px-6 py-2 ${getSignalColor(data?.signal || "")}`}>
                      {data?.signal}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      Target Allocation
                    </div>
                  </div>

                  {/* INTERPRETATION */}
                  {data && (
                    <div className="bg-muted/30 border border-border rounded-lg p-4">
                      <p className="text-sm text-foreground leading-relaxed">
                        <span className="font-semibold">Strategy Rationale:</span> {getSignalInterpretation(data.signal, data.momentum)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* MOMENTUM TABLE */}
          <Card className="col-span-2 border-border bg-card overflow-hidden">
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm uppercase tracking-wider">Momentum Analysis (12-Mo)</CardTitle>
              <CardDescription className="text-muted-foreground">Assets ranked by 12-month return. Logic: Buy best of SPY/VEU if &gt; 0, else BND.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table className="min-w-[600px] md:min-w-0">
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Asset</TableHead>
                    <TableHead className="text-muted-foreground">Name</TableHead>
                    <TableHead className="text-right text-muted-foreground">Momentum</TableHead>
                    <TableHead className="text-right text-muted-foreground">Current Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Loading market data...</TableCell>
                    </TableRow>
                  ) : data ? (
                    ["SPY", "VEU", "BND"].sort((a, b) => (data.momentum[b as keyof typeof data.momentum] || 0) - (data.momentum[a as keyof typeof data.momentum] || 0)).map((ticker) => (
                      <TableRow key={ticker} className="border-border hover:bg-muted/50">
                        <TableCell className="font-medium text-foreground">{ticker}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {ticker === "SPY" ? "US Stocks" : ticker === "VEU" ? "Global ex-US" : "Total Bond Market"}
                        </TableCell>
                        <TableCell className={`text-right ${(data.momentum[ticker as keyof typeof data.momentum] || 0) > 0 ? "text-green-500" : "text-red-500"}`}>
                          {formatPercent(data.momentum[ticker as keyof typeof data.momentum] || 0)}
                        </TableCell>
                        <TableCell className="text-right text-foreground">
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
            <h2 className="text-2xl font-bold tracking-tighter text-foreground mb-4">History Analysis</h2>

            <AllocationChanges data={history} />

            <div className="grid gap-6">
              <HistoryChart data={history} />
              <HistoryTable data={history} />
            </div>
          </div>

        </main>

        {/* FOOTER */}
        <footer className="border-t border-border pt-8 mt-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Built by</span>
              <a
                href="https://kristof.pro"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground font-semibold hover:text-blue-500 transition-colors"
              >
                Kristof.pro
              </a>
            </div>

            <a
              href="https://buymeacoffee.com/kristof.pro"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg transition-all hover:scale-105 shadow-md"
            >
              <span className="text-xl">☕</span>
              <span>Buy me a coffee</span>
            </a>
          </div>
        </footer>
      </div>
    </div>

  );
}
