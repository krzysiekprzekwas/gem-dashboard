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
import { ChevronDown, Settings, Globe } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useTranslations, useLocale } from 'next-intl';
import { useFormattedDate, useFormattedNumber } from "@/lib/i18n-utils";

// Lazy load HistoryChart with Recharts library to reduce initial bundle size
const HistoryChart = dynamic(
  () => import("@/components/history-chart").then((mod) => ({ default: mod.HistoryChart })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[300px] w-full" />
  }
);

const REGION_LABELS: Record<string, any> = {
  US: {
    eq1_tick: "SPY",
    eq2_tick: "VEU",
    bond_tick: "BND",
  },
  EU: {
    eq1_tick: "CSPX.AS",
    eq2_tick: "EXUS.L",
    bond_tick: "AGGH.AS",
  }
};

export default function Home() {
  const t = useTranslations();
  const locale = useLocale();
  const formatDate = useFormattedDate();
  const { percent, currency } = useFormattedNumber();

  const [statusOpen, setStatusOpen] = useState(false);
  const [strategyOpen, setStrategyOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [region, setRegion] = useState<string>("US");
  const [language, setLanguage] = useState<string>(locale);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyRange, setHistoryRange] = useState<"3m" | "1y" | "max">("1y");

  useEffect(() => {
    const savedRegion = localStorage.getItem("gem-region");
    if (savedRegion) setRegion(savedRegion);

    const savedLang = localStorage.getItem("gem-language");
    if (savedLang) setLanguage(savedLang);
  }, []);

  // Calculate appropriate limit based on selected range
  // 3m ~= 63 trading days, 1y ~= 252 trading days
  const limit = historyRange === "3m" ? 100 : historyRange === "1y" ? 300 : 1000;

  // Use SWR hooks for automatic caching, revalidation, and request deduplication
  const { data, isLoading: momentumLoading, error: momentumError } = useMomentumData(region);
  const { data: history, isLoading: historyLoading, error: historyError } = useHistoryData(region, limit);

  const loading = momentumLoading || historyLoading;
  const error = momentumError || historyError;

  const handleRegionChange = (newRegion: string) => {
    setRegion(newRegion);
    localStorage.setItem("gem-region", newRegion);
  };

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    localStorage.setItem("gem-language", newLang);
    document.cookie = `NEXT_LOCALE=${newLang}; path=/; max-age=31536000`;
    // Refresh to apply new locale
    window.location.reload();
  };

  // Get region labels from translations
  const labels = {
    eq1: t(`regions.${region}.eq1`),
    eq2: t(`regions.${region}.eq2`),
    bond: t(`regions.${region}.bond`),
    threshold: t(`regions.${region}.threshold`),
    eq1_tick: REGION_LABELS[region].eq1_tick,
    eq2_tick: REGION_LABELS[region].eq2_tick,
    bond_tick: REGION_LABELS[region].bond_tick,
  };

  const getSignalColor = (signal: string) => {
    if (signal === labels.eq1_tick) return "bg-green-600 hover:bg-green-700";
    if (signal === labels.eq2_tick) return "bg-blue-600 hover:bg-blue-700";
    return "bg-yellow-600 hover:bg-yellow-700"; // Bond
  };

  const getSignalInterpretation = (signal: string, momentum: any) => {
    if (!momentum) return "";

    const eq1Mom = percent(momentum[labels.eq1_tick] || 0);
    const eq2Mom = percent(momentum[labels.eq2_tick] || 0);
    const bondMom = percent(momentum[labels.bond_tick] || 0);
    const thresholdMom = percent(momentum.THRESHOLD || 0);

    if (signal === labels.eq1_tick) {
      return t('allocation.interpretationEq1', {
        eq1: labels.eq1,
        eq1Mom,
        eq2Mom,
        threshold: labels.threshold,
        thresholdMom
      });
    } else if (signal === labels.eq2_tick) {
      return t('allocation.interpretationEq2', {
        eq2: labels.eq2,
        eq2Mom,
        eq1: labels.eq1,
        eq1Mom,
        threshold: labels.threshold,
        thresholdMom
      });
    } else if (signal === labels.bond_tick || signal === "BND" || signal === "AGGH.AS") {
      const rawEq1Mom = momentum[labels.eq1_tick] || 0;
      const rawEq2Mom = momentum[labels.eq2_tick] || 0;
      const rawThresholdMom = momentum.THRESHOLD || 0;
      
      if (rawEq1Mom < rawThresholdMom && rawEq2Mom < rawThresholdMom) {
        return t('allocation.interpretationBondBoth', {
          eq1: labels.eq1,
          eq1Mom,
          eq2: labels.eq2,
          eq2Mom,
          threshold: labels.threshold,
          thresholdMom,
          bondMom
        });
      } else {
        return t('allocation.interpretationBondDefensive', { bondMom });
      }
    }
    return "";
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 font-mono">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-border pb-4 gap-4 md:gap-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tighter text-foreground">{t('header.title')}</h1>
            <p className="text-xs md:text-sm text-muted-foreground">{t('header.subtitle', { region })}</p>
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
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{t('settings.title')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {/* Region Selection */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2">{t('settings.regional')}</h3>
                    <p className="text-xs text-muted-foreground mb-3">{t('settings.regionalDescription')}</p>
                    <RadioGroup value={region} onValueChange={handleRegionChange} className="space-y-3">
                      <div className="flex items-center space-x-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value="US" id="us" />
                        <Label htmlFor="us" className="flex-1 cursor-pointer">
                          <div className="font-semibold">{t('settings.unitedStates')}</div>
                          <div className="text-xs text-muted-foreground">SPY, VEU, BND, ^IRX</div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value="EU" id="eu" />
                        <Label htmlFor="eu" className="flex-1 cursor-pointer">
                          <div className="font-semibold">{t('settings.europe')}</div>
                          <div className="text-xs text-muted-foreground">CSPX, EXUS, AGGH, PJEU</div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <Separator />

                  {/* Language Selection */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2">{t('settings.language')}</h3>
                    <p className="text-xs text-muted-foreground mb-3">{t('settings.languageDescription')}</p>
                    <RadioGroup value={language} onValueChange={handleLanguageChange} className="space-y-3">
                      <div className="flex items-center space-x-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value="en" id="lang-en" />
                        <Label htmlFor="lang-en" className="flex-1 cursor-pointer">
                          <div className="font-semibold">English</div>
                          <div className="text-xs text-muted-foreground">International</div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value="pl" id="lang-pl" />
                        <Label htmlFor="lang-pl" className="flex-1 cursor-pointer">
                          <div className="font-semibold">Polski</div>
                          <div className="text-xs text-muted-foreground">Polska</div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

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
                      {t('strategy.subtitle')}
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
                    {t('strategy.whatIsDescription', {
                      eq1: labels.eq1,
                      eq2: labels.eq2,
                      bond: labels.bond,
                      threshold: labels.threshold
                    })}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground mb-2">{t('strategy.howItWorksTitle')}</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 leading-relaxed">
                    <li>{t('strategy.howItWorksStep1', {
                      eq1Tick: labels.eq1_tick,
                      eq2Tick: labels.eq2_tick,
                      threshold: labels.threshold
                    })}</li>
                    <li>{t('strategy.howItWorksStep2')}</li>
                    <li>{t('strategy.howItWorksStep3', { threshold: labels.threshold })}</li>
                    <li>{t('strategy.howItWorksStep4', {
                      bond: labels.bond,
                      bondTick: labels.bond_tick
                    })}</li>
                    <li>{t('strategy.howItWorksStep5')}</li>
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
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">{t('momentum.loadingMarketData')}</TableCell>
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
                                {t('common.selected')}
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

            <AllocationChanges data={history} />

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
                <HistoryChart data={history} labels={labels} />

                <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
                  <CollapsibleContent className="pt-4 border-t border-border">
                    <HistoryTable data={history} labels={labels} />
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
              href="https://buymeacoffee.com/kristof.pro"
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
