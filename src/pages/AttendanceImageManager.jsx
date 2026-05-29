import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../auth/AuthContext";
import api from "../configs/api";
import toast from "react-hot-toast";
import { Images, Trash2, RefreshCw, ChevronDown, ChevronRight, AlertTriangle, X, Loader2 } from "lucide-react";
import { TIMEZONE } from "../configs/timezone";

const fmtDate = (d) =>
    new Date(d).toLocaleDateString("en-IN", { timeZone: TIMEZONE, day: "2-digit", month: "short", year: "numeric" });

const fmtBytes = (b) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(2)} MB`;
};

// ── Lightbox ─────────────────────────────────────────────────────────────────
const Lightbox = ({ url, onClose }) => (
    <div
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
    >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition">
            <X className="size-5" />
        </button>
        <img
            src={url}
            alt="Attendance"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] rounded-xl shadow-2xl object-contain"
        />
    </div>
);

// ── Image card ────────────────────────────────────────────────────────────────
const ImageCard = ({ record, onDelete, deleting }) => {
    const [lightbox, setLightbox] = useState(false);
    return (
        <>
            {lightbox && <Lightbox url={record.imageUrl} onClose={() => setLightbox(false)} />}
            <div className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition">
                <div
                    className="aspect-square overflow-hidden cursor-zoom-in bg-zinc-100 dark:bg-zinc-800"
                    onClick={() => setLightbox(true)}
                >
                    <img
                        src={record.imageUrl}
                        alt={record.user?.name || "attendance"}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                </div>
                <div className="p-2">
                    <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {record.user?.name || record.user?.email || "Unknown"}
                    </p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">{record.user?.email}</p>
                </div>
                <button
                    onClick={() => onDelete(record.id)}
                    disabled={deleting}
                    className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition disabled:opacity-40"
                    title="Delete"
                >
                    {deleting ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                </button>
            </div>
        </>
    );
};

// ── Orphan card ───────────────────────────────────────────────────────────────
const OrphanCard = ({ item, selected, onToggle }) => {
    const [lightbox, setLightbox] = useState(false);
    return (
        <>
            {lightbox && <Lightbox url={item.url} onClose={() => setLightbox(false)} />}
            <div
                className={`group relative bg-white dark:bg-zinc-900 border rounded-lg overflow-hidden shadow-sm cursor-pointer transition ${
                    selected
                        ? "border-red-400 dark:border-red-500 ring-2 ring-red-300 dark:ring-red-700"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600"
                }`}
                onClick={() => onToggle(item.publicId)}
            >
                <div className="aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-800" onClick={(e) => { e.stopPropagation(); setLightbox(true); }}>
                    <img
                        src={item.url}
                        alt="orphan"
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                </div>
                <div className="p-2">
                    <p className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 truncate">{item.folder}</p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500">{fmtDate(item.createdAt)} · {fmtBytes(item.bytes)}</p>
                </div>
                <div className={`absolute top-1.5 left-1.5 size-4 rounded border-2 flex items-center justify-center ${selected ? "bg-red-500 border-red-500" : "bg-white/80 border-zinc-400"}`}>
                    {selected && <span className="text-white text-[9px] font-bold">✓</span>}
                </div>
            </div>
        </>
    );
};

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AttendanceImageManager() {
    const { user, getToken } = useAuth();

    const [grouped, setGrouped] = useState({});
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);

    // Orphan state
    const [orphaned, setOrphaned] = useState([]);
    const [orphanLoading, setOrphanLoading] = useState(false);
    const [orphanLoaded, setOrphanLoaded] = useState(false);
    const [selectedOrphans, setSelectedOrphans] = useState(new Set());
    const [purging, setPurging] = useState(false);

    // Collapse state
    const [collapsedWorkspaces, setCollapsedWorkspaces] = useState({});
    const [collapsedDates, setCollapsedDates] = useState({});

    const headers = async () => ({ Authorization: `Bearer ${await getToken()}` });

    // ── Fetch DB images ──────────────────────────────────────────────────────
    const fetchImages = async () => {
        try {
            setLoading(true);
            const { data } = await api.get("/api/attendance-images", { headers: await headers() });
            setGrouped(data.grouped || {});
        } catch (err) {
            toast.error(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (user?.role === "ADMIN") fetchImages(); }, []);

    // ── Delete one DB record ─────────────────────────────────────────────────
    const deleteRecord = async (id) => {
        if (!confirm("Delete this attendance image? This cannot be undone.")) return;
        try {
            setDeletingId(id);
            await api.delete(`/api/attendance-images/${id}`, { headers: await headers() });
            // Remove from local state
            setGrouped((prev) => {
                const next = structuredClone(prev);
                for (const wid of Object.keys(next)) {
                    for (const date of Object.keys(next[wid].dates)) {
                        next[wid].dates[date] = next[wid].dates[date].filter((r) => r.id !== id);
                        if (next[wid].dates[date].length === 0) delete next[wid].dates[date];
                    }
                    if (Object.keys(next[wid].dates).length === 0) delete next[wid];
                }
                return next;
            });
            toast.success("Deleted");
        } catch (err) {
            toast.error(err.response?.data?.message || err.message);
        } finally {
            setDeletingId(null);
        }
    };

    // ── Orphan fetch ─────────────────────────────────────────────────────────
    const fetchOrphaned = async () => {
        try {
            setOrphanLoading(true);
            const { data } = await api.get("/api/attendance-images/orphaned", { headers: await headers() });
            setOrphaned(data.orphaned || []);
            setOrphanLoaded(true);
            toast.success(`Found ${data.orphanedCount} orphaned image(s) out of ${data.total} in Cloudinary`);
        } catch (err) {
            toast.error(err.response?.data?.message || err.message);
        } finally {
            setOrphanLoading(false);
        }
    };

    const toggleOrphan = (publicId) => {
        setSelectedOrphans((prev) => {
            const next = new Set(prev);
            next.has(publicId) ? next.delete(publicId) : next.add(publicId);
            return next;
        });
    };

    const toggleAllOrphans = () => {
        if (selectedOrphans.size === orphaned.length) setSelectedOrphans(new Set());
        else setSelectedOrphans(new Set(orphaned.map((o) => o.publicId)));
    };

    const purgeSelected = async () => {
        if (selectedOrphans.size === 0) return;
        if (!confirm(`Permanently delete ${selectedOrphans.size} orphaned image(s) from Cloudinary?`)) return;
        try {
            setPurging(true);
            const { data } = await api.post(
                "/api/attendance-images/orphaned/purge",
                { publicIds: Array.from(selectedOrphans) },
                { headers: await headers() }
            );
            setOrphaned((prev) => prev.filter((o) => !selectedOrphans.has(o.publicId)));
            setSelectedOrphans(new Set());
            toast.success(`Purged ${data.deleted} image(s) from Cloudinary`);
        } catch (err) {
            toast.error(err.response?.data?.message || err.message);
        } finally {
            setPurging(false);
        }
    };

    // ── Totals ───────────────────────────────────────────────────────────────
    const totalImages = useMemo(
        () => Object.values(grouped).reduce((s, w) => s + Object.values(w.dates).reduce((ss, arr) => ss + arr.length, 0), 0),
        [grouped]
    );

    const toggleWorkspace = (wid) => setCollapsedWorkspaces((p) => ({ ...p, [wid]: !p[wid] }));
    const toggleDate = (key) => setCollapsedDates((p) => ({ ...p, [key]: !p[key] }));

    if (user?.role !== "ADMIN") {
        return (
            <div className="p-6 text-center text-zinc-900 dark:text-zinc-200">
                <p className="text-2xl mt-32 mb-4">Access denied</p>
                <p className="text-sm text-zinc-500">Admin only.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Images className="size-6 text-blue-600 dark:text-blue-400" />
                    <h1 className="text-xl font-semibold">Attendance Image Manager</h1>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        {totalImages} images
                    </span>
                </div>
                <button
                    onClick={fetchImages}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm rounded border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 transition"
                >
                    <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            {/* ── Workspace / Date gallery ── */}
            {loading ? (
                <div className="flex items-center justify-center py-24 text-zinc-400">
                    <Loader2 className="size-6 animate-spin mr-2" /> Loading images…
                </div>
            ) : Object.keys(grouped).length === 0 ? (
                <div className="text-center py-24 text-zinc-500 dark:text-zinc-400">No attendance images found.</div>
            ) : (
                Object.entries(grouped).map(([wid, { workspaceName, dates }]) => {
                    const wsCollapsed = collapsedWorkspaces[wid];
                    const wsTotal = Object.values(dates).reduce((s, a) => s + a.length, 0);
                    return (
                        <div key={wid} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                            {/* Workspace header */}
                            <button
                                className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition"
                                onClick={() => toggleWorkspace(wid)}
                            >
                                <div className="flex items-center gap-3">
                                    {wsCollapsed ? <ChevronRight className="size-4 text-zinc-400" /> : <ChevronDown className="size-4 text-zinc-400" />}
                                    <span className="font-semibold text-zinc-900 dark:text-white">{workspaceName}</span>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                        {wsTotal} images · {Object.keys(dates).length} days
                                    </span>
                                </div>
                            </button>

                            {!wsCollapsed && (
                                <div className="border-t border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {Object.entries(dates).map(([dateStr, records]) => {
                                        const key = `${wid}__${dateStr}`;
                                        const dateCollapsed = collapsedDates[key];
                                        return (
                                            <div key={dateStr}>
                                                {/* Date header */}
                                                <button
                                                    className="w-full flex items-center gap-3 px-6 py-2.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition"
                                                    onClick={() => toggleDate(key)}
                                                >
                                                    {dateCollapsed ? <ChevronRight className="size-3.5 text-zinc-400" /> : <ChevronDown className="size-3.5 text-zinc-400" />}
                                                    <span className="font-medium text-zinc-700 dark:text-zinc-300">{fmtDate(dateStr)}</span>
                                                    <span className="text-xs text-zinc-400">{records.length} photo{records.length !== 1 ? "s" : ""}</span>
                                                </button>

                                                {!dateCollapsed && (
                                                    <div className="px-6 pb-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                                                        {records.map((r) => (
                                                            <ImageCard
                                                                key={r.id}
                                                                record={r}
                                                                onDelete={deleteRecord}
                                                                deleting={deletingId === r.id}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })
            )}

            {/* ── Orphaned images section ── */}
            <div className="bg-white dark:bg-zinc-950 border border-amber-200 dark:border-amber-900 rounded-xl overflow-hidden">
                <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3 bg-amber-50 dark:bg-amber-900/10">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />
                        <div>
                            <p className="font-semibold text-amber-900 dark:text-amber-300">Orphaned Cloudinary Images</p>
                            <p className="text-xs text-amber-700 dark:text-amber-500">
                                Images still in Cloudinary but with no matching DB record (deleted workspaces, failed deletes, etc.)
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={fetchOrphaned}
                        disabled={orphanLoading}
                        className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 transition"
                    >
                        {orphanLoading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                        {orphanLoaded ? "Re-scan Cloudinary" : "Scan Cloudinary"}
                    </button>
                </div>

                {orphanLoaded && (
                    <div className="border-t border-amber-200 dark:border-amber-900 p-5 space-y-4">
                        {orphaned.length === 0 ? (
                            <p className="text-center text-zinc-500 dark:text-zinc-400 py-6">✅ No orphaned images found. Cloudinary is clean!</p>
                        ) : (
                            <>
                                {/* Bulk actions */}
                                <div className="flex flex-wrap items-center gap-3">
                                    <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedOrphans.size === orphaned.length && orphaned.length > 0}
                                            onChange={toggleAllOrphans}
                                            className="accent-red-500"
                                        />
                                        Select all ({orphaned.length})
                                    </label>
                                    {selectedOrphans.size > 0 && (
                                        <button
                                            onClick={purgeSelected}
                                            disabled={purging}
                                            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50 transition"
                                        >
                                            {purging ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                                            Delete selected ({selectedOrphans.size})
                                        </button>
                                    )}
                                    <span className="text-xs text-zinc-400">Click image to select · click thumbnail to preview</span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                                    {orphaned.map((item) => (
                                        <OrphanCard
                                            key={item.publicId}
                                            item={item}
                                            selected={selectedOrphans.has(item.publicId)}
                                            onToggle={toggleOrphan}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
