import { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { useAuth } from "../auth/AuthContext";
import api from "../configs/api";
import toast from "react-hot-toast";
import { CalendarDays, Clock, CheckCircle2, XCircle, AlertCircle, Plus, X, Trash2, ChevronDown, ChevronUp } from "lucide-react";

const TYPE_LABELS = { LEAVE: "Leave", WORK_FROM_HOME: "Work From Home", HALF_DAY: "Half Day" };
const TYPE_COLORS = {
    LEAVE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    WORK_FROM_HOME: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    HALF_DAY: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
};
const STATUS_COLORS = {
    PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};
const STATUS_ICONS = {
    PENDING: <Clock className="size-3" />,
    APPROVED: <CheckCircle2 className="size-3" />,
    REJECTED: <XCircle className="size-3" />,
};

const today = () => new Date().toISOString().slice(0, 10);

const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const dayCount = (s, e) => {
    const diff = Math.ceil((new Date(e) - new Date(s)) / 86400000) + 1;
    return diff === 1 ? "1 day" : `${diff} days`;
};

// ─── Intern View ─────────────────────────────────────────────────────────────
function InternView({ workspaceId, getToken }) {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ startDate: today(), endDate: today(), type: "LEAVE", reason: "" });

    const fetchLeaves = useCallback(async () => {
        setLoading(true);
        try {
            const token = await getToken();
            const res = await api.get(`/api/leave/me?workspaceId=${workspaceId}`, { headers: { Authorization: `Bearer ${token}` } });
            setLeaves(res.data.leaves || []);
        } catch { toast.error("Failed to load requests"); }
        finally { setLoading(false); }
    }, [workspaceId]);

    useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

    const submit = async () => {
        if (!form.reason.trim()) { toast.error("Reason is required"); return; }
        if (form.endDate < form.startDate) { toast.error("End date must be ≥ start date"); return; }
        setSubmitting(true);
        try {
            const token = await getToken();
            await api.post("/api/leave", { workspaceId, ...form }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Request submitted!");
            setShowForm(false);
            setForm({ startDate: today(), endDate: today(), type: "LEAVE", reason: "" });
            fetchLeaves();
        } catch (err) { toast.error(err?.response?.data?.message || err.message || "Failed to submit"); }
        finally { setSubmitting(false); }
    };

    const cancel = async (id) => {
        if (!confirm("Cancel this request?")) return;
        try {
            const token = await getToken();
            await api.delete(`/api/leave/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Request cancelled");
            fetchLeaves();
        } catch (err) { toast.error(err?.response?.data?.message || "Failed to cancel"); }
    };

    const pending = leaves.filter(l => l.status === "PENDING");
    const past = leaves.filter(l => l.status !== "PENDING");

    return (
        <div className="space-y-5">
            {/* Submit button */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">My Leave Requests</h2>
                    <p className="text-sm text-zinc-500">Submit leave, WFH, or half-day requests for admin approval</p>
                </div>
                <button onClick={() => setShowForm(v => !v)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition">
                    {showForm ? <X className="size-4" /> : <Plus className="size-4" />}
                    {showForm ? "Cancel" : "New Request"}
                </button>
            </div>

            {/* Form */}
            {showForm && (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">New Request</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Type</label>
                            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-blue-500">
                                <option value="LEAVE">🏖️ Leave (Absent)</option>
                                <option value="WORK_FROM_HOME">🏠 Work From Home</option>
                                <option value="HALF_DAY">⏰ Half Day</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Start Date</label>
                            <input type="date" value={form.startDate}
                                onChange={e => setForm(f => ({ ...f, startDate: e.target.value, endDate: e.target.value > f.endDate ? e.target.value : f.endDate }))}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">End Date</label>
                            <input type="date" value={form.endDate} min={form.startDate}
                                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-blue-500" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Reason <span className="text-red-500">*</span></label>
                        <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                            rows={3} placeholder="Briefly explain your reason..."
                            className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-500 resize-none" />
                    </div>
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-zinc-500">
                            Duration: <span className="font-medium text-zinc-700 dark:text-zinc-300">{dayCount(form.startDate, form.endDate)}</span>
                        </p>
                        <button onClick={submit} disabled={submitting}
                            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition disabled:opacity-50">
                            {submitting ? "Submitting…" : "Submit Request"}
                        </button>
                    </div>
                </div>
            )}

            {/* Pending */}
            {pending.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Pending ({pending.length})</h3>
                    {pending.map(l => <LeaveCard key={l.id} leave={l} onCancel={() => cancel(l.id)} showCancel />)}
                </div>
            )}

            {/* History */}
            {past.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">History</h3>
                    {past.map(l => <LeaveCard key={l.id} leave={l} />)}
                </div>
            )}

            {!loading && leaves.length === 0 && (
                <div className="text-center py-16 text-zinc-400">
                    <CalendarDays className="size-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No leave requests yet</p>
                </div>
            )}
        </div>
    );
}

// ─── Leave Card (shared) ──────────────────────────────────────────────────────
function LeaveCard({ leave, onCancel, showCancel, showUser, onReview }) {
    const [expanded, setExpanded] = useState(false);
    const [reviewNote, setReviewNote] = useState("");
    const [reviewing, setReviewing] = useState(false);

    const handleReview = async (status) => {
        setReviewing(true);
        try { await onReview(leave.id, status, reviewNote); }
        finally { setReviewing(false); }
    };

    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    {showUser && leave.user && (
                        <div className="size-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-300 shrink-0">
                            {leave.user.name?.[0]?.toUpperCase()}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        {showUser && <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">{leave.user?.name}</p>}
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${TYPE_COLORS[leave.type]}`}>
                                {TYPE_LABELS[leave.type]}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLORS[leave.status]}`}>
                                {STATUS_ICONS[leave.status]} {leave.status}
                            </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">
                            <CalendarDays className="size-3 inline mr-1" />
                            {fmtDate(leave.startDate)}
                            {leave.startDate !== leave.endDate && ` – ${fmtDate(leave.endDate)}`}
                            <span className="ml-1 text-zinc-400">({dayCount(leave.startDate, leave.endDate)})</span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    {showCancel && (
                        <button onClick={onCancel} title="Cancel request"
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                            <Trash2 className="size-3.5" />
                        </button>
                    )}
                    <button onClick={() => setExpanded(v => !v)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
                        {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                    </button>
                </div>
            </div>

            {expanded && (
                <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                    <p className="text-xs text-zinc-600 dark:text-zinc-400"><span className="font-medium">Reason:</span> {leave.reason}</p>
                    {leave.adminNote && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400"><span className="font-medium">Admin note:</span> {leave.adminNote}</p>
                    )}
                    {leave.reviewedAt && (
                        <p className="text-xs text-zinc-400">Reviewed: {fmtDate(leave.reviewedAt)}</p>
                    )}

                    {/* Admin review actions */}
                    {onReview && leave.status === "PENDING" && (
                        <div className="pt-2 space-y-2">
                            <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)}
                                placeholder="Optional note to intern…" rows={2}
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-500 resize-none" />
                            <div className="flex gap-2">
                                <button onClick={() => handleReview("APPROVED")} disabled={reviewing}
                                    className="flex-1 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition disabled:opacity-50">
                                    ✅ Approve
                                </button>
                                <button onClick={() => handleReview("REJECTED")} disabled={reviewing}
                                    className="flex-1 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition disabled:opacity-50">
                                    ❌ Reject
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Admin View ───────────────────────────────────────────────────────────────
function AdminView({ workspaceId, getToken }) {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState("PENDING");
    const [search, setSearch] = useState("");

    const fetchLeaves = useCallback(async () => {
        setLoading(true);
        try {
            const token = await getToken();
            const params = `workspaceId=${workspaceId}${filter !== "ALL" ? `&status=${filter}` : ""}`;
            const res = await api.get(`/api/leave?${params}`, { headers: { Authorization: `Bearer ${token}` } });
            setLeaves(res.data.leaves || []);
        } catch { toast.error("Failed to load leave requests"); }
        finally { setLoading(false); }
    }, [workspaceId, filter]);

    useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

    const review = async (id, status, adminNote) => {
        try {
            const token = await getToken();
            await api.put(`/api/leave/${id}/review`, { status, adminNote }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(`Request ${status.toLowerCase()}`);
            fetchLeaves();
        } catch (err) { toast.error(err?.response?.data?.message || "Failed"); }
    };

    const filtered = leaves.filter(l =>
        !search || l.user?.name?.toLowerCase().includes(search.toLowerCase()) || l.user?.email?.toLowerCase().includes(search.toLowerCase())
    );

    const counts = {
        PENDING: leaves.filter(l => l.status === "PENDING").length,
        APPROVED: leaves.filter(l => l.status === "APPROVED").length,
        REJECTED: leaves.filter(l => l.status === "REJECTED").length,
    };

    const TABS = [
        { key: "PENDING", label: `Pending`, count: counts.PENDING, color: "text-yellow-600" },
        { key: "APPROVED", label: "Approved", count: counts.APPROVED, color: "text-green-600" },
        { key: "REJECTED", label: "Rejected", count: counts.REJECTED, color: "text-red-600" },
        { key: "ALL", label: "All", count: null, color: "text-zinc-600" },
    ];

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">Leave Requests</h2>
                    <p className="text-sm text-zinc-500">Review and manage intern leave, WFH, and half-day requests</p>
                </div>
                {/* Summary chips */}
                <div className="flex gap-2 text-xs">
                    {counts.PENDING > 0 && (
                        <span className="px-2.5 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 font-medium">
                            {counts.PENDING} pending
                        </span>
                    )}
                    <span className="px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
                        {counts.APPROVED} approved
                    </span>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden text-xs">
                    {TABS.map(t => (
                        <button key={t.key} onClick={() => setFilter(t.key)}
                            className={`px-3 py-2 font-medium transition ${filter === t.key ? "bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900" : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}>
                            {t.label}{t.count != null ? ` (${t.count})` : ""}
                        </button>
                    ))}
                </div>
                <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name or email…"
                    className="flex-1 min-w-40 px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-500" />
            </div>

            {loading ? (
                <div className="text-center py-10 text-zinc-400 text-sm">Loading…</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-zinc-400">
                    <AlertCircle className="size-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No {filter !== "ALL" ? filter.toLowerCase() : ""} requests</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(l => (
                        <LeaveCard key={l.id} leave={l} showUser
                            onReview={l.status === "PENDING" ? review : null} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Leave() {
    const { user, getToken } = useAuth();
    const currentWorkspace = useSelector(s => s.workspace.currentWorkspace);
    const isAdmin = user?.role === "ADMIN";

    if (!currentWorkspace) {
        return (
            <div className="flex items-center justify-center h-64 text-zinc-400 text-sm">
                Select a workspace to continue
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Leave & WFH</h1>
                <p className="text-sm text-zinc-500 mt-1">
                    {isAdmin ? "Manage team leave and work-from-home requests" : "Submit and track your leave or WFH requests"}
                </p>
            </div>

            {isAdmin
                ? <AdminView workspaceId={currentWorkspace.id} getToken={getToken} />
                : <InternView workspaceId={currentWorkspace.id} getToken={getToken} />
            }
        </div>
    );
}
