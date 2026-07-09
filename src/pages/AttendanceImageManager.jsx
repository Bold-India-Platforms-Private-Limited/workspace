import { useEffect, useState, useMemo, useCallback, memo } from "react";
import { useAuth } from "../auth/AuthContext";
import api from "../configs/api";
import toast from "react-hot-toast";
import {
    Images, Trash2, RefreshCw, ChevronDown, ChevronRight,
    AlertTriangle, X, Loader2, CheckSquare, Square,
} from "lucide-react";
import { TIMEZONE } from "../configs/timezone";
import { thumb } from "../utils/cloudinaryUrl";

const fmtDate = (d) =>
    new Date(d).toLocaleDateString("en-IN", { timeZone: TIMEZONE, day: "2-digit", month: "short", year: "numeric" });

const fmtBytes = (b) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(2)} MB`;
};

// ── Lightbox ──────────────────────────────────────────────────────────────────
const Lightbox = ({ url, onClose }) => (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition">
            <X className="size-5" />
        </button>
        <img src={url} alt="Attendance" onClick={(e) => e.stopPropagation()} className="max-h-[90vh] max-w-[90vw] rounded-xl shadow-2xl object-contain" />
    </div>
);

// ── Image card (memoised — only re-renders when its own props change) ─────────
const ImageCard = memo(({ record, onDelete, deleting }) => {
    const [lightbox, setLightbox] = useState(false);
    return (
        <>
            {lightbox && <Lightbox url={record.imageUrl} onClose={() => setLightbox(false)} />}
            <div className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition">
                <div className="aspect-square overflow-hidden cursor-zoom-in bg-zinc-100 dark:bg-zinc-800" onClick={() => setLightbox(true)}>
                    <img src={thumb(record.imageUrl)} alt={record.user?.name || "attendance"} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                </div>
                <div className="p-2">
                    <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">{record.user?.name || record.user?.email || "Unknown"}</p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">{record.user?.email}</p>
                </div>
                <button
                    onClick={() => onDelete(record.id)}
                    disabled={deleting}
                    className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition disabled:opacity-40"
                >
                    {deleting ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                </button>
            </div>
        </>
    );
});

// ── Orphan card ───────────────────────────────────────────────────────────────
const OrphanCard = memo(({ item, selected, onToggle }) => {
    const [lightbox, setLightbox] = useState(false);
    return (
        <>
            {lightbox && <Lightbox url={item.url} onClose={() => setLightbox(false)} />}
            <div
                className={`group relative bg-white dark:bg-zinc-900 border rounded-lg overflow-hidden shadow-sm cursor-pointer transition ${selected ? "border-red-400 dark:border-red-500 ring-2 ring-red-300 dark:ring-red-700" : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400"}`}
                onClick={() => onToggle(item.publicId)}
            >
                <div className="aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-800" onClick={(e) => { e.stopPropagation(); setLightbox(true); }}>
                    <img src={thumb(item.url)} alt="orphan" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
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
});

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AttendanceImageManager() {
    const { user, getToken } = useAuth();

    const [grouped, setGrouped] = useState({});
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);      // single record being deleted
    const [bulkDeleting, setBulkDeleting] = useState(false);

    // day-key = `${wid}__${dateStr}`
    const [selectedDays, setSelectedDays] = useState(new Set());

    // Orphan state
    const [orphaned, setOrphaned] = useState([]);
    const [orphanLoading, setOrphanLoading] = useState(false);
    const [orphanLoaded, setOrphanLoaded] = useState(false);
    const [selectedOrphans, setSelectedOrphans] = useState(new Set());
    const [purging, setPurging] = useState(false);

    // Collapse state — true = collapsed
    const [collapsedWorkspaces, setCollapsedWorkspaces] = useState({});
    const [collapsedDates, setCollapsedDates] = useState({});

    // ── stable toggle helpers (no deps → never recreated) ────────────────────
    const toggleWorkspace = useCallback((wid) =>
        setCollapsedWorkspaces((p) => ({ ...p, [wid]: !p[wid] })), []);

    const toggleDate = useCallback((key) =>
        setCollapsedDates((p) => ({ ...p, [key]: !p[key] })), []);

    const toggleDay = useCallback((wid, dateStr) => {
        const key = `${wid}__${dateStr}`;
        setSelectedDays((prev) => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    }, []);

    const toggleAllDaysInWorkspace = useCallback((wid, dateKeys) => {
        setSelectedDays((prev) => {
            const keys = dateKeys.map((d) => `${wid}__${d}`);
            const allSelected = keys.every((k) => prev.has(k));
            const next = new Set(prev);
            keys.forEach((k) => allSelected ? next.delete(k) : next.add(k));
            return next;
        });
    }, []);

    const toggleOrphan = useCallback((publicId) =>
        setSelectedOrphans((prev) => {
            const next = new Set(prev);
            next.has(publicId) ? next.delete(publicId) : next.add(publicId);
            return next;
        }), []);

    const toggleAllOrphans = useCallback((orphanedList) => {
        setSelectedOrphans((prev) =>
            prev.size === orphanedList.length ? new Set() : new Set(orphanedList.map((o) => o.publicId))
        );
    }, []);

    // ── auth header ───────────────────────────────────────────────────────────
    const authHeaders = useCallback(async () =>
        ({ Authorization: `Bearer ${await getToken()}` }), [getToken]);

    // ── remove deleted records from grouped state (no structuredClone) ────────
    const removeIds = useCallback((ids) => {
        const idSet = new Set(ids);
        setGrouped((prev) => {
            const next = {};
            for (const [wid, { workspaceName, dates }] of Object.entries(prev)) {
                const newDates = {};
                for (const [d, records] of Object.entries(dates)) {
                    const filtered = records.filter((r) => !idSet.has(r.id));
                    if (filtered.length) newDates[d] = filtered;
                }
                if (Object.keys(newDates).length) next[wid] = { workspaceName, dates: newDates };
            }
            return next;
        });
    }, []);

    // ── fetch all images ──────────────────────────────────────────────────────
    const fetchImages = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await api.get("/api/attendance-images", { headers: await authHeaders() });
            setGrouped(data.grouped || {});
            setSelectedDays(new Set());
        } catch (err) {
            toast.error(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    }, [authHeaders]);

    useEffect(() => { if (user?.role === "ADMIN") fetchImages(); }, []);

    // ── core bulk delete ──────────────────────────────────────────────────────
    const bulkDelete = useCallback(async (ids, label) => {
        if (!ids.length || !confirm(`Delete ${label}? This cannot be undone.`)) return;
        try {
            setBulkDeleting(true);
            const { data } = await api.post(
                "/api/attendance-images/bulk-delete",
                { ids },
                { headers: await authHeaders() }
            );
            removeIds(ids);
            setSelectedDays(new Set());
            toast.success(`Deleted ${data.count} image(s)`);
        } catch (err) {
            toast.error(err.response?.data?.message || err.message);
        } finally {
            setBulkDeleting(false);
        }
    }, [authHeaders, removeIds]);

    // ── single delete ─────────────────────────────────────────────────────────
    const deleteOne = useCallback(async (id) => {
        if (!confirm("Delete this attendance image? This cannot be undone.")) return;
        try {
            setDeletingId(id);
            await api.delete(`/api/attendance-images/${id}`, { headers: await authHeaders() });
            removeIds([id]);
            toast.success("Deleted");
        } catch (err) {
            toast.error(err.response?.data?.message || err.message);
        } finally {
            setDeletingId(null);
        }
    }, [authHeaders, removeIds]);

    const deleteDay = useCallback((wid, dateStr, records) =>
        bulkDelete(records.map((r) => r.id), `all ${records.length} image(s) for ${fmtDate(dateStr)}`),
        [bulkDelete]);

    const deleteWorkspace = useCallback((wid, dates, workspaceName) => {
        const ids = Object.values(dates).flat().map((r) => r.id);
        bulkDelete(ids, `ALL ${ids.length} images for workspace "${workspaceName}"`);
    }, [bulkDelete]);

    const deleteSelectedDays = useCallback(() => {
        const ids = [];
        for (const key of selectedDays) {
            const [wid, dateStr] = key.split("__");
            (grouped[wid]?.dates[dateStr] || []).forEach((r) => ids.push(r.id));
        }
        if (ids.length) bulkDelete(ids, `images from ${selectedDays.size} selected day(s)`);
    }, [selectedDays, grouped, bulkDelete]);

    // ── orphan scan ───────────────────────────────────────────────────────────
    const fetchOrphaned = useCallback(async () => {
        try {
            setOrphanLoading(true);
            const { data } = await api.get("/api/attendance-images/orphaned", { headers: await authHeaders() });
            setOrphaned(data.orphaned || []);
            setOrphanLoaded(true);
            toast.success(`Found ${data.orphanedCount} orphaned of ${data.total} in Cloudinary`);
        } catch (err) {
            toast.error(err.response?.data?.message || err.message);
        } finally {
            setOrphanLoading(false);
        }
    }, [authHeaders]);

    const purgeSelected = useCallback(async () => {
        if (!selectedOrphans.size || !confirm(`Permanently delete ${selectedOrphans.size} orphaned image(s) from Cloudinary?`)) return;
        try {
            setPurging(true);
            const { data } = await api.post(
                "/api/attendance-images/orphaned/purge",
                { publicIds: Array.from(selectedOrphans) },
                { headers: await authHeaders() }
            );
            setOrphaned((prev) => prev.filter((o) => !selectedOrphans.has(o.publicId)));
            setSelectedOrphans(new Set());
            toast.success(`Purged ${data.deleted} image(s) from Cloudinary`);
        } catch (err) {
            toast.error(err.response?.data?.message || err.message);
        } finally {
            setPurging(false);
        }
    }, [authHeaders, selectedOrphans]);

    // ── derived values ────────────────────────────────────────────────────────
    const totalImages = useMemo(
        () => Object.values(grouped).reduce((s, w) => s + Object.values(w.dates).reduce((ss, a) => ss + a.length, 0), 0),
        [grouped]
    );

    const groupedEntries = useMemo(() => Object.entries(grouped), [grouped]);

    const { selectedDayCount, selectedImageCount } = useMemo(() => {
        let images = 0;
        for (const key of selectedDays) {
            const [wid, dateStr] = key.split("__");
            images += grouped[wid]?.dates[dateStr]?.length || 0;
        }
        return { selectedDayCount: selectedDays.size, selectedImageCount: images };
    }, [selectedDays, grouped]);

    // ── access guard (AFTER all hooks) ────────────────────────────────────────
    if (user?.role !== "ADMIN") {
        return (
            <div className="p-6 text-center text-zinc-900 dark:text-zinc-200">
                <p className="text-2xl mt-32 mb-4">Access denied</p>
                <p className="text-sm text-zinc-500">Admin only.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">

            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Images className="size-6 text-blue-600 dark:text-blue-400" />
                    <h1 className="text-xl font-semibold">Attendance Image Manager</h1>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        {totalImages} images
                    </span>
                </div>
                <button onClick={fetchImages} disabled={loading} className="flex items-center gap-2 px-3 py-1.5 text-sm rounded border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 transition">
                    <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            {/* Floating multi-day action bar */}
            {selectedDayCount > 0 && (
                <div className="sticky top-3 z-30 flex items-center justify-between gap-3 px-5 py-3 rounded-xl bg-zinc-900 dark:bg-zinc-800 border border-zinc-700 shadow-xl">
                    <div className="flex items-center gap-2 text-sm text-white">
                        <CheckSquare className="size-4 text-blue-400" />
                        <span><strong>{selectedDayCount}</strong> day{selectedDayCount !== 1 ? "s" : ""} selected</span>
                        <span className="text-zinc-400">·</span>
                        <span className="text-zinc-300">{selectedImageCount} image{selectedImageCount !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setSelectedDays(new Set())} className="text-xs px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition">
                            Clear
                        </button>
                        <button onClick={deleteSelectedDays} disabled={bulkDeleting} className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50 transition">
                            {bulkDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                            Delete selected days
                        </button>
                    </div>
                </div>
            )}

            {/* Gallery */}
            {loading ? (
                <div className="flex items-center justify-center py-24 text-zinc-400">
                    <Loader2 className="size-6 animate-spin mr-2" /> Loading images…
                </div>
            ) : groupedEntries.length === 0 ? (
                <div className="text-center py-24 text-zinc-500 dark:text-zinc-400">No attendance images found.</div>
            ) : (
                groupedEntries.map(([wid, { workspaceName, dates }]) => (
                    <WorkspaceBlock
                        key={wid}
                        wid={wid}
                        workspaceName={workspaceName}
                        dates={dates}
                        collapsed={!!collapsedWorkspaces[wid]}
                        collapsedDates={collapsedDates}
                        selectedDays={selectedDays}
                        deletingId={deletingId}
                        bulkDeleting={bulkDeleting}
                        onToggleWorkspace={toggleWorkspace}
                        onToggleDate={toggleDate}
                        onToggleDay={toggleDay}
                        onToggleAllDays={toggleAllDaysInWorkspace}
                        onDeleteOne={deleteOne}
                        onDeleteDay={deleteDay}
                        onDeleteWorkspace={deleteWorkspace}
                    />
                ))
            )}

            {/* Orphaned images */}
            <div className="bg-white dark:bg-zinc-950 border border-amber-200 dark:border-amber-900 rounded-xl overflow-hidden">
                <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3 bg-amber-50 dark:bg-amber-900/10">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />
                        <div>
                            <p className="font-semibold text-amber-900 dark:text-amber-300">Orphaned Cloudinary Images</p>
                            <p className="text-xs text-amber-700 dark:text-amber-500">Images in Cloudinary with no DB record (deleted workspaces, failed deletes, etc.)</p>
                        </div>
                    </div>
                    <button onClick={fetchOrphaned} disabled={orphanLoading} className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 transition">
                        {orphanLoading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                        {orphanLoaded ? "Re-scan Cloudinary" : "Scan Cloudinary"}
                    </button>
                </div>

                {orphanLoaded && (
                    <div className="border-t border-amber-200 dark:border-amber-900 p-5 space-y-4">
                        {orphaned.length === 0 ? (
                            <p className="text-center text-zinc-500 dark:text-zinc-400 py-6">✅ No orphaned images. Cloudinary is clean!</p>
                        ) : (
                            <>
                                <div className="flex flex-wrap items-center gap-3">
                                    <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
                                        <input type="checkbox" checked={selectedOrphans.size === orphaned.length && orphaned.length > 0} onChange={() => toggleAllOrphans(orphaned)} className="accent-red-500" />
                                        Select all ({orphaned.length})
                                    </label>
                                    {selectedOrphans.size > 0 && (
                                        <button onClick={purgeSelected} disabled={purging} className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50 transition">
                                            {purging ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                                            Delete selected ({selectedOrphans.size})
                                        </button>
                                    )}
                                    <span className="text-xs text-zinc-400">Click card to select · click image to preview</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                                    {orphaned.map((item) => (
                                        <OrphanCard key={item.publicId} item={item} selected={selectedOrphans.has(item.publicId)} onToggle={toggleOrphan} />
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

// ── WorkspaceBlock (separate component so it can be independently memoised) ──
const WorkspaceBlock = memo(({
    wid, workspaceName, dates, collapsed, collapsedDates, selectedDays,
    deletingId, bulkDeleting,
    onToggleWorkspace, onToggleDate, onToggleDay, onToggleAllDays,
    onDeleteOne, onDeleteDay, onDeleteWorkspace,
}) => {
    const dateEntries = useMemo(() => Object.entries(dates), [dates]);
    const dateKeys = useMemo(() => Object.keys(dates), [dates]);
    const wsTotal = useMemo(() => dateEntries.reduce((s, [, r]) => s + r.length, 0), [dateEntries]);

    const dayKeys = dateKeys.map((d) => `${wid}__${d}`);
    const wsAllSelected = dayKeys.length > 0 && dayKeys.every((k) => selectedDays.has(k));
    const wsPartialSelected = !wsAllSelected && dayKeys.some((k) => selectedDays.has(k));

    return (
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            {/* Workspace header */}
            <div className="flex items-center justify-between px-5 py-3 bg-zinc-50 dark:bg-zinc-900/60">
                <button className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={() => onToggleWorkspace(wid)}>
                    {collapsed ? <ChevronRight className="size-4 text-zinc-400 shrink-0" /> : <ChevronDown className="size-4 text-zinc-400 shrink-0" />}
                    <span className="font-semibold text-zinc-900 dark:text-white truncate">{workspaceName}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shrink-0">
                        {wsTotal} images · {dateKeys.length} days
                    </span>
                </button>

                <div className="flex items-center gap-2 ml-3 shrink-0">
                    <button
                        onClick={() => onToggleAllDays(wid, dateKeys)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition ${wsAllSelected || wsPartialSelected ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" : "border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-400"}`}
                    >
                        {wsAllSelected ? <CheckSquare className="size-3.5" /> : <Square className="size-3.5" />}
                        {wsAllSelected ? "Deselect all" : wsPartialSelected ? "Select all" : "Select days"}
                    </button>
                    <button
                        onClick={() => onDeleteWorkspace(wid, dates, workspaceName)}
                        disabled={bulkDeleting}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 transition"
                    >
                        <Trash2 className="size-3.5" />
                        Delete workspace
                    </button>
                </div>
            </div>

            {!collapsed && (
                <div className="border-t border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
                    {dateEntries.map(([dateStr, records]) => (
                        <DateBlock
                            key={dateStr}
                            wid={wid}
                            dateStr={dateStr}
                            records={records}
                            collapsed={!!collapsedDates[`${wid}__${dateStr}`]}
                            selected={selectedDays.has(`${wid}__${dateStr}`)}
                            deletingId={deletingId}
                            bulkDeleting={bulkDeleting}
                            onToggleDate={onToggleDate}
                            onToggleDay={onToggleDay}
                            onDeleteOne={onDeleteOne}
                            onDeleteDay={onDeleteDay}
                        />
                    ))}
                </div>
            )}
        </div>
    );
});

// ── DateBlock (separate memoised component per date row) ──────────────────────
const DateBlock = memo(({
    wid, dateStr, records, collapsed, selected,
    deletingId, bulkDeleting,
    onToggleDate, onToggleDay, onDeleteOne, onDeleteDay,
}) => {
    const key = `${wid}__${dateStr}`;
    return (
        <div className={selected ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}>
            <div className="flex items-center gap-2 px-6 py-2.5">
                {/* Day checkbox */}
                <button
                    onClick={() => onToggleDay(wid, dateStr)}
                    className={`shrink-0 size-4 rounded border-2 flex items-center justify-center transition ${selected ? "bg-blue-500 border-blue-500" : "border-zinc-400 dark:border-zinc-600 hover:border-blue-400"}`}
                >
                    {selected && <span className="text-white text-[8px] font-bold leading-none">✓</span>}
                </button>

                {/* Collapse toggle + label */}
                <button className="flex items-center gap-2 flex-1 text-sm text-left" onClick={() => onToggleDate(key)}>
                    {collapsed ? <ChevronRight className="size-3.5 text-zinc-400" /> : <ChevronDown className="size-3.5 text-zinc-400" />}
                    <span className={`font-medium ${selected ? "text-blue-700 dark:text-blue-300" : "text-zinc-700 dark:text-zinc-300"}`}>{fmtDate(dateStr)}</span>
                    <span className="text-xs text-zinc-400">{records.length} photo{records.length !== 1 ? "s" : ""}</span>
                </button>

                {/* Delete day */}
                <button
                    onClick={() => onDeleteDay(wid, dateStr, records)}
                    disabled={bulkDeleting}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 transition"
                >
                    <Trash2 className="size-3" />
                    Delete day
                </button>
            </div>

            {!collapsed && (
                <div className="px-6 pb-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                    {records.map((r) => (
                        <ImageCard key={r.id} record={r} onDelete={onDeleteOne} deleting={deletingId === r.id} />
                    ))}
                </div>
            )}
        </div>
    );
});
