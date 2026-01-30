"use client";

import { HistoryRecord } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import { useTheme } from "next-themes";

export function HistoryChart({ data }: { data: HistoryRecord[] }) {
    const { theme } = useTheme();
    // Reverse and limit to ~6 months (180 days)
    const chartData = [...data]
        .slice(0, 180) // Last 180 records (roughly 6 months)
        .reverse()
        .map(d => ({
            ...d,
            dateStr: new Date(d.date).toLocaleDateString(),
            // Map signals to numeric values for Step Chart: BND=0, VEU=1, SPY=2
            signalValue: d.signal === 'BND' ? 0 : d.signal === 'VEU' ? 1 : 2
        }));

    const isDark = theme === "dark";
    const axisColor = isDark ? "#525252" : "#a3a3a3";
    const gridColor = isDark ? "#262626" : "#e5e5e5";

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            return (
                <div className="bg-popover border border-border p-2 rounded shadow-xl text-popover-foreground text-xs">
                    <p className="font-bold mb-1">{label}</p>
                    <p>Signal: <span className={d.signal === 'SPY' ? 'text-green-500' : d.signal === 'VEU' ? 'text-blue-500' : 'text-yellow-500'}>{d.signal}</span></p>
                    <p>SPY: {(d.spy_mom * 100).toFixed(2)}%</p>
                    <p>VEU: {(d.veu_mom * 100).toFixed(2)}%</p>
                    {d.tbill_mom !== undefined && <p>T-Bill: {(d.tbill_mom * 100).toFixed(2)}%</p>}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis
                        dataKey="dateStr"
                        stroke={axisColor}
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={30}
                    />
                    <YAxis
                        stroke={axisColor}
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
    );
}

