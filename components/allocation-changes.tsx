"use client";

import { memo } from "react";
import { useAllocationChanges } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowRightIcon, CalendarIcon, ClockIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from 'next-intl';
import { useFormattedDate } from "@/lib/i18n-utils";

export const AllocationChanges = memo(function AllocationChanges({ region }: { region: string }) {
    const t = useTranslations('allocationChanges');
    const formatDate = useFormattedDate();
    
    const { data, isLoading, error } = useAllocationChanges(region);
    
    // Loading state
    if (isLoading) {
        return (
            <Card className="bg-card border-border mb-6 col-span-2">
                <CardHeader className="pb-2">
                    <CardTitle className="text-foreground text-lg tracking-tight">{t('title')}</CardTitle>
                    <CardDescription className="text-muted-foreground">{t('description')}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pt-4">
                    <Skeleton className="h-24 w-full bg-muted" />
                    <Skeleton className="h-24 w-full bg-muted" />
                    <Skeleton className="h-24 w-full bg-muted" />
                </CardContent>
            </Card>
        );
    }
    
    // Error state
    if (error || !data) {
        return (
            <Card className="bg-card border-border mb-6">
                <CardHeader>
                    <CardTitle className="text-muted-foreground text-sm uppercase tracking-wider">{t('title')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-destructive">{t('loadingError')}</p>
                </CardContent>
            </Card>
        );
    }
    
    // No history available
    if (!data.has_history) {
        return (
            <Card className="bg-card border-border mb-6">
                <CardHeader>
                    <CardTitle className="text-muted-foreground text-sm uppercase tracking-wider">{t('title')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">{t('noHistory')}</p>
                </CardContent>
            </Card>
        );
    }
    
    // Signal never changed in entire history
    if (data.no_change_in_history) {
        return (
            <Card className="bg-card border-border mb-6">
                <CardHeader>
                    <CardTitle className="text-muted-foreground text-sm uppercase tracking-wider">{t('title')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground" dangerouslySetInnerHTML={{
                        __html: t('stableHistory', { 
                            signal: data.current_signal || 'N/A', 
                            days: data.days_since_change || 0
                        })
                    }} />
                </CardContent>
            </Card>
        );
    }
    
    // Normal case: Show allocation change details
    // TypeScript check: ensure required fields exist
    if (!data.current_signal || !data.previous_signal || !data.last_change_date || 
        data.days_since_change === undefined || data.previous_signal_duration_days === undefined) {
        return (
            <Card className="bg-card border-border mb-6">
                <CardHeader>
                    <CardTitle className="text-muted-foreground text-sm uppercase tracking-wider">{t('title')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-destructive">{t('loadingError')}</p>
                </CardContent>
            </Card>
        );
    }
    
    const { current_signal, previous_signal, last_change_date, days_since_change, previous_signal_duration_days } = data;

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
                        <span className={`font-bold ${previous_signal === 'SPY' ? 'text-green-500' : previous_signal === 'VEU' ? 'text-blue-500' : 'text-yellow-500'}`}>
                            {previous_signal}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className={`font-bold ${current_signal === 'SPY' ? 'text-green-500' : current_signal === 'VEU' ? 'text-blue-500' : 'text-yellow-500'}`}>
                            {current_signal}
                        </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {t('occurredOn', { date: formatDate(new Date(last_change_date!)) })}
                    </div>
                </div>

                {/* CURRENT STREAK */}
                <div className="flex flex-col space-y-2 p-4 bg-muted/50 rounded-lg border border-border">
                    <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold flex items-center">
                        <ClockIcon className="w-3 h-3 mr-2" /> {t('currentTrend')}
                    </span>
                    <div className="text-2xl font-mono text-foreground">
                        {days_since_change} <span className="text-sm text-muted-foreground font-sans">{t('days')}</span>
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
                        {previous_signal_duration_days} <span className="text-sm text-muted-foreground font-sans">{t('days')}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {t('durationOfSignal', { signal: previous_signal })}
                    </div>
                </div>

            </CardContent>
        </Card>

    );
});
