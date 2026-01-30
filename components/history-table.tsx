"use client";

import { useState } from "react";
import { HistoryRecord } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function HistoryTable({ data, labels }: { data: HistoryRecord[], labels: any }) {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const formatPercent = (val: number) => (val * 100).toFixed(2) + "%";

    const totalPages = Math.ceil(data.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentData = data.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="space-y-4">
            <Table>
                <TableHeader>
                    <TableRow className="border-border hover:bg-transparent text-xs">
                        <TableHead className="text-muted-foreground">Date</TableHead>
                        <TableHead className="text-muted-foreground">Signal</TableHead>
                        <TableHead className="text-right text-muted-foreground">{labels.eq1_tick}</TableHead>
                        <TableHead className="text-right text-muted-foreground">{labels.eq2_tick}</TableHead>
                        <TableHead className="text-right text-muted-foreground">{labels.threshold}</TableHead>
                        <TableHead className="text-right text-muted-foreground">{labels.bond_tick}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {currentData.map((record) => (
                        <TableRow key={record.id} className="border-border hover:bg-muted/50 text-xs">
                            <TableCell className="text-foreground font-mono">
                                {new Date(record.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell className={`font-bold ${(record.signal === labels.eq1_tick || record.signal === 'SPY') ? 'text-green-500' :
                                (record.signal === labels.eq2_tick || record.signal === 'VEU') ? 'text-blue-500' : 'text-yellow-500'
                                }`}>
                                {record.signal}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">{formatPercent(record.spy_mom)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{formatPercent(record.veu_mom)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">
                                {record.tbill_mom !== undefined ? formatPercent(record.tbill_mom) : "—"}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">{formatPercent(record.bnd_mom)}</TableCell>
                        </TableRow>
                    ))}
                    {data.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground h-24">No history available yet.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            {totalPages > 1 && (
                <div className="flex items-center justify-between py-2">
                    <p className="text-xs text-muted-foreground">
                        Page {currentPage} of {totalPages} ({data.length} records)
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
                            <span className="sr-only">Previous page</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                        >
                            <ChevronRight className="h-4 w-4" />
                            <span className="sr-only">Next page</span>
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
