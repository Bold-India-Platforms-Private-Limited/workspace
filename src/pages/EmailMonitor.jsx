import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useAuth } from "../auth/AuthContext";
import { useSelector } from "react-redux";
import api from "../configs/api";
import { Mail, Search, Eye, Trash2, Send, Users, CheckSquare } from "lucide-react";
import { TIMEZONE } from "../configs/timezone";
import toast from "react-hot-toast";
import QuillEditor from "../components/QuillEditor";
import { getSocket } from "../configs/socket";
import { thumb } from "../utils/cloudinaryUrl";

const PAGE_SIZE = 50;

// ── Compose tab — send a subject/HTML-body email to all or selected members ───
const ComposeEmailPanel = ({ currentWorkspace, getToken }) => {
    const [subject, setSubject] = useState("");
    const [bodyHtml, setBodyHtml] = useState("");
    const [recipientMode, setRecipientMode] = useState("all"); // "all" | "selected"
    const [selectedUserIds, setSelectedUserIds] = useState(new Set());
    const [memberSearch, setMemberSearch] = useState("");
    const [sending, setSending] = useState(false);
    const [progress, setProgress] = useState(null); // { jobId, total, sent, failed, rateLimit, done }
    const jobIdRef = useRef(null);

    const members = currentWorkspace?.members || [];
    const filteredMembers = useMemo(() => {
        const term = memberSearch.trim().toLowerCase();
        if (!term) return members;
        return members.filter((m) =>
            m.user?.name?.toLowerCase().includes(term) || m.user?.email?.toLowerCase().includes(term)
        );
    }, [members, memberSearch]);

    // Connect while this tab is open so the live progress bar can receive
    // "email_job_progress" events; disconnect on leave, mirroring Team.jsx.
    useEffect(() => {
        const socket = getSocket();
        if (!socket.connected) socket.connect();

        const onProgress = (data) => {
            if (data.jobId !== jobIdRef.current) return;
            setProgress(data);
            if (data.done) {
                setSending(false);
                toast.success(`Broadcast complete: ${data.sent} sent${data.failed ? `, ${data.failed} failed` : ""}`);
            }
        };
        socket.on("email_job_progress", onProgress);
        return () => {
            socket.off("email_job_progress", onProgress);
            socket.disconnect();
        };
    }, []);

    const toggleMember = (userId) => {
        setSelectedUserIds((prev) => {
            const next = new Set(prev);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });
    };

    const toggleSelectAllFiltered = () => {
        setSelectedUserIds((prev) => {
            const next = new Set(prev);
            const ids = filteredMembers.map((m) => m.userId);
            const allSelected = ids.every((id) => next.has(id));
            ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
            return next;
        });
    };

    const recipientCount = recipientMode === "all" ? members.length : selectedUserIds.size;
    const isEmpty = (html) => !html || html === "<p><br></p>";

    const handleSend = async () => {
        if (!subject.trim()) return toast.error("Subject is required");
        if (isEmpty(bodyHtml)) return toast.error("Email body is required");
        if (recipientMode === "selected" && selectedUserIds.size === 0) {
            return toast.error("Select at least one recipient");
        }
        if (!window.confirm(`Send this email to ${recipientCount} recipient(s)?`)) return;

        try {
            setSending(true);
            setProgress(null);
            const { data } = await api.post(
                "/api/emails/broadcast",
                {
                    workspaceId: currentWorkspace.id,
                    subject: subject.trim(),
                    body: bodyHtml,
                    recipientMode,
                    ...(recipientMode === "selected" ? { userIds: Array.from(selectedUserIds) } : {}),
                },
                { headers: { Authorization: `Bearer ${await getToken()}` } }
            );
            jobIdRef.current = data.jobId;
            setProgress({ jobId: data.jobId, total: data.total, sent: 0, failed: 0, rateLimit: data.rateLimit, done: false });
            toast.success(`Sending to ${data.total} recipient(s)…`);
        } catch (error) {
            setSending(false);
            toast.error(error.response?.data?.message || error.message);
        }
    };

    const progressPct = progress?.total > 0 ? Math.round(((progress.sent + progress.failed) / progress.total) * 100) : 0;

    return (
        <div className="space-y-4">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-4">
                <input
                    type="text"
                    placeholder="Subject *"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    disabled={sending}
                    className="w-full px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 disabled:opacity-60"
                />

                <div>
                    <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">Email body *</div>
                    <QuillEditor
                        value={bodyHtml}
                        onChange={setBodyHtml}
                        placeholder="Write your email…"
                        className="bg-white dark:bg-zinc-900 rounded border border-zinc-300 dark:border-zinc-700 [&_.ql-editor]:min-h-[160px] [&_.ql-editor]:text-zinc-900 dark:[&_.ql-editor]:text-zinc-100"
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        <Users className="size-3.5" /> Recipients
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="radio" checked={recipientMode === "all"} onChange={() => setRecipientMode("all")} disabled={sending} />
                            All workspace members ({members.length})
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="radio" checked={recipientMode === "selected"} onChange={() => setRecipientMode("selected")} disabled={sending} />
                            Select specific members
                        </label>
                    </div>

                    {recipientMode === "selected" && (
                        <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                            <div className="p-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
                                    <input
                                        type="text"
                                        placeholder="Search members…"
                                        value={memberSearch}
                                        onChange={(e) => setMemberSearch(e.target.value)}
                                        disabled={sending}
                                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-zinc-900 dark:text-white"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={toggleSelectAllFiltered}
                                    disabled={sending}
                                    className="flex items-center gap-1 px-2 py-1.5 text-xs rounded border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                >
                                    <CheckSquare className="size-3" /> Toggle page
                                </button>
                                <span className="text-xs text-zinc-500 dark:text-zinc-400 shrink-0">{selectedUserIds.size} selected</span>
                            </div>
                            <div className="max-h-64 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
                                {filteredMembers.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-zinc-500 dark:text-zinc-400">No members found</div>
                                ) : (
                                    filteredMembers.map((m) => {
                                        const checked = selectedUserIds.has(m.userId);
                                        return (
                                            <label
                                                key={m.userId}
                                                className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900"
                                            >
                                                <input type="checkbox" checked={checked} onChange={() => toggleMember(m.userId)} disabled={sending} />
                                                <img src={thumb(m.user?.image, 48, 48)} alt="" className="size-6 rounded-full object-cover shrink-0" />
                                                <div className="min-w-0">
                                                    <div className="truncate text-zinc-900 dark:text-zinc-100">{m.user?.name}</div>
                                                    <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">{m.user?.email}</div>
                                                </div>
                                            </label>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <button
                    onClick={handleSend}
                    disabled={sending || recipientCount === 0}
                    className="flex items-center gap-2 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Send className="size-4" />
                    {sending ? "Sending…" : `Send to ${recipientCount} recipient(s)`}
                </button>
            </div>

            {progress && (
                <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                        <span>{progress.done ? "Done" : "Sending…"} — {progress.sent + progress.failed} / {progress.total}</span>
                        <span>~{progress.rateLimit}/min{progress.failed > 0 && <span className="text-red-500 ml-2">{progress.failed} failed</span>}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-300 ${progress.done ? "bg-green-500" : "bg-blue-500"}`}
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

const EmailMonitor = () => {
    const { user, getToken } = useAuth();
    const currentWorkspace = useSelector((state) => state?.workspace?.currentWorkspace || null);

    const [emails, setEmails] = useState([]);
    const [counts, setCounts] = useState({ total: 0, sent: 0, pending: 0, failed: 0 });
    const [totalFiltered, setTotalFiltered] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [selectedEmail, setSelectedEmail] = useState(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const [activeTab, setActiveTab] = useState("compose"); // "compose" | "logs"

    const fetchEmails = useCallback(async (opts = {}) => {
        if (!currentWorkspace) return;
        const pg = opts.page ?? page;
        const status = opts.status ?? statusFilter;
        const search = opts.search ?? searchTerm;
        try {
            setIsLoading(true);
            const params = { workspaceId: currentWorkspace.id, page: pg, pageSize: PAGE_SIZE };
            if (status && status !== "all") params.status = status;
            if (search?.trim()) params.search = search.trim();
            const { data } = await api.get("/api/emails", {
                params,
                headers: { Authorization: `Bearer ${await getToken()}` },
            });
            setEmails(data.emails || []);
            setCounts(data.counts || { total: 0, sent: 0, pending: 0, failed: 0 });
            setTotalFiltered(data.totalFiltered ?? 0);
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        } finally {
            setIsLoading(false);
        }
    }, [currentWorkspace, page, statusFilter, searchTerm, getToken]);

    // Only poll logs while the Logs tab is actually visible — no point
    // fetching the log list every 30s while the admin is composing an email.
    useEffect(() => {
        if (user?.role === "ADMIN" && activeTab === "logs") {
            fetchEmails();
            const interval = setInterval(() => fetchEmails(), 30000);
            return () => clearInterval(interval);
        }
    }, [currentWorkspace, user, page, statusFilter, activeTab]);

    // Debounced search
    useEffect(() => {
        if (user?.role !== "ADMIN" || activeTab !== "logs") return;
        const timer = setTimeout(() => {
            setPage(1);
            fetchEmails({ page: 1, search: searchTerm });
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm, activeTab]);

    const totalPages = Math.ceil(totalFiltered / PAGE_SIZE) || 1;

    const deleteLog = async (id) => {
        if (!confirm("Delete this log entry?")) return;
        try {
            setDeletingId(id);
            await api.delete(`/api/emails/${id}`, {
                headers: { Authorization: `Bearer ${await getToken()}` },
            });
            if (selectedEmail?.id === id) setIsPreviewOpen(false);
            toast.success("Log deleted");
            fetchEmails();
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        } finally {
            setDeletingId(null);
        }
    };

    const bulkDelete = async (status) => {
        const label = status ? `all ${status} logs` : "all logs";
        if (!confirm(`Delete ${label}? This cannot be undone.`)) return;
        try {
            setBulkDeleting(true);
            const { data } = await api.delete("/api/emails/bulk", {
                headers: { Authorization: `Bearer ${await getToken()}` },
                data: { workspaceId: currentWorkspace.id, ...(status ? { status } : {}) },
            });
            toast.success(`Deleted ${data.count} log(s)`);
            setPage(1);
            fetchEmails({ page: 1 });
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        } finally {
            setBulkDeleting(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "sent":    return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300";
            case "pending": return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300";
            case "failed":  return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300";
            case "bounced": return "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300";
            default:        return "bg-zinc-100 dark:bg-zinc-900/30 text-zinc-700 dark:text-zinc-300";
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case "sent":    return "✓";
            case "pending": return "⏳";
            case "failed":  return "✕";
            case "bounced": return "⚠";
            default:        return "•";
        }
    };

    if (user?.role !== "ADMIN") {
        return (
            <div className="p-6 text-center text-zinc-900 dark:text-zinc-200">
                <p className="text-2xl md:text-4xl mt-32 mb-6">Access denied</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Email monitoring is available for admins only.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                    <Mail className="size-6" />
                    <h1 className="text-xl font-semibold">Email Monitor</h1>
                </div>
                {activeTab === "logs" && (
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => bulkDelete("failed")}
                        disabled={bulkDeleting || counts.failed === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                        <Trash2 className="size-3" />
                        Clear Failed
                    </button>
                    <button
                        onClick={() => bulkDelete(null)}
                        disabled={bulkDeleting || counts.total === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                        <Trash2 className="size-3" />
                        Clear All
                    </button>
                </div>
                )}
            </div>

            {/* Tab switcher */}
            <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800">
                {[
                    { id: "compose", label: "Send Email" },
                    { id: "logs", label: "Logs" },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
                            activeTab === tab.id
                                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === "compose" && (
                <ComposeEmailPanel currentWorkspace={currentWorkspace} getToken={getToken} />
            )}

            {activeTab === "logs" && (
            <>
            {/* Stats Cards — real counts from DB, never capped */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">Total Emails</div>
                    <div className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{counts.total.toLocaleString()}</div>
                </div>
                <div className="bg-white dark:bg-zinc-950 border border-emerald-200 dark:border-emerald-900 rounded-lg p-4">
                    <div className="text-sm text-emerald-600 dark:text-emerald-400">Sent</div>
                    <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{counts.sent.toLocaleString()}</div>
                </div>
                <div className="bg-white dark:bg-zinc-950 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                    <div className="text-sm text-blue-600 dark:text-blue-400">Pending</div>
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">{counts.pending.toLocaleString()}</div>
                </div>
                <div className="bg-white dark:bg-zinc-950 border border-red-200 dark:border-red-900 rounded-lg p-4">
                    <div className="text-sm text-red-600 dark:text-red-400">Failed</div>
                    <div className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1">{counts.failed.toLocaleString()}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search by email or subject..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPage(1);
                            fetchEmails({ page: 1, status: e.target.value });
                        }}
                        className="px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-zinc-900 dark:text-white"
                    >
                        <option value="all">All Status</option>
                        <option value="sent">Sent</option>
                        <option value="pending">Pending</option>
                        <option value="failed">Failed</option>
                        <option value="bounced">Bounced</option>
                    </select>
                </div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                    Showing {emails.length} of {totalFiltered.toLocaleString()} emails
                    {(statusFilter !== "all" || searchTerm) && counts.total !== totalFiltered && (
                        <span className="ml-1">(filtered from {counts.total.toLocaleString()} total)</span>
                    )}
                </div>
            </div>

            {/* Email List */}
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
                        <div className="inline-block animate-spin">⏳</div> Loading emails...
                    </div>
                ) : emails.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
                        No emails found
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                            <thead className="bg-zinc-50 dark:bg-zinc-900/50">
                                <tr>
                                    <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">Recipient</th>
                                    <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">Subject</th>
                                    <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">Status</th>
                                    <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">Sent Date</th>
                                    <th className="px-4 sm:px-6 py-3 text-center text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                {emails.map((email) => (
                                    <tr key={email.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition">
                                        <td className="px-4 sm:px-6 py-3">
                                            <div className="text-sm font-medium text-zinc-900 dark:text-white">{email.recipientName || "Unknown"}</div>
                                            <div className="text-xs text-zinc-500 dark:text-zinc-400">{email.recipientEmail}</div>
                                        </td>
                                        <td className="px-4 sm:px-6 py-3">
                                            <div className="text-sm text-zinc-900 dark:text-zinc-100 max-w-xs truncate">{email.subject}</div>
                                        </td>
                                        <td className="px-4 sm:px-6 py-3">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(email.status)}`}>
                                                {getStatusIcon(email.status)} {email.status?.charAt(0).toUpperCase() + email.status?.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-4 sm:px-6 py-3">
                                            <div className="text-xs text-zinc-600 dark:text-zinc-400">
                                                {email.sentAt ? new Date(email.sentAt).toLocaleString("en-IN", { timeZone: TIMEZONE }) : "Not sent"}
                                            </div>
                                        </td>
                                        <td className="px-4 sm:px-6 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                    onClick={() => { setSelectedEmail(email); setIsPreviewOpen(true); }}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                                                >
                                                    <Eye className="size-3" />
                                                    <span className="hidden sm:inline">Preview</span>
                                                </button>
                                                <button
                                                    onClick={() => deleteLog(email.id)}
                                                    disabled={deletingId === email.id}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 transition"
                                                >
                                                    <Trash2 className="size-3" />
                                                    <span className="hidden sm:inline">Delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage((p) => p - 1)}
                        className="px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        Prev
                    </button>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">{page} / {totalPages}</span>
                    <button
                        disabled={page === totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        className="px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        Next
                    </button>
                </div>
            )}
            </>
            )}

            {/* Email Preview Modal */}
            {isPreviewOpen && selectedEmail && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-950 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Email Preview</h3>
                            <button
                                onClick={() => setIsPreviewOpen(false)}
                                className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 text-2xl leading-none"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="space-y-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                                <div>
                                    <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">To</div>
                                    <div className="text-sm font-medium text-zinc-900 dark:text-white">
                                        {selectedEmail.recipientName} &lt;{selectedEmail.recipientEmail}&gt;
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Subject</div>
                                    <div className="text-sm font-medium text-zinc-900 dark:text-white">{selectedEmail.subject}</div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Status</div>
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedEmail.status)}`}>
                                            {getStatusIcon(selectedEmail.status)} {selectedEmail.status?.charAt(0).toUpperCase() + selectedEmail.status?.slice(1)}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Sent Date</div>
                                        <div className="text-sm font-medium text-zinc-900 dark:text-white">
                                            {selectedEmail.sentAt ? new Date(selectedEmail.sentAt).toLocaleString("en-IN", { timeZone: TIMEZONE }) : "Not sent"}
                                        </div>
                                    </div>
                                </div>
                                {selectedEmail.errorMessage && (
                                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
                                        <div className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">Error Details:</div>
                                        <div className="text-sm text-red-700 dark:text-red-300">{selectedEmail.errorMessage}</div>
                                    </div>
                                )}
                            </div>
                            <div>
                                <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3 font-semibold">Email Content</div>
                                <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded p-4">
                                    <div className="prose dark:prose-invert max-w-none text-sm">
                                        {selectedEmail.htmlContent ? (
                                            <div className="text-zinc-900 dark:text-zinc-100" dangerouslySetInnerHTML={{ __html: selectedEmail.htmlContent }} />
                                        ) : (
                                            <pre className="rounded bg-white dark:bg-zinc-950 p-3 text-xs overflow-x-auto whitespace-pre-wrap break-words">
                                                {selectedEmail.textContent || "No content available"}
                                            </pre>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs">
                                <div>
                                    <div className="text-zinc-500 dark:text-zinc-400 mb-1">Email ID</div>
                                    <div className="font-mono text-zinc-700 dark:text-zinc-300 break-all">{selectedEmail.id}</div>
                                </div>
                                {selectedEmail.attempts && (
                                    <div>
                                        <div className="text-zinc-500 dark:text-zinc-400 mb-1">Send Attempts</div>
                                        <div className="text-zinc-700 dark:text-zinc-300">{selectedEmail.attempts}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmailMonitor;
