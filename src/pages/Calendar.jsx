import { useState } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { CalendarRange, ChevronLeft, ChevronRight, Info } from "lucide-react";

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const Calendar = () => {
    const [month, setMonth] = useState(new Date());

    const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
    const startDay = startOfMonth(month).getDay();
    const today = new Date();

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-2">
                <CalendarRange className="size-6" />
                <h1 className="text-xl font-semibold">Calendar</h1>
            </div>

            {/* Flexible work days note */}
            <div className="flex gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <Info className="size-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900 dark:text-blue-200 space-y-1">
                    <p className="font-medium">You've been allocated 3 flexible work days.</p>
                    <p>
                        On these days you can work on your assigned project on a working-day basis — around 3 hours
                        per day, within your own flexible free time. No daily code submission is required on flexible
                        days, but you must still complete your standup every day. Project submission is only needed
                        once the project is fully completed.
                    </p>
                </div>
            </div>

            {/* Holiday calendar — weekends off */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Holiday Calendar</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setMonth((m) => subMonths(m, 1))} className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800">
                            <ChevronLeft className="size-4" />
                        </button>
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 w-28 text-center">{format(month, "MMMM yyyy")}</span>
                        <button onClick={() => setMonth((m) => addMonths(m, 1))} className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800">
                            <ChevronRight className="size-4" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center">
                    {WEEKDAY_LABELS.map((d) => (
                        <div key={d} className="text-[10px] font-medium text-zinc-400 py-1">{d}</div>
                    ))}
                    {Array.from({ length: startDay }).map((_, i) => <div key={`e${i}`} />)}
                    {days.map((day) => {
                        const dow = day.getDay();
                        const isWeekend = dow === 0 || dow === 6;
                        const isToday = isSameDay(day, today);
                        return (
                            <div key={format(day, "yyyy-MM-dd")}
                                className={`rounded-lg py-1.5 text-xs font-medium relative ${
                                    isWeekend
                                        ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                                        : "text-zinc-700 dark:text-zinc-300"
                                } ${isToday ? "ring-2 ring-blue-500" : ""}`}
                            >
                                {format(day, "d")}
                                {isWeekend && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-500" />}
                            </div>
                        );
                    })}
                </div>

                <div className="flex items-center gap-4 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 inline-block" />
                        Weekend (Sat / Sun) — holiday
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded ring-2 ring-blue-500 inline-block" />
                        Today
                    </span>
                </div>
            </div>
        </div>
    );
};

export default Calendar;
