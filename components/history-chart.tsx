"use client";

import { memo, useCallback } from "react";
import { HistoryRecord } from "@/lib/api";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useTheme } from "next-themes";
import { useTranslations } from 'next-intl';
import { useFormattedDate, useFormattedNumber } from "@/lib/i18n-utils";

export const HistoryChart = memo(function HistoryChart({ data, labels }: { data: HistoryRecord[], labels: any }) {
    const { theme } = useTheme();
    const t = useTranslations('historyTable');
    const formatDate = useFormattedDate();
    const { percent } = useFormattedNumber();
    
    // Data is already filtered by parent; reverse for chronological X axis
    const chartData = [...data]
        .reverse()
        .map(d => ({
            ...d,
            dateStr: formatDate(new Date(d.date)),
            // Map signals to numeric values for Step Chart: Bond=0, Eq2=1, Eq1=2
            signalValue: (d.signal === labels.bond_tick || d.signal === 'BND' || d.signal === 'AGGH.AS') ? 0 :
                (d.signal === labels.eq2_tick || d.signal === 'VEU' || d.signal === 'EXUS.L') ? 1 : 2
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
                    <p>{t('signal')}: <span className={(d.signal === labels.eq1_tick || d.signal === 'SPY') ? 'text-green-500' :
                        (d.signal === labels.eq2_tick || d.signal === 'VEU') ? 'text-blue-500' : 'text-yellow-500'}>
                        {d.signal}
                    </span></p>
                    <p>{labels.eq1_tick}: {percent(d.spy_mom)}</p>
                    <p>{labels.eq2_tick}: {percent(d.veu_mom)}</p>
                    {d.tbill_mom !== undefined && <p>{labels.threshold}: {percent(d.tbill_mom)}</p>}
                </div>
            );
        }
        return null;
    }, [labels, t, percent]);

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
                        tickFormatter={(val) => val === 0 ? labels.bond_tick : val === 1 ? labels.eq2_tick : labels.eq1_tick}
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
