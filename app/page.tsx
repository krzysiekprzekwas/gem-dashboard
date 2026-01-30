"use client";

import { useEffect, useState } from "react";
import { fetchMomentumData, fetchHistory, MomentumData, HistoryRecord } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AllocationChanges } from "@/components/allocation-changes";
import { HistoryTable } from "@/components/history-table";
import { HistoryChart } from "@/components/history-chart";
import { ThemeToggle } from "@/components/theme-toggle";
import { ChevronDown, Settings, Globe } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export default function Home() {
  const [data, setData] = useState<MomentumData | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [strategyOpen, setStrategyOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [region, setRegion] = useState<string>("US");
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const savedRegion = localStorage.getItem("gem-region");
    if (savedRegion) setRegion(savedRegion);
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const [resMom, resHist] = await Promise.all([
          fetchMomentumData(region),
          fetchHistory(region)
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
  }, [region]);

  const handleRegionChange = (newRegion: string) => {
    setRegion(newRegion);
    localStorage.setItem("gem-region", newRegion);
    setSettingsOpen(false);
  };

  const regionLabels: Record<string, any> = {
    US: {
      eq1: "US Stocks",
      eq2: "Global ex-US",
      bond: "Total Bonds",
      threshold: "T-Bills",
      eq1_tick: "SPY",
      eq2_tick: "VEU",
      bond_tick: "BND",
    },
    EU: {
      eq1: "S&P 500",
      eq2: "World ex-US",
      bond: "Global Bonds",
      threshold: "Euro Cash",
      eq1_tick: "CSPX.AS",
      eq2_tick: "EXUS.L",
      bond_tick: "AGGH.AS",
    }
  };

  const labels = regionLabels[region] || regionLabels.US;

  const formatPercent = (val: number) => (val * 100).toFixed(2) + "%";
  const formatPrice = (val: number) => "$" + val.toFixed(2);

  const getSignalColor = (signal: string) => {
    if (signal === labels.eq1_tick) return "bg-green-600 hover:bg-green-700";
    if (signal === labels.eq2_tick) return "bg-blue-600 hover:bg-blue-700";
    return "bg-yellow-600 hover:bg-yellow-700"; // Bond
  };

  const getSignalInterpretation = (signal: string, momentum: any) => {
    if (!momentum) return "";

    const eq1Mom = momentum[labels.eq1_tick] || 0;
    const eq2Mom = momentum[labels.eq2_tick] || 0;
    const bondMom = momentum[labels.bond_tick] || 0;
    const thresholdMom = momentum.THRESHOLD || 0;

    if (signal === labels.eq1_tick) {
      return `${labels.eq1} (${formatPercent(eq1Mom)}) outperform both international stocks (${formatPercent(eq2Mom)}) and ${labels.threshold} (${formatPercent(thresholdMom)}). The strategy allocates 100% to this asset for maximum growth potential.`;
    } else if (signal === labels.eq2_tick) {
      return `${labels.eq2} (${formatPercent(eq2Mom)}) demonstrate superior momentum compared to ${labels.eq1} (${formatPercent(eq1Mom)}) and exceed the ${labels.threshold} threshold (${formatPercent(thresholdMom)}). The strategy rotates for optimal returns.`;
    } else if (signal === labels.bond_tick || signal === "BND" || signal === "AGGH.AS") {
      const thresholdRef = `${labels.threshold} (${formatPercent(thresholdMom)})`;
      if (eq1Mom < thresholdMom && eq2Mom < thresholdMom) {
        return `Neither ${labels.eq1} (${formatPercent(eq1Mom)}) nor ${labels.eq2} (${formatPercent(eq2Mom)}) exceed the ${thresholdRef} threshold. The strategy moves to bonds (${formatPercent(bondMom)}) for capital preservation.`;
      } else {
        return `Equity momentum does not sufficiently exceed the risk-free rate. The strategy defensively positions in bonds (${formatPercent(bondMom)}) to protect capital.`;
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
            <p className="text-xs md:text-sm text-muted-foreground">Global Equity Momentum • {region} Strategy</p>
          </div>
          <div className="flex items-center gap-3 self-end md:self-auto">
            <ThemeToggle />

            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <Button
                variant="outline"
                size="icon"
                className="border-border text-muted-foreground w-8 h-8 rounded-full"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="w-4 h-4" />
              </Button>
              <DialogContent className="max-w-xs">
                <DialogHeader>
                  <DialogTitle>Regional Settings</DialogTitle>
                  <DialogDescription>
                    Choose your investment region
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <RadioGroup value={region} onValueChange={handleRegionChange} className="space-y-4">
                    <div className="flex items-center space-x-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="US" id="us" />
                      <Label htmlFor="us" className="flex-1 cursor-pointer">
                        <div className="font-semibold">United States</div>
                        <div className="text-xs text-muted-foreground">SPY, VEU, BND, ^IRX</div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="EU" id="eu" />
                      <Label htmlFor="eu" className="flex-1 cursor-pointer">
                        <div className="font-semibold">Europe (UCITS)</div>
                        <div className="text-xs text-muted-foreground">CSPX, EXUS, AGGH, PJEU</div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </DialogContent>
            </Dialog>

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

        {/* GEM STRATEGY INFO SECTION - COLLAPSIBLE */}
        <Collapsible open={strategyOpen} onOpenChange={setStrategyOpen}>
          <Card className="border-border bg-card/50">
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <CardTitle className="text-foreground text-lg flex items-center gap-2">
                      📚 About the GEM Strategy
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Understanding Global Equity Momentum investing
                    </CardDescription>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${strategyOpen ? 'transform rotate-180' : ''
                      }`}
                  />
                </div>
              </CardHeader>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <CardContent className="space-y-4 text-sm pt-0">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">What is GEM?</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Global Equity Momentum (GEM) is a systematic investment strategy that rotates between {labels.eq1},
                    {labels.eq2}, and {labels.bond} based on 12-month momentum. The strategy selects the
                    best-performing equity asset if its momentum exceeds the {labels.threshold}; otherwise, it allocates to bonds for downside protection.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground mb-2">How it Works</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 leading-relaxed">
                    <li>Calculate 12-month total return for {labels.eq1_tick}, {labels.eq2_tick}, and {labels.threshold}</li>
                    <li>Select the equity asset with higher momentum</li>
                    <li>If selected equity exceeds {labels.threshold} returns, allocate 100% to that equity</li>
                    <li>Otherwise, move to {labels.bond} ({labels.bond_tick}) for capital preservation</li>
                    <li>Rebalance monthly based on updated momentum signals</li>
                  </ul>
                </div>

                <Separator className="bg-border" />

                <div>
                  <h3 className="font-semibold text-foreground mb-2">External Resources</h3>
                  <div className="grid md:grid-cols-2 gap-2">
                    <a
                      href="https://investresolve.com/global-equity-momentum-executive-summary/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-400 underline underline-offset-4 flex items-center gap-1"
                    >
                      <span>Global Equity Momentum: A Craftsman’s Perspective</span>
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
                      href="https://blog.thinknewfound.com/2019/01/fragility-case-study-dual-momentum-gem/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-400 underline underline-offset-4 flex items-center gap-1"
                    >
                      <span>Dual Momentum GEM</span>
                      <span className="text-xs">↗</span>
                    </a>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

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
              <CardDescription className="text-muted-foreground">Assets ranked by 12-month return.</CardDescription>
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
                    [labels.eq1_tick, labels.eq2_tick, labels.bond_tick, "THRESHOLD"].sort((a, b) => {
                      const aMom = (data.momentum as any)[a] || 0;
                      const bMom = (data.momentum as any)[b] || 0;
                      return bMom - aMom;
                    }).map((ticker) => {
                      const isCurrentSignal = ticker === data.signal;
                      const momentum = (data.momentum as any)[ticker] || 0;
                      const price = (data.prices as any)[ticker] || 0;
                      const isThreshold = ticker === "THRESHOLD";

                      return (
                        <TableRow
                          key={ticker}
                          className={`border-border hover:bg-muted/50 ${isCurrentSignal ? 'bg-accent/30' : ''}`}
                        >
                          <TableCell className="font-medium text-foreground">
                            {isThreshold ? labels.threshold : ticker}
                            {isCurrentSignal && (
                              <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                                SELECTED
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {ticker === labels.eq1_tick ? labels.eq1 :
                              ticker === labels.eq2_tick ? labels.eq2 :
                                ticker === labels.bond_tick ? labels.bond :
                                  labels.threshold}
                          </TableCell>
                          <TableCell className={`text-right ${momentum > 0 ? "text-green-500" : "text-red-500"}`}>
                            {formatPercent(momentum)}
                          </TableCell>
                          <TableCell className="text-right text-foreground">
                            {price && !isThreshold ? formatPrice(price) : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* HISTORY SECTION */}
          <div className="col-span-2 pt-8">
            <h2 className="text-2xl font-bold tracking-tighter text-foreground mb-4">History Analysis</h2>

            <AllocationChanges data={history} />

            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-muted-foreground text-sm uppercase tracking-wider">Signal History & Details</CardTitle>
                    <CardDescription className="text-muted-foreground text-xs md:text-sm">
                      6-month evolution and detailed historical records
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoryOpen(!historyOpen)}
                    className="w-full md:w-auto text-xs"
                  >
                    {historyOpen ? "Hide Detailed Data" : "Show Detailed Data"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <HistoryChart data={history} labels={labels} />

                <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
                  <CollapsibleContent className="pt-4 border-t border-border">
                    <div className="overflow-x-auto">
                      <HistoryTable data={history} labels={labels} />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
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
