"use client";

import { memo, useCallback } from "react";
import { HistoryRecord, StrategyView, signalColor } from "@/lib/api";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useTheme } from "next-themes";
import { useTranslations } from 'next-intl';
import { useFormattedDate, useFormattedNumber } from "@/lib/i18n-utils";

// History momentum columns are ordered slots (asset[0..3]).
const SLOT_KEYS = ["spy_mom", "veu_mom", "bnd_mom", "tbill_mom"] as const;

export const HistoryChart = memo(function HistoryChart({ data, view }: { data: HistoryRecord[], view: StrategyView }) {
    const { theme } = useTheme();
    const t = useTranslations('historyTable');
    const formatDate = useFormattedDate();
    const { percent } = useFormattedNumber();

    const n = view.assets.length;
    // Step-chart height: slot 0 at the top, descending. Signal not in the asset
    // list (shouldn't happen) falls to 0.
    const heightOf = (signal: string) => {
        const i = view.assets.indexOf(signal);
        return i < 0 ? 0 : n - 1 - i;
    };

    // Data is already filtered by parent; reverse for chronological X axis
    const chartData = [...data]
        .reverse()
        .map(d => ({
            ...d,
            dateStr: formatDate(new Date(d.date)),
            signalValue: heightOf(d.signal),
        }));

    const isDark = theme === "dark";
    const axisColor = isDark ? "#525252" : "#a3a3a3";
    const gridColor = isDark ? "#262626" : "#e5e5e5";

    const CustomTooltip = useCallback(({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            return (
                <div className="bg-popover border border-border p-2 rounded shadow-xl text-popover-foreground text-xs">
                    <p className="font-bold mb-1">{label}</p>
                    <p>{t('signal')}: <span className={signalColor(view.assets, d.signal)}>{d.signal}</span></p>
                    {view.assets.map((ticker, i) => {
                        const val = (d as any)[SLOT_KEYS[i]];
                        if (val === undefined || val === null) return null;
                        return <p key={ticker}>{ticker}: {percent(val)}</p>;
                    })}
                </div>
            );
        }
        return null;
    }, [view, t, percent]);

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
                        ticks={view.assets.map((_, i) => i)}
                        tickFormatter={(val) => view.assets[n - 1 - val] ?? ""}
                    />
                    <Tooltip content={CustomTooltip} />
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
});
