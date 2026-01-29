"use client";

import { HistoryRecord } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";

export function HistoryChart({ data }: { data: HistoryRecord[] }) {
    // Reverse data for chart (oldest to newest)
    const chartData = [...data].reverse().map(d => ({
        ...d,
        dateStr: new Date(d.date).toLocaleDateString(),
        // Map signals to numeric values for Step Chart: BND=0, VEU=1, SPY=2
        signalValue: d.signal === 'BND' ? 0 : d.signal === 'VEU' ? 1 : 2
    }));

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            return (
                <div className="bg-neutral-900 border border-neutral-800 p-2 rounded shadow-xl text-neutral-200 text-xs">
                    <p className="font-bold mb-1">{label}</p>
                    <p>Signal: <span className={d.signal === 'SPY' ? 'text-green-400' : d.signal === 'VEU' ? 'text-blue-400' : 'text-yellow-400'}>{d.signal}</span></p>
                    <p>SPY: {(d.spy_mom * 100).toFixed(2)}%</p>
                    <p>VEU: {(d.veu_mom * 100).toFixed(2)}%</p>
                </div>
            );
        }
        return null;
    };

    return (
        <Card className="bg-neutral-900 border-neutral-800">
            <CardHeader>
                <CardTitle className="text-neutral-400 text-sm uppercase tracking-wider">Signal History (6 Months)</CardTitle>
                <CardDescription className="text-neutral-600">Evolution of the trading signal over time.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                            <XAxis
                                dataKey="dateStr"
                                stroke="#525252"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                minTickGap={30}
                            />
                            <YAxis
                                stroke="#525252"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                ticks={[0, 1, 2]}
                                tickFormatter={(val) => val === 0 ? "BND" : val === 1 ? "VEU" : "SPY"}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Line
                                type="stepAfter"
                                dataKey="signalValue"
                                stroke="#e11d48"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4, fill: "#e11d48" }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
