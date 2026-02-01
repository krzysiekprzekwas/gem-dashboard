"use client";

import { memo } from "react";
import { HistoryRecord } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowRightIcon, CalendarIcon, ClockIcon } from "lucide-react";
import { useTranslations } from 'next-intl';
import { useFormattedDate } from "@/lib/i18n-utils";

export const AllocationChanges = memo(function AllocationChanges({ data }: { data: HistoryRecord[] }) {
    const t = useTranslations('allocationChanges');
    const formatDate = useFormattedDate();
    
    if (!data || data.length === 0) return null;

    // Sort descending by date
    const sorted = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Find latest shift
    const currentSignal = sorted[0].signal;
    let shiftIndex = -1;

    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].signal !== currentSignal) {
            shiftIndex = i; // Index where the signal was DIFFERENT (so i-1 was the start of current)
            break;
        }
    }

    if (shiftIndex === -1) {
        return (
            <Card className="bg-card border-border mb-6">
                <CardHeader>
                    <CardTitle className="text-muted-foreground text-sm uppercase tracking-wider">{t('title')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground" dangerouslySetInnerHTML={{
                        __html: t('stableHistory', { signal: currentSignal, days: sorted.length })
                    }} />
                </CardContent>
            </Card>
        );
    }

    // Calculate details
    const currentRunStart = sorted[shiftIndex - 1];
    const previousRunEnd = sorted[shiftIndex];
    const previousSignal = previousRunEnd.signal;

    const daysSinceShift = Math.floor((new Date().getTime() - new Date(currentRunStart.date).getTime()) / (1000 * 3600 * 24));

    // Find duration of previous run
    let prevRunStartIndex = -1;
    for (let i = shiftIndex + 1; i < sorted.length; i++) {
        if (sorted[i].signal !== previousSignal) {
            prevRunStartIndex = i - 1; // Last day of that signal
            break;
        }
    }

    let prevRunDays = 0;
    if (prevRunStartIndex !== -1) {
        const start = new Date(sorted[prevRunStartIndex].date).getTime();
        const end = new Date(previousRunEnd.date).getTime();
        prevRunDays = Math.floor((end - start) / (1000 * 3600 * 24)) + 1;
    } else {
        prevRunDays = sorted.length - shiftIndex;
    }

    return (
        <Card className="bg-card border-border mb-6 col-span-2">
            <CardHeader className="pb-2">
                <CardTitle className="text-foreground text-lg tracking-tight">{t('title')}</CardTitle>
                <CardDescription className="text-muted-foreground">{t('description')}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pt-4">

                {/* LATEST SHIFT */}
                <div className="flex flex-col space-y-2 p-4 bg-muted/50 rounded-lg border border-border">
                    <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold flex items-center">
                        <ArrowRightIcon className="w-3 h-3 mr-2" /> {t('latestShift')}
                    </span>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <span className={`font-bold ${previousSignal === 'SPY' ? 'text-green-500' : previousSignal === 'VEU' ? 'text-blue-500' : 'text-yellow-500'}`}>
                            {previousSignal}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className={`font-bold ${currentSignal === 'SPY' ? 'text-green-500' : currentSignal === 'VEU' ? 'text-blue-500' : 'text-yellow-500'}`}>
                            {currentSignal}
                        </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {t('occurredOn', { date: formatDate(new Date(currentRunStart.date)) })}
                    </div>
                </div>

                {/* CURRENT STREAK */}
                <div className="flex flex-col space-y-2 p-4 bg-muted/50 rounded-lg border border-border">
                    <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold flex items-center">
                        <ClockIcon className="w-3 h-3 mr-2" /> {t('currentTrend')}
                    </span>
                    <div className="text-2xl font-mono text-foreground">
                        {daysSinceShift} <span className="text-sm text-muted-foreground font-sans">{t('days')}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {t('stableSinceShift')}
                    </div>
                </div>

                {/* PREVIOUS STREAK */}
                <div className="flex flex-col space-y-2 p-4 bg-muted/50 rounded-lg border border-border">
                    <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold flex items-center">
                        <CalendarIcon className="w-3 h-3 mr-2" /> {t('previousDuration')}
                    </span>
                    <div className="text-2xl font-mono text-muted-foreground">
                        {prevRunDays} <span className="text-sm text-muted-foreground font-sans">{t('days')}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {t('durationOfSignal', { signal: previousSignal })}
                    </div>
                </div>

            </CardContent>
        </Card>

    );
});
