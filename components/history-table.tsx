"use client";

import { HistoryRecord } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function HistoryTable({ data }: { data: HistoryRecord[] }) {
    const formatPercent = (val: number) => (val * 100).toFixed(2) + "%";

    return (
        <Card className="bg-card border-border">
            <CardHeader>
                <CardTitle className="text-muted-foreground text-sm uppercase tracking-wider">Historical Signals (Last 30 Days)</CardTitle>
                <CardDescription className="text-muted-foreground">Daily closing signals and momentum values.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="text-muted-foreground">Date</TableHead>
                            <TableHead className="text-muted-foreground">Signal</TableHead>
                            <TableHead className="text-right text-muted-foreground">SPY Mom</TableHead>
                            <TableHead className="text-right text-muted-foreground">VEU Mom</TableHead>
                            <TableHead className="text-right text-muted-foreground">BND Mom</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.slice(0, 30).map((record) => (
                            <TableRow key={record.id} className="border-border hover:bg-muted/50">

                                <TableCell className="text-foreground font-mono">
                                    {new Date(record.date).toLocaleDateString()}
                                </TableCell>
                                <TableCell className={`font-bold ${record.signal === 'SPY' ? 'text-green-500' :
                                    record.signal === 'VEU' ? 'text-blue-500' : 'text-yellow-500'
                                    }`}>
                                    {record.signal}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">{formatPercent(record.spy_mom)}</TableCell>
                                <TableCell className="text-right text-muted-foreground">{formatPercent(record.veu_mom)}</TableCell>
                                <TableCell className="text-right text-muted-foreground">{formatPercent(record.bnd_mom)}</TableCell>
                            </TableRow>
                        ))}
                        {data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground h-24">No history available yet.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
