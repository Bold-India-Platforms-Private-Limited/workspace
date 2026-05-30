import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../auth/AuthContext";
import { useSelector } from "react-redux";
import api from "../configs/api";
import { Mail, Search, Eye, Trash2 } from "lucide-react";
import { TIMEZONE } from "../configs/timezone";
import toast from "react-hot-toast";

const PAGE_SIZE = 50;

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

    useEffect(() => {
        if (user?.role === "ADMIN") {
            fetchEmails();
            const interval = setInterval(() => fetchEmails(), 30000);
            return () => clearInterval(interval);
        }
    }, [currentWorkspace, user, page, statusFilter]);

    // Debounced search
    useEffect(() => {
        if (user?.role !== "ADMIN") return;
        const timer = setTimeout(() => {
            setPage(1);
            fetchEmails({ page: 1, search: searchTerm });
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

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
            </div>

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
