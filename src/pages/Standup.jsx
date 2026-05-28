import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useAuth } from "../auth/AuthContext";
import api from "../configs/api";
import toast from "react-hot-toast";
import {
    ClipboardList, Plus, Pencil, Trash2, ChevronLeft, ChevronRight,
    Loader2, User, CheckCircle2, XCircle, BarChart2, Calendar, RefreshCw,
} from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from "date-fns";

const TYPES = [
    "SOFTWARE_DEV", "DATA_ANALYSIS", "BRAINSTORM", "DESIGN",
    "TESTING", "DOCUMENTATION", "MEETING", "OTHER",
];

const TYPE_LABEL = {
    SOFTWARE_DEV: "Software Dev", DATA_ANALYSIS: "Data Analysis",
    BRAINSTORM: "Brainstorm", DESIGN: "Design", TESTING: "Testing",
    DOCUMENTATION: "Documentation", MEETING: "Meeting", OTHER: "Other",
};

const TYPE_COLOR = {
    SOFTWARE_DEV: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
    DATA_ANALYSIS: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
    BRAINSTORM: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300",
    DESIGN: "bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300",
    TESTING: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300",
    DOCUMENTATION: "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300",
    MEETING: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300",
    OTHER: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
};

const todayKey = () => format(new Date(), "yyyy-MM-dd");
const monthKey = (d) => format(d, "yyyy-MM");

// ─────────────────────────────────────────────────────────────────────────────
//  Shared entry card
// ─────────────────────────────────────────────────────────────────────────────
function EntryCard({ entry, onEdit, onDelete, canEdit }) {
    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${TYPE_COLOR[entry.type] || TYPE_COLOR.OTHER}`}>
                            {TYPE_LABEL[entry.type] || entry.type}
                        </span>
                        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{entry.title}</span>
                    </div>
                    {entry.description && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 whitespace-pre-wrap">{entry.description}</p>
                    )}
                </div>
                {canEdit && (
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => onEdit(entry)} className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition">
                            <Pencil className="size-3.5" />
                        </button>
                        <button onClick={() => onDelete(entry.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition">
                            <Trash2 className="size-3.5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Intern view
// ─────────────────────────────────────────────────────────────────────────────
function InternView({ workspaceId, getToken }) {
    const [month, setMonth] = useState(new Date());
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedDay, setSelectedDay] = useState(todayKey());
    const [form, setForm] = useState({ title: "", type: "SOFTWARE_DEV", description: "", taskId: "" });
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const fetchEntries = async (m) => {
        if (!workspaceId) return;
        setLoading(true);
        try {
            const { data } = await api.get(
                `/api/standup/me?workspaceId=${workspaceId}&month=${monthKey(m)}`,
                { headers: { Authorization: `Bearer ${await getToken()}` } }
            );
            setEntries(data.entries || []);
        } catch (err) {
            toast.error(err?.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchEntries(month); }, [month, workspaceId]);

    const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
    const entryDates = new Set(entries.map((e) => e.date?.substring(0, 10)));
    const dayEntries = entries.filter((e) => e.date?.startsWith(selectedDay));
    const isToday = selectedDay === todayKey();

    const resetForm = () => { setForm({ title: "", type: "SOFTWARE_DEV", description: "", taskId: "" }); setEditingId(null); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) return;
        setSubmitting(true);
        try {
            if (editingId) {
                await api.put(`/api/standup/${editingId}`, form, { headers: { Authorization: `Bearer ${await getToken()}` } });
                toast.success("Entry updated");
            } else {
                await api.post("/api/standup", { workspaceId, ...form }, { headers: { Authorization: `Bearer ${await getToken()}` } });
                toast.success("Entry submitted");
            }
            resetForm();
            fetchEntries(month);
        } catch (err) {
            toast.error(err?.response?.data?.message || err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (entry) => {
        setEditingId(entry.id);
        setForm({ title: entry.title, type: entry.type, description: entry.description || "", taskId: entry.taskId || "" });
        setSelectedDay(entry.date?.substring(0, 10));
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this entry?")) return;
        try {
            await api.delete(`/api/standup/${id}`, { headers: { Authorization: `Bearer ${await getToken()}` } });
            toast.success("Deleted");
            fetchEntries(month);
        } catch (err) {
            toast.error(err?.response?.data?.message || err.message);
        }
    };

    const startDay = startOfMonth(month).getDay();

    return (
        <div className="space-y-6">
            {/* Submit / Edit form — always visible at top */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
                <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    {editingId ? "Edit Entry" : "Log Today's Work"}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <input
                        type="text" placeholder="Title *" value={form.title}
                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                        value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                    >
                        {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                    </select>
                    <textarea
                        placeholder="Description (optional)" rows={3} value={form.description}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                    <div className="flex gap-2">
                        <button type="submit" disabled={submitting || !form.title.trim()}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition disabled:opacity-50"
                        >
                            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                            {editingId ? "Update" : "Submit"}
                        </button>
                        {editingId && (
                            <button type="button" onClick={resetForm}
                                className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                            >Cancel</button>
                        )}
                    </div>
                </form>
            </div>

            {/* Calendar */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">My History</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setMonth((m) => subMonths(m, 1))} className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"><ChevronLeft className="size-4" /></button>
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 w-28 text-center">{format(month, "MMMM yyyy")}</span>
                        <button onClick={() => setMonth((m) => addMonths(m, 1))} className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"><ChevronRight className="size-4" /></button>
                        <button onClick={() => fetchEntries(month)} className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500">
                            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
                        </button>
                    </div>
                </div>
                {/* Grid */}
                <div className="grid grid-cols-7 gap-1 text-center">
                    {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
                        <div key={d} className="text-[10px] font-medium text-zinc-400 py-1">{d}</div>
                    ))}
                    {Array.from({ length: startDay }).map((_, i) => <div key={`e${i}`} />)}
                    {days.map((day) => {
                        const key = format(day, "yyyy-MM-dd");
                        const hasEntry = entryDates.has(key);
                        const isSelected = key === selectedDay;
                        const today = key === todayKey();
                        return (
                            <button key={key} onClick={() => setSelectedDay(key)}
                                className={`rounded-lg py-1.5 text-xs font-medium transition relative ${
                                    isSelected ? "bg-blue-600 text-white" :
                                    hasEntry ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/60" :
                                    today ? "border border-blue-400 text-blue-600 dark:text-blue-400" :
                                    "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                }`}
                            >
                                {format(day, "d")}
                                {hasEntry && !isSelected && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-green-500" />}
                            </button>
                        );
                    })}
                </div>
                {/* Day detail */}
                <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{format(new Date(selectedDay + "T12:00:00"), "EEEE, MMMM d, yyyy")}</p>
                    {dayEntries.length === 0 ? (
                        <p className="text-xs text-zinc-400">No entries for this day.</p>
                    ) : (
                        <div className="space-y-2">
                            {dayEntries.map((e) => (
                                <EntryCard key={e.id} entry={e} onEdit={handleEdit} onDelete={handleDelete} canEdit={isToday} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Admin view
// ─────────────────────────────────────────────────────────────────────────────
function AdminView({ workspaceId, getToken }) {
    const [view, setView] = useState("calendar"); // "calendar" | "summary"
    const [calMonth, setCalMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(todayKey());
    const [dayData, setDayData] = useState(null);
    const [dayLoading, setDayLoading] = useState(false);
    const [summaryMonth, setSummaryMonth] = useState(new Date());
    const [summary, setSummary] = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [expandedUser, setExpandedUser] = useState(null);

    const fetchDay = async (date) => {
        if (!workspaceId) return;
        setDayLoading(true);
        setDayData(null);
        try {
            const { data } = await api.get(
                `/api/standup?workspaceId=${workspaceId}&date=${date}`,
                { headers: { Authorization: `Bearer ${await getToken()}` } }
            );
            setDayData(data);
        } catch (err) {
            toast.error(err?.response?.data?.message || err.message);
        } finally {
            setDayLoading(false);
        }
    };

    const fetchSummary = async (m) => {
        if (!workspaceId) return;
        setSummaryLoading(true);
        setSummary(null);
        try {
            const { data } = await api.get(
                `/api/standup/summary?workspaceId=${workspaceId}&month=${monthKey(m)}`,
                { headers: { Authorization: `Bearer ${await getToken()}` } }
            );
            setSummary(data);
        } catch (err) {
            toast.error(err?.response?.data?.message || err.message);
        } finally {
            setSummaryLoading(false);
        }
    };

    useEffect(() => { if (view === "calendar") fetchDay(selectedDate); }, [selectedDate, workspaceId, view]);
    useEffect(() => { if (view === "summary") fetchSummary(summaryMonth); }, [summaryMonth, workspaceId, view]);

    const days = eachDayOfInterval({ start: startOfMonth(calMonth), end: endOfMonth(calMonth) });
    const startDay = startOfMonth(calMonth).getDay();

    return (
        <div className="space-y-6">
            {/* Tab toggle */}
            <div className="inline-flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                {[{ key: "calendar", icon: Calendar, label: "Daily View" }, { key: "summary", icon: BarChart2, label: "Monthly Summary" }].map(({ key, icon: Icon, label }) => (
                    <button key={key} onClick={() => setView(key)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition ${view === key ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"}`}
                    >
                        <Icon className="size-4" /> {label}
                    </button>
                ))}
            </div>

            {view === "calendar" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Calendar picker */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4 h-fit">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{format(calMonth, "MMMM yyyy")}</span>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setCalMonth((m) => subMonths(m, 1))} className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"><ChevronLeft className="size-4" /></button>
                                <button onClick={() => setCalMonth((m) => addMonths(m, 1))} className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"><ChevronRight className="size-4" /></button>
                            </div>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center">
                            {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
                                <div key={d} className="text-[10px] font-medium text-zinc-400 py-1">{d}</div>
                            ))}
                            {Array.from({ length: startDay }).map((_, i) => <div key={`e${i}`} />)}
                            {days.map((day) => {
                                const key = format(day, "yyyy-MM-dd");
                                const isSelected = key === selectedDate;
                                const today = key === todayKey();
                                return (
                                    <button key={key} onClick={() => setSelectedDate(key)}
                                        className={`rounded-lg py-2 text-xs font-medium transition ${
                                            isSelected ? "bg-blue-600 text-white" :
                                            today ? "border border-blue-400 text-blue-600 dark:text-blue-400" :
                                            "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                        }`}
                                    >
                                        {format(day, "d")}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Day detail */}
                    <div className="space-y-4">
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                                        {format(new Date(selectedDate + "T12:00:00"), "EEEE, MMMM d")}
                                    </h3>
                                    {dayData && (
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                            {dayData.submittedCount} / {dayData.totalMembers} submitted
                                        </p>
                                    )}
                                </div>
                                <button onClick={() => fetchDay(selectedDate)} className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500">
                                    <RefreshCw className={`size-3.5 ${dayLoading ? "animate-spin" : ""}`} />
                                </button>
                            </div>

                            {dayLoading && <div className="flex items-center gap-2 text-sm text-zinc-500 py-4"><Loader2 className="size-4 animate-spin" /> Loading…</div>}

                            {dayData && !dayLoading && (
                                <div className="space-y-4">
                                    {/* Progress bar */}
                                    <div>
                                        <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                                            <span className="text-green-600 dark:text-green-400 font-medium">Submitted: {dayData.submittedCount}</span>
                                            <span className="text-red-500 dark:text-red-400 font-medium">Pending: {dayData.notSubmittedCount}</span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                                            <div className="h-full bg-green-500 rounded-full transition-all"
                                                style={{ width: `${dayData.totalMembers ? (dayData.submittedCount / dayData.totalMembers) * 100 : 0}%` }} />
                                        </div>
                                    </div>

                                    {/* Submitted users */}
                                    {dayData.submitted?.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                                                <CheckCircle2 className="size-3.5 text-green-500" /> Submitted ({dayData.submitted.length})
                                            </p>
                                            {dayData.submitted.map(({ user, entries }) => (
                                                <div key={user.id} className="border border-zinc-100 dark:border-zinc-800 rounded-lg overflow-hidden">
                                                    <button
                                                        onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                                                        className="w-full flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {user.image ? (
                                                                <img src={user.image} className="size-6 rounded-full object-cover" alt="" />
                                                            ) : (
                                                                <div className="size-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                                                    {user.name?.[0]?.toUpperCase()}
                                                                </div>
                                                            )}
                                                            <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">{user.name}</span>
                                                        </div>
                                                        <span className="text-[10px] text-zinc-400">{entries.length} {entries.length === 1 ? "entry" : "entries"}</span>
                                                    </button>
                                                    {expandedUser === user.id && (
                                                        <div className="p-2 space-y-2">
                                                            {entries.map((e) => <EntryCard key={e.id} entry={e} canEdit={false} />)}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Not submitted */}
                                    {dayData.notSubmitted?.length > 0 && (
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                                                <XCircle className="size-3.5 text-red-400" /> Not Submitted ({dayData.notSubmitted.length})
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {dayData.notSubmitted.map(({ user }) => (
                                                    <span key={user.id} className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                                                        {user.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {view === "summary" && (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Monthly Leaderboard</h3>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setSummaryMonth((m) => subMonths(m, 1))} className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"><ChevronLeft className="size-4" /></button>
                            <span className="text-xs font-medium w-28 text-center text-zinc-700 dark:text-zinc-300">{format(summaryMonth, "MMMM yyyy")}</span>
                            <button onClick={() => setSummaryMonth((m) => addMonths(m, 1))} className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"><ChevronRight className="size-4" /></button>
                            <button onClick={() => fetchSummary(summaryMonth)} className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500">
                                <RefreshCw className={`size-3.5 ${summaryLoading ? "animate-spin" : ""}`} />
                            </button>
                        </div>
                    </div>

                    {summaryLoading && <div className="flex items-center gap-2 text-sm text-zinc-500 py-4"><Loader2 className="size-4 animate-spin" /> Loading…</div>}

                    {summary && !summaryLoading && (
                        summary.summary?.length === 0 ? (
                            <p className="text-sm text-zinc-500 py-4 text-center">No standup data for this month.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-zinc-200 dark:border-zinc-800">
                                            <th className="text-left py-2 px-3 font-semibold text-zinc-600 dark:text-zinc-400 w-8">#</th>
                                            <th className="text-left py-2 px-3 font-semibold text-zinc-600 dark:text-zinc-400">Member</th>
                                            <th className="text-right py-2 px-3 font-semibold text-zinc-600 dark:text-zinc-400">Days Active</th>
                                            <th className="text-right py-2 px-3 font-semibold text-zinc-600 dark:text-zinc-400">Total Entries</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {summary.summary.map(({ user, daysSubmitted, totalEntries }, i) => (
                                            <tr key={user.id} className={`border-b border-zinc-100 dark:border-zinc-800/50 ${i < 3 ? "font-medium" : ""}`}>
                                                <td className="py-2.5 px-3 text-zinc-400">
                                                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <div className="flex items-center gap-2">
                                                        {user.image ? (
                                                            <img src={user.image} className="size-6 rounded-full object-cover" alt="" />
                                                        ) : (
                                                            <div className="size-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-[10px] font-bold text-blue-600">
                                                                {user.name?.[0]?.toUpperCase()}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="text-zinc-800 dark:text-zinc-200">{user.name}</p>
                                                            <p className="text-[10px] text-zinc-400">{user.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-2.5 px-3 text-right text-green-600 dark:text-green-400">{daysSubmitted}</td>
                                                <td className="py-2.5 px-3 text-right text-blue-600 dark:text-blue-400">{totalEntries}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Root export
// ─────────────────────────────────────────────────────────────────────────────
export default function Standup() {
    const { user, getToken } = useAuth();
    const currentWorkspace = useSelector((s) => s.workspace?.currentWorkspace);
    const isAdmin = user?.role === "ADMIN";

    if (!currentWorkspace) {
        return (
            <div className="flex items-center justify-center py-20 text-zinc-400 text-sm">
                Select a workspace to view standups.
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
                <ClipboardList className="size-6 text-blue-600 dark:text-blue-400" />
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Daily Standup</h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {isAdmin ? "Team work diary — see what everyone worked on" : "Log what you worked on today"}
                    </p>
                </div>
            </div>

            {isAdmin
                ? <AdminView workspaceId={currentWorkspace.id} getToken={getToken} />
                : <InternView workspaceId={currentWorkspace.id} getToken={getToken} />
            }
        </div>
    );
}
