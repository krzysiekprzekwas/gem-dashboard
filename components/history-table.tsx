"use client";

import { useState, memo } from "react";
import { HistoryRecord, StrategyView, signalColor } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from 'next-intl';
import { useFormattedDate, useFormattedNumber } from "@/lib/i18n-utils";

// History momentum columns are ordered slots (asset[0..3]).
const SLOT_KEYS = ["spy_mom", "veu_mom", "bnd_mom", "tbill_mom"] as const;

export const HistoryTable = memo(function HistoryTable({ data, view }: { data: HistoryRecord[], view: StrategyView }) {
    const t = useTranslations('historyTable');
    const formatDate = useFormattedDate();
    const { percent } = useFormattedNumber();

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const totalPages = Math.ceil(data.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentData = data.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="space-y-4">
            <div className="overflow-x-auto">
                <Table className="min-w-[600px] md:min-w-0">
                <TableHeader>
                    <TableRow className="border-border hover:bg-transparent text-xs">
                        <TableHead className="text-muted-foreground">{t('date')}</TableHead>
                        <TableHead className="text-muted-foreground">{t('signal')}</TableHead>
                        {view.assets.map((ticker) => (
                            <TableHead key={ticker} className="text-right text-muted-foreground">{ticker}</TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {currentData.map((record) => (
                        <TableRow key={record.id} className="border-border hover:bg-muted/50 text-xs">
                            <TableCell className="text-foreground font-mono">
                                {formatDate(new Date(record.date))}
                            </TableCell>
                            <TableCell className={`font-bold ${signalColor(view.assets, record.signal)}`}>
                                {record.signal}
                            </TableCell>
                            {view.assets.map((ticker, i) => {
                                const val = (record as any)[SLOT_KEYS[i]];
                                return (
                                    <TableCell key={ticker} className="text-right text-muted-foreground">
                                        {val !== undefined && val !== null ? percent(val) : "—"}
                                    </TableCell>
                                );
                            })}
                        </TableRow>
                    ))}
                    {data.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={2 + view.assets.length} className="text-center text-muted-foreground h-24">{t('noHistoryAvailable', { ns: 'history' })}</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between py-2">
                    <p className="text-xs text-muted-foreground">
                        {t('page', { current: currentPage, total: totalPages, records: data.length })}
                    </p>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            <span className="sr-only">{t('previousPage')}</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                        >
                            <ChevronRight className="h-4 w-4" />
                            <span className="sr-only">{t('nextPage')}</span>
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
});
