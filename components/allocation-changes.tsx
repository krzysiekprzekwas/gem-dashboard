"use client";

import { HistoryRecord } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowRightIcon, CalendarIcon, ClockIcon } from "lucide-react";

export function AllocationChanges({ data }: { data: HistoryRecord[] }) {
    if (!data || data.length === 0) return null;

    // Sort descending by date
    const sorted = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Find latest shift
    let currentSignal = sorted[0].signal;
    let shiftIndex = -1;

    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].signal !== currentSignal) {
            shiftIndex = i; // Index where the signal was DIFFERENT (so i-1 was the start of current)
            break;
        }
    }

    // If no shift found in history, we can't show much
    if (shiftIndex === -1) {
        return (
            <Card className="bg-neutral-900 border-neutral-800 mb-6">
                <CardHeader>
                    <CardTitle className="text-neutral-400 text-sm uppercase tracking-wider">Allocation Trend</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-neutral-500">Signal has been stable as <strong>{currentSignal}</strong> for the entire available history ({sorted.length} days).</p>
                </CardContent>
            </Card>
        );
    }

    // Calculate details
    // The "shift" happened AFTER the record at shiftIndex. 
    // So shiftIndex is the last day of the OLD signal.
    // shiftIndex - 1 is the first day of the NEW signal (if we iterate backwards from now) 
    // actually, sorted[0] is today. sorted[shiftIndex-1] is the earliest date of the current run.

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
        // rough calc
        const start = new Date(sorted[prevRunStartIndex].date).getTime();
        const end = new Date(previousRunEnd.date).getTime();
        prevRunDays = Math.floor((end - start) / (1000 * 3600 * 24)) + 1;
    } else {
        prevRunDays = sorted.length - shiftIndex; // Approximate rest of history
    }

    return (
        <Card className="bg-neutral-900 border-neutral-800 mb-6 col-span-2">
            <CardHeader className="pb-2">
                <CardTitle className="text-white text-lg tracking-tight">Allocation Changes</CardTitle>
                <CardDescription className="text-neutral-500">Trend stability analysis</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pt-4">

                {/* LATEST SHIFT */}
                <div className="flex flex-col space-y-2 p-4 bg-neutral-950/50 rounded-lg border border-neutral-800">
                    <span className="text-xs text-neutral-500 uppercase tracking-widest font-semibold flex items-center">
                        <ArrowRightIcon className="w-3 h-3 mr-2" /> Latest Shift
                    </span>
                    <div className="flex items-center space-x-2 text-sm text-neutral-300">
                        <span className={`font-bold ${previousSignal === 'SPY' ? 'text-green-500' : previousSignal === 'VEU' ? 'text-blue-500' : 'text-yellow-500'}`}>
                            {previousSignal}
                        </span>
                        <span className="text-neutral-600">→</span>
                        <span className={`font-bold ${currentSignal === 'SPY' ? 'text-green-500' : currentSignal === 'VEU' ? 'text-blue-500' : 'text-yellow-500'}`}>
                            {currentSignal}
                        </span>
                    </div>
                    <div className="text-xs text-neutral-500">
                        Occurred on {new Date(currentRunStart.date).toLocaleDateString()}
                    </div>
                </div>

                {/* CURRENT STREAK */}
                <div className="flex flex-col space-y-2 p-4 bg-neutral-950/50 rounded-lg border border-neutral-800">
                    <span className="text-xs text-neutral-500 uppercase tracking-widest font-semibold flex items-center">
                        <ClockIcon className="w-3 h-3 mr-2" /> Current Trend
                    </span>
                    <div className="text-2xl font-mono text-white">
                        {daysSinceShift} <span className="text-sm text-neutral-500 font-sans">Days</span>
                    </div>
                    <div className="text-xs text-neutral-500">
                        Stable since shift
                    </div>
                </div>

                {/* PREVIOUS STREAK */}
                <div className="flex flex-col space-y-2 p-4 bg-neutral-950/50 rounded-lg border border-neutral-800">
                    <span className="text-xs text-neutral-500 uppercase tracking-widest font-semibold flex items-center">
                        <CalendarIcon className="w-3 h-3 mr-2" /> Previous Duration
                    </span>
                    <div className="text-2xl font-mono text-neutral-400">
                        {prevRunDays} <span className="text-sm text-neutral-600 font-sans">Days</span>
                    </div>
                    <div className="text-xs text-neutral-500">
                        Duration of {previousSignal} signal
                    </div>
                </div>

            </CardContent>
        </Card>
    );
}
