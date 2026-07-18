"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useMomentumData, useHistoryData, MomentumData, HistoryRecord } from "@/lib/api";
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
import { ThemeToggle } from "@/components/theme-toggle";
import { ChevronDown } from "lucide-react";
import { useTranslations, useLocale } from 'next-intl';
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useFormattedDate, useFormattedNumber } from "@/lib/i18n-utils";

// Lazy load HistoryChart with Recharts library to reduce initial bundle size
const HistoryChart = dynamic(
  () => import("@/components/history-chart").then((mod) => ({ default: mod.HistoryChart })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[300px] w-full" />
  }
);

// Strategy catalog — mirrors backend/momentum.py STRATEGIES. `assets` is the ordered
// slot list (slot 0..3 map to the fixed history columns). `roles` is canonical-only.
type StrategyDef = {
  rule: "canonical" | "argmax";
  assets: string[];
  roles?: { equity: string; intl: string; bond: string; threshold: string };
};

const STRATEGIES: Record<string, StrategyDef> = {
  "gem-us": {
    rule: "canonical",
    assets: ["SPY", "VEU", "BND", "^IRX"],
    roles: { equity: "SPY", intl: "VEU", bond: "BND", threshold: "^IRX" },
  },
  "gem-eu": {
    rule: "canonical",
    assets: ["CSPX.AS", "EXUS.L", "AGGH.AS", "PJEU.DE"],
    roles: { equity: "CSPX.AS", intl: "EXUS.L", bond: "AGGH.AS", threshold: "PJEU.DE" },
  },
  "max-gem-eu": {
    rule: "argmax",
    assets: ["EIMI.L", "CNDX.L", "CBU0.L", "IB01.L"],
  },
};

// Signal color by slot index — so any strategy's tickers color consistently.
const SLOT_COLORS = [
  "bg-green-600 hover:bg-green-700",
  "bg-blue-600 hover:bg-blue-700",
  "bg-yellow-600 hover:bg-yellow-700",
  "bg-slate-500 hover:bg-slate-600",
];

export default function Home() {
  const t = useTranslations();
  const locale = useLocale();
  const formatDate = useFormattedDate();
  const { percent, currency } = useFormattedNumber();

  const router = useRouter();
  const pathname = usePathname();

  const [statusOpen, setStatusOpen] = useState(false);
  const [strategyOpen, setStrategyOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [strategy, setStrategy] = useState<string>("gem-us");
  const [historyRange, setHistoryRange] = useState<"3m" | "1y" | "max">("1y");

  useEffect(() => {
    const savedStrategy = localStorage.getItem("gem-strategy");
    if (savedStrategy && STRATEGIES[savedStrategy]) setStrategy(savedStrategy);
  }, []);

  // Language is URL-driven now: navigate to the same path under the target locale.
  const switchLocale = (target: string) => {
    router.replace(pathname, { locale: target });
  };

  // Calculate appropriate limit based on selected range
  // 3m ~= 63 trading days, 1y ~= 252 trading days
  const limit = historyRange === "3m" ? 100 : historyRange === "1y" ? 300 : 1000;

  // Use SWR hooks for automatic caching, revalidation, and request deduplication
  const { data, isLoading: momentumLoading, error: momentumError } = useMomentumData(strategy);
  const { data: history, isLoading: historyLoading, error: historyError } = useHistoryData(strategy, limit);

  const loading = momentumLoading || historyLoading;
  const error = momentumError || historyError;

  const handleStrategyChange = (newStrategy: string) => {
    setStrategy(newStrategy);
    localStorage.setItem("gem-strategy", newStrategy);
  };

  // Current strategy + its display names (parallel to assets order), from i18n.
  const strat = STRATEGIES[strategy];
  const strategyName = t(`strategies.${strategy}.name`);
  const assetNames = t.raw(`strategies.${strategy}.assetNames`) as string[];
  const assetName = (ticker: string) => assetNames?.[strat.assets.indexOf(ticker)] ?? ticker;

  // Passed to the history chart/table: ordered assets (slot map), roles, rule.
  const view = {
    rule: strat.rule,
    assets: strat.assets,
    roles: strat.roles ?? null,
  };

  // About-card helpers
  const roleName = strat.roles && {
    equity: assetName(strat.roles.equity),
    intl: assetName(strat.roles.intl),
    bond: assetName(strat.roles.bond),
    threshold: assetName(strat.roles.threshold),
  };
  const assetList = strat.assets.map(assetName).join(", ");
  const cashName = assetName(strat.assets[strat.assets.length - 1]);
  const strategySummary = strat.rule === "canonical"
    ? t('strategy.canonical.summary', {
        equity: roleName!.equity, intl: roleName!.intl,
        bond: roleName!.bond, threshold: roleName!.threshold,
      })
    : t('strategy.argmax.summary');

  const getSignalColor = (signal: string) => {
    const i = strat.assets.indexOf(signal);
    return SLOT_COLORS[i] ?? SLOT_COLORS[SLOT_COLORS.length - 1];
  };

  const getSignalInterpretation = (signal: string, momentum: Record<string, number> | undefined) => {
    if (!momentum) return "";

    if (strat.rule === "argmax") {
      return t('allocation.interpretationArgmax', {
        asset: assetName(signal),
        assetMom: percent(momentum[signal] || 0),
      });
    }

    // canonical: anchor-only absolute gate, then relative between the two equities
    const r = strat.roles!;
    const eq1Mom = percent(momentum[r.equity] || 0);
    const eq2Mom = percent(momentum[r.intl] || 0);
    const bondMom = percent(momentum[r.bond] || 0);
    const thresholdMom = percent(momentum[r.threshold] || 0);

    if (signal === r.equity) {
      return t('allocation.interpretationEq1', {
        eq1: assetName(r.equity), eq1Mom, eq2Mom,
        threshold: assetName(r.threshold), thresholdMom,
      });
    }
    if (signal === r.intl) {
      return t('allocation.interpretationEq2', {
        eq2: assetName(r.intl), eq2Mom,
        eq1: assetName(r.equity), eq1Mom,
        threshold: assetName(r.threshold), thresholdMom,
      });
    }
    // bond: the anchor equity did not clear the T-bill gate
    return t('allocation.interpretationBond', {
      eq1: assetName(r.equity), eq1Mom,
      threshold: assetName(r.threshold), thresholdMom,
      bondMom,
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 font-mono">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-border pb-4 gap-4 md:gap-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tighter text-foreground">{t('header.title')}</h1>
            <p className="text-xs md:text-sm text-muted-foreground">{t('header.subtitle', { name: strategyName })}</p>
          </div>
          <div className="flex items-center gap-3 self-end md:self-auto">
            <ThemeToggle />

            {/* Inline EN / PL locale toggle — URL-driven (/, /pl). */}
            <div className="flex items-center gap-1 text-sm font-medium" aria-label={t('settings.language')}>
              {routing.locales.map((lang, i) => (
                <span key={lang} className="flex items-center gap-1">
                  {i > 0 && <span className="text-muted-foreground/50" aria-hidden>/</span>}
                  <button
                    type="button"
                    onClick={() => switchLocale(lang)}
                    aria-current={locale === lang ? "true" : undefined}
                    className={`uppercase transition-colors ${
                      locale === lang
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {lang}
                  </button>
                </span>
              ))}
            </div>

            <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
              <Badge
                variant="outline"
                className="text-muted-foreground border-border cursor-pointer hover:bg-accent"
                onClick={() => setStatusOpen(true)}
              >
                {loading ? t('common.loading') : t('common.live')}
              </Badge>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-foreground">{t('status.title')}</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    {t('status.description')}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('status.lastUpdated')}</span>
                    <span className="text-foreground font-mono">
                      {data ? new Date(data.last_updated).toLocaleTimeString(locale) : "--:--:--"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('status.dataSource')}</span>
                    <span className="text-foreground">{t('status.yahooFinance')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('status.updateFrequency')}</span>
                    <span className="text-foreground">{t('status.everyMinute')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('status.connectionStatus')}</span>
                    <span className={error ? "text-destructive" : "text-green-500"}>
                      {error ? t('common.disconnected') : t('common.connected')}
                    </span>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* STRATEGY SELECTOR — segmented pills, same style as the history range toggle.
            ponytail: fine for a handful; switch to a dropdown if the catalog grows past ~5. */}
        <div className="flex flex-wrap gap-0.5 rounded-lg border border-border p-0.5 bg-muted/30" role="tablist" aria-label={t('settings.strategy')}>
          {Object.keys(STRATEGIES).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={strategy === id}
              onClick={() => handleStrategyChange(id)}
              className={`flex-1 min-w-[8rem] px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                strategy === id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(`strategies.${id}.name`)}
            </button>
          ))}
        </div>

        {/* GEM STRATEGY INFO SECTION - COLLAPSIBLE */}
        <Collapsible open={strategyOpen} onOpenChange={setStrategyOpen}>
          <Card className="border-border bg-card/50">
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <CardTitle className="text-foreground text-lg flex items-center gap-2">
                      📚 {t('strategy.title')}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      {strategySummary}
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
                  <h3 className="font-semibold text-foreground mb-2">{t('strategy.whatIsTitle')}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {strat.rule === "canonical"
                      ? t('strategy.canonical.whatIsDescription', {
                        equity: roleName!.equity,
                        intl: roleName!.intl,
                        bond: roleName!.bond,
                        threshold: roleName!.threshold,
                      })
                      : t('strategy.argmax.whatIsDescription', { assets: assetList })}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground mb-2">{t('strategy.howItWorksTitle')}</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 leading-relaxed">
                    {strat.rule === "canonical" ? (
                      <>
                        <li>{t('strategy.canonical.step1', { equity: roleName!.equity, intl: roleName!.intl, threshold: roleName!.threshold })}</li>
                        <li>{t('strategy.canonical.step2', { equity: roleName!.equity, threshold: roleName!.threshold })}</li>
                        <li>{t('strategy.canonical.step3', { equity: roleName!.equity, intl: roleName!.intl })}</li>
                        <li>{t('strategy.canonical.step4', { bond: roleName!.bond })}</li>
                        <li>{t('strategy.canonical.step5')}</li>
                      </>
                    ) : (
                      <>
                        <li>{t('strategy.argmax.step1', { assets: assetList })}</li>
                        <li>{t('strategy.argmax.step2')}</li>
                        <li>{t('strategy.argmax.step3', { cash: cashName })}</li>
                        <li>{t('strategy.argmax.step4')}</li>
                      </>
                    )}
                  </ul>
                </div>

                <Separator className="bg-border" />

                <div>
                  <h3 className="font-semibold text-foreground mb-2">{t('strategy.externalResourcesTitle')}</h3>
                  <div className="grid md:grid-cols-2 gap-2">
                    <a
                      href="https://investresolve.com/global-equity-momentum-executive-summary/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-400 underline underline-offset-4 flex items-center gap-1"
                    >
                      <span>{t('strategy.resourceCraftsman')}</span>
                      <span className="text-xs">↗</span>
                    </a>
                    <a
                      href="https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2435323"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-400 underline underline-offset-4 flex items-center gap-1"
                    >
                      <span>{t('strategy.resourcePaper')}</span>
                      <span className="text-xs">↗</span>
                    </a>
                    <a
                      href="https://blog.thinknewfound.com/2019/01/fragility-case-study-dual-momentum-gem/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-400 underline underline-offset-4 flex items-center gap-1"
                    >
                      <span>{t('strategy.resourceDualMomentum')}</span>
                      <span className="text-xs">↗</span>
                    </a>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <main className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* SIGNAL CARD - FULL WIDTH */}
          <Card className="md:col-span-2 border-border bg-card">
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm uppercase tracking-wider">{t('allocation.title')}</CardTitle>
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
                      {t('allocation.targetAllocation')}
                    </div>
                  </div>

                  {/* INTERPRETATION */}
                  {data && (
                    <div className="bg-muted/30 border border-border rounded-lg p-4">
                      <p className="text-sm text-foreground leading-relaxed">
                        <span className="font-semibold">{t('allocation.strategyRationale')}</span> {getSignalInterpretation(data.signal, data.momentum)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* MOMENTUM TABLE */}
          <Card className="md:col-span-2 border-border bg-card overflow-hidden">
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm uppercase tracking-wider">{t('momentum.title')}</CardTitle>
              <CardDescription className="text-muted-foreground">{t('momentum.description')}</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table className="min-w-[600px] md:min-w-0">
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">{t('momentum.asset')}</TableHead>
                    <TableHead className="text-muted-foreground">{t('momentum.name')}</TableHead>
                    <TableHead className="text-right text-muted-foreground">{t('momentum.momentum')}</TableHead>
                    <TableHead className="text-right text-muted-foreground">{t('momentum.currentPrice')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i} className="border-border">
                        <TableCell><Skeleton className="h-4 w-16 bg-muted" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-40 bg-muted" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto bg-muted" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto bg-muted" /></TableCell>
                      </TableRow>
                    ))
                  ) : data ? (
                    [...data.assets].sort((a, b) => (data.momentum[b] || 0) - (data.momentum[a] || 0)).map((ticker) => {
                      const isCurrentSignal = ticker === data.signal;
                      const momentum = data.momentum[ticker] || 0;
                      const price = data.prices[ticker] || 0;
                      // canonical threshold is a yardstick, not a held asset — hide its price
                      const isThreshold = view.roles?.threshold === ticker;

                      return (
                        <TableRow
                          key={ticker}
                          className={`border-border hover:bg-muted/50 ${isCurrentSignal ? 'bg-accent/30' : ''}`}
                        >
                          <TableCell className="font-medium text-foreground">
                            {ticker}
                            {isCurrentSignal && (
                              <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                                {t('common.selected')}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {assetName(ticker)}
                          </TableCell>
                          <TableCell className={`text-right ${momentum > 0 ? "text-green-500" : "text-red-500"}`}>
                            {percent(momentum)}
                          </TableCell>
                          <TableCell className="text-right text-foreground">
                            {price && !isThreshold ? currency(price) : "—"}
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
          <div className="md:col-span-2 pt-8">
            <h2 className="text-2xl font-bold tracking-tighter text-foreground mb-4">{t('history.title')}</h2>

            <AllocationChanges strategy={strategy} view={view} />

            <Card className="bg-card border-border overflow-hidden">
              <CardHeader>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-muted-foreground text-sm uppercase tracking-wider">{t('history.cardTitle')}</CardTitle>
                      <CardDescription className="text-muted-foreground text-xs md:text-sm">
                        {t('history.cardDescription')}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex rounded-lg border border-border p-0.5 bg-muted/30" role="tablist" aria-label={t('history.dateRangeLabel')}>
                        {(["3m", "1y", "max"] as const).map((range) => (
                          <button
                            key={range}
                            type="button"
                            role="tab"
                            aria-selected={historyRange === range}
                            onClick={() => setHistoryRange(range)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                              historyRange === range
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {range === "3m" ? t('history.range3m') : range === "1y" ? t('history.range1y') : t('history.rangeMax')}
                          </button>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHistoryOpen(!historyOpen)}
                        className="text-xs shrink-0"
                      >
                        {historyOpen ? t('history.hideTable') : t('history.showTable')}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <HistoryChart data={history} view={view} />

                <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
                  <CollapsibleContent className="pt-4 border-t border-border">
                    <HistoryTable data={history} view={view} />
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
              <span>{t('footer.builtBy')}</span>
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
              href="https://suppi.pl/kristof-pro"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg transition-all hover:scale-105 shadow-md"
            >
              <span className="text-xl">☕</span>
              <span>{t('footer.buyMeCoffee')}</span>
            </a>
          </div>
        </footer>
      </div>
    </div>

  );
}
