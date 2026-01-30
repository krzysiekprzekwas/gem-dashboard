"use client";

import { HistoryRecord } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function HistoryTable({ data }: { data: HistoryRecord[] }) {
    const formatPercent = (val: number) => (val * 100).toFixed(2) + "%";

    return (
        <Card className="bg-neutral-900 border-neutral-800">
            <CardHeader>
                <CardTitle className="text-neutral-400 text-sm uppercase tracking-wider">Historical Signals (Last 30 Days)</CardTitle>
                <CardDescription className="text-neutral-600">Daily closing signals and momentum values.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow className="border-neutral-800 hover:bg-transparent">
                            <TableHead className="text-neutral-500">Date</TableHead>
                            <TableHead className="text-neutral-500">Signal</TableHead>
                            <TableHead className="text-right text-neutral-500">SPY Mom</TableHead>
                            <TableHead className="text-right text-neutral-500">VEU Mom</TableHead>
                            <TableHead className="text-right text-neutral-500">BND Mom</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.slice(0, 30).map((record) => (
                            <TableRow key={record.id} className="border-neutral-800 hover:bg-neutral-800/50">

                                <TableCell className="text-neutral-300 font-mono">
                                    {new Date(record.date).toLocaleDateString()}
                                </TableCell>
                                <TableCell className={`font-bold ${record.signal === 'SPY' ? 'text-green-500' :
                                    record.signal === 'VEU' ? 'text-blue-500' : 'text-yellow-500'
                                    }`}>
                                    {record.signal}
                                </TableCell>
                                <TableCell className="text-right text-neutral-400">{formatPercent(record.spy_mom)}</TableCell>
                                <TableCell className="text-right text-neutral-400">{formatPercent(record.veu_mom)}</TableCell>
                                <TableCell className="text-right text-neutral-400">{formatPercent(record.bnd_mom)}</TableCell>
                            </TableRow>
                        ))}
                        {data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-neutral-500 h-24">No history available yet.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
