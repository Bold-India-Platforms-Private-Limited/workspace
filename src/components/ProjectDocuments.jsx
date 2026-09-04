import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../auth/AuthContext";
import toast from "react-hot-toast";
import {
    Plus, Trash2, ExternalLink, FileText, FileSpreadsheet,
    Presentation, Film, File, X, Loader2, FolderOpen,
    Link2, Eye, Tag, Search, SlidersHorizontal, Database, Folder,
} from "lucide-react";
import { FilePreviewModal, FileRow, copyLink } from "./FilePreview";

const API = import.meta.env.VITE_BASEURL;

// ── Label catalogue ───────────────────────────────────────────────────────────
export const LABEL_OPTIONS = [
    { value: "Dataset",       color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",  dot: "bg-emerald-500" },
    { value: "Report",        color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",              dot: "bg-blue-500" },
    { value: "Presentation",  color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",      dot: "bg-orange-500" },
    { value: "Reference",     color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",      dot: "bg-violet-500" },
    { value: "Documentation", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",      dot: "bg-yellow-500" },
    { value: "Design",        color: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",              dot: "bg-pink-500" },
    { value: "Code",          color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",      dot: "bg-indigo-500" },
    { value: "Video",         color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",                  dot: "bg-red-500" },
    { value: "Template",      color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",              dot: "bg-cyan-500" },
    { value: "Research",      color: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",              dot: "bg-teal-500" },
];

const labelMap = Object.fromEntries(LABEL_OPTIONS.map(l => [l.value, l]));

function LabelChip({ value, size = "sm" }) {
    const l = labelMap[value];
    if (!l) return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300`}>
            {value}
        </span>
    );
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${l.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${l.dot}`} />
            {value}
        </span>
    );
}

// ── URL helpers ───────────────────────────────────────────────────────────────
function toEmbedUrl(url) {
    try {
        const u = new URL(url);
        if (u.hostname === "docs.google.com") {
            if (u.pathname.includes("/preview")) return url;
            return url.replace(/\/(edit|view|pub)(\?.*)?$/, "/preview");
        }
        const fileMatch = u.pathname.match(/\/file\/d\/([^/]+)/);
        if (fileMatch) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
        const folderMatch = u.pathname.match(/\/drive\/folders\/([^/]+)/);
        if (folderMatch) return `https://drive.google.com/embeddedfolderview?id=${folderMatch[1]}#list`;
        return url;
    } catch { return url; }
}

function getDocMeta(url = "") {
    const u = url.toLowerCase();
    if (u.includes("spreadsheets"))        return { Icon: FileSpreadsheet, color: "text-emerald-600", bg: "from-emerald-500 to-teal-500",     light: "bg-emerald-50 dark:bg-emerald-900/30",  border: "border-emerald-200 dark:border-emerald-800", type: "Spreadsheet" };
    if (u.includes("presentation"))        return { Icon: Presentation,    color: "text-orange-600",  bg: "from-orange-500 to-amber-500",     light: "bg-orange-50 dark:bg-orange-900/30",   border: "border-orange-200 dark:border-orange-800",  type: "Slides" };
    if (u.includes("document"))            return { Icon: FileText,         color: "text-blue-600",    bg: "from-blue-500 to-indigo-500",      light: "bg-blue-50 dark:bg-blue-900/30",       border: "border-blue-200 dark:border-blue-800",      type: "Document" };
    if (u.match(/\.(mp4|mov|avi|webm)/))   return { Icon: Film,             color: "text-red-600",     bg: "from-red-500 to-rose-500",         light: "bg-red-50 dark:bg-red-900/30",         border: "border-red-200 dark:border-red-800",        type: "Video" };
    if (u.includes("drive.google.com"))    return { Icon: FolderOpen,       color: "text-yellow-600",  bg: "from-yellow-400 to-orange-400",    light: "bg-yellow-50 dark:bg-yellow-900/30",   border: "border-yellow-200 dark:border-yellow-800",  type: "Drive Folder" };
    return                                        { Icon: File,             color: "text-violet-600",  bg: "from-violet-500 to-purple-500",    light: "bg-violet-50 dark:bg-violet-900/30",   border: "border-violet-200 dark:border-violet-800",  type: "File" };
}

// ── Add Document modal ────────────────────────────────────────────────────────
function AddDocModal({ onClose, onAdded, projectId }) {
    const { getToken } = useAuth();
    const [mode,   setMode]   = useState("link");   // "link" | "dataset"
    const [form,   setForm]   = useState({ title: "", driveLink: "", description: "" });
    const [tags,   setTags]   = useState([]);
    const [saving, setSaving] = useState(false);
    const [error,  setError]  = useState("");
    const [folders, setFolders] = useState(null);   // null = not loaded yet
    const [folderId, setFolderId] = useState("");

    const toggleTag = (val) =>
        setTags(prev => prev.includes(val) ? prev.filter(t => t !== val) : prev.length < 5 ? [...prev, val] : prev);

    useEffect(() => {
        if (mode !== "dataset" || folders !== null) return;
        (async () => {
            try {
                const token = await getToken();
                const res = await fetch(`${API}/api/datasets`, { headers: { Authorization: `Bearer ${token}` } });
                const data = await res.json();
                setFolders(res.ok ? (data.folders || []) : []);
            } catch { setFolders([]); }
        })();
    }, [mode, folders, getToken]);

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        if (mode === "dataset" && !folderId) { setError("Pick a dataset folder"); return; }
        setSaving(true);
        try {
            const token = await getToken();
            const body = mode === "dataset"
                ? { kind: "dataset", title: form.title, description: form.description, tags, datasetFolderId: folderId }
                : { kind: "link", ...form, tags };
            const res = await fetch(`${API}/api/projects/${projectId}/documents`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.message || "Failed to add"); return; }
            onAdded(data.document);
            toast.success("Document added!");
            onClose();
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const tabCls = (active) => `flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition ${
        active ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700"
    }`;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Modal header */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                        <Link2 size={16} className="text-white" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-zinc-800 dark:text-zinc-100 text-base">Add Document</h3>
                        <p className="text-xs text-zinc-400">A link, or a Dataset Storage folder</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={submit} className="p-6 space-y-4">
                    {/* Mode tabs */}
                    <div className="flex gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800">
                        <button type="button" onClick={() => { setMode("link"); setError(""); }} className={tabCls(mode === "link")}>
                            <Link2 size={13} /> Link
                        </button>
                        <button type="button" onClick={() => { setMode("dataset"); setError(""); }} className={tabCls(mode === "dataset")}>
                            <Database size={13} /> Dataset Folder
                        </button>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide block mb-1.5">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                            placeholder="e.g. Q3 Dataset, Final Presentation…"
                            required
                            style={{ backgroundColor: "white", border: "1.5px solid #e5e7eb", color: "#111827" }}
                            className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition placeholder-gray-400"
                        />
                    </div>

                    {/* Drive link — link mode */}
                    {mode === "link" && (
                        <div>
                            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide block mb-1.5">
                                Link <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Link2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                                <input
                                    type="url"
                                    value={form.driveLink}
                                    onChange={e => setForm(f => ({ ...f, driveLink: e.target.value }))}
                                    placeholder="https://drive.google.com/… or any file URL"
                                    required
                                    style={{ backgroundColor: "white", border: "1.5px solid #e5e7eb", color: "#111827" }}
                                    className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition placeholder-gray-400"
                                />
                            </div>
                        </div>
                    )}

                    {/* Dataset folder — dataset mode */}
                    {mode === "dataset" && (
                        <div>
                            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide block mb-1.5">
                                Dataset folder <span className="text-red-500">*</span>
                            </label>
                            {folders === null ? (
                                <div className="flex items-center gap-2 text-xs text-zinc-400 py-2"><Loader2 size={13} className="animate-spin" /> Loading folders…</div>
                            ) : folders.length === 0 ? (
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 py-2">
                                    No dataset folders yet. Create one in <span className="font-semibold">Dataset Storage</span> first.
                                </p>
                            ) : (
                                <select
                                    value={folderId}
                                    onChange={e => setFolderId(e.target.value)}
                                    required
                                    className="w-full rounded-xl px-3.5 py-2.5 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                >
                                    <option value="">Select a folder…</option>
                                    {folders.map(f => (
                                        <option key={f.id} value={f.id}>{f.name} ({f.fileCount} file{f.fileCount !== 1 ? "s" : ""})</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {/* Tags */}
                    <div>
                        <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide block mb-2">
                            Labels <span className="text-zinc-400 font-normal normal-case">(pick up to 5)</span>
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {LABEL_OPTIONS.map(l => {
                                const active = tags.includes(l.value);
                                return (
                                    <button
                                        key={l.value}
                                        type="button"
                                        onClick={() => toggleTag(l.value)}
                                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border transition-all ${
                                            active
                                                ? `${l.color} border-transparent scale-105 shadow-sm`
                                                : "bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                                        }`}
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full ${active ? l.dot : "bg-zinc-300 dark:bg-zinc-600"}`} />
                                        {l.value}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide block mb-1.5">
                            Description <span className="text-zinc-400 font-normal normal-case">(optional)</span>
                        </label>
                        <textarea
                            value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            placeholder="Brief note about this document…"
                            rows={2}
                            style={{ backgroundColor: "white", border: "1.5px solid #e5e7eb", color: "#111827" }}
                            className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition placeholder-gray-400 resize-none"
                        />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                            <X size={13} className="text-red-500 shrink-0" />
                            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-2.5 pt-1">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold disabled:opacity-50 transition shadow-sm shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2">
                            {saving ? <><Loader2 size={14} className="animate-spin" />Saving…</> : <><Plus size={14} />Add Document</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Viewer modal ──────────────────────────────────────────────────────────────
function ViewerModal({ doc, onClose }) {
    const [loaded, setLoaded] = useState(false);
    const { Icon, bg, type } = getDocMeta(doc.driveLink);

    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5" onClick={onClose}>
            <div
                className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden"
                style={{ maxWidth: 1100, height: "92vh" }}
                onClick={e => e.stopPropagation()}
            >
                {/* Viewer header */}
                <div className="flex items-center gap-3 px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${bg} flex items-center justify-center shadow-sm`}>
                        <Icon size={15} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-zinc-800 dark:text-zinc-100 text-sm truncate">{doc.title}</p>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium shrink-0">{type}</span>
                        </div>
                        {doc.description && <p className="text-xs text-zinc-400 truncate mt-0.5">{doc.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        {doc.tags?.length > 0 && doc.tags.map(t => <LabelChip key={t} value={t} />)}
                        <a href={doc.driveLink} target="_blank" rel="noreferrer"
                            className="ml-1 p-2 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition" title="Open in Drive">
                            <ExternalLink size={15} />
                        </a>
                        <button onClick={onClose}
                            className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition" title="Close">
                            <X size={15} />
                        </button>
                    </div>
                </div>

                {/* Iframe */}
                <div className="flex-1 relative bg-zinc-100 dark:bg-zinc-950">
                    {!loaded && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-400">
                            <Loader2 size={30} className="animate-spin text-blue-500" />
                            <p className="text-sm font-medium">Loading document…</p>
                        </div>
                    )}
                    <iframe
                        src={toEmbedUrl(doc.driveLink)}
                        title={doc.title}
                        className="w-full h-full border-0"
                        onLoad={() => setLoaded(true)}
                        allow="autoplay"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    />
                </div>

                <div className="px-5 py-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 shrink-0 text-center">
                    <p className="text-[11px] text-zinc-400">
                        Not loading?{" "}
                        <a href={doc.driveLink} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline font-medium">
                            Open directly in Google Drive →
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}

// ── Document card ─────────────────────────────────────────────────────────────
function DocCard({ doc, isAdmin, onDelete, onView }) {
    const { Icon, bg, light, border, type } = getDocMeta(doc.driveLink);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async (e) => {
        e.stopPropagation();
        if (!confirm(`Delete "${doc.title}"?`)) return;
        setDeleting(true);
        await onDelete(doc.id);
    };

    return (
        <div
            className={`group relative bg-white dark:bg-zinc-900 border ${border} rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer`}
            onClick={() => onView(doc)}
        >
            {/* Coloured top bar */}
            <div className={`h-1.5 w-full bg-gradient-to-r ${bg}`} />

            <div className="p-4">
                {/* Header row */}
                <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${bg} flex items-center justify-center shrink-0 shadow-sm`}>
                        <Icon size={18} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-zinc-800 dark:text-zinc-100 leading-snug line-clamp-2">{doc.title}</p>
                        <span className={`inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${light} text-zinc-600 dark:text-zinc-300`}>
                            {type}
                        </span>
                    </div>

                    {/* Action buttons — appear on hover */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                            onClick={e => { e.stopPropagation(); onView(doc); }}
                            className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition"
                            title="View"
                        >
                            <Eye size={13} />
                        </button>
                        <a
                            href={doc.driveLink} target="_blank" rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
                            title="Open in Drive"
                        >
                            <ExternalLink size={13} />
                        </a>
                        {isAdmin && (
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-40 transition"
                                title="Delete"
                            >
                                {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                            </button>
                        )}
                    </div>
                </div>

                {/* Description */}
                {doc.description && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-3 leading-relaxed">
                        {doc.description}
                    </p>
                )}

                {/* Tags row */}
                {doc.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {doc.tags.map(t => <LabelChip key={t} value={t} />)}
                    </div>
                )}

                {/* Primary actions */}
                <div className="flex items-center gap-2 mb-3">
                    <a
                        href={doc.driveLink} target="_blank" rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition shadow-sm shadow-blue-200 dark:shadow-none"
                    >
                        <ExternalLink size={15} /> View in new tab
                    </a>
                    <button
                        onClick={e => { e.stopPropagation(); onView(doc); }}
                        className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-blue-600 hover:border-blue-300 dark:hover:border-blue-500/50 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition shrink-0"
                        title="Quick preview"
                    >
                        <Eye size={16} />
                    </button>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                            {doc.addedBy?.name?.[0]?.toUpperCase() || "A"}
                        </div>
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{doc.addedBy?.name || "Admin"}</span>
                    </div>
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                        {new Date(doc.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                </div>
            </div>

            {/* Click-to-view overlay hint */}
            <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/[0.02] transition-colors rounded-2xl pointer-events-none" />
        </div>
    );
}

// ── Dataset-folder document: card + files modal ───────────────────────────────
function DatasetDocCard({ doc, isAdmin, onDelete, onOpen }) {
    const [deleting, setDeleting] = useState(false);
    const count = doc.datasetFolder?.files?.length ?? 0;
    return (
        <div
            className="group relative bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800 rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
            onClick={() => onOpen(doc)}
        >
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="p-4">
                <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shrink-0 shadow-sm">
                        <Database size={18} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-zinc-800 dark:text-zinc-100 leading-snug line-clamp-2">{doc.title}</p>
                        <span className="inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                            Dataset · {count} file{count !== 1 ? "s" : ""}
                        </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={e => { e.stopPropagation(); onOpen(doc); }} className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition" title="Open">
                            <FolderOpen size={13} />
                        </button>
                        {isAdmin && (
                            <button onClick={async e => { e.stopPropagation(); if (!confirm(`Remove "${doc.title}" from this project? (The folder stays in Dataset Storage.)`)) return; setDeleting(true); await onDelete(doc.id); }}
                                disabled={deleting}
                                className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 disabled:opacity-40 transition" title="Remove">
                                {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                            </button>
                        )}
                    </div>
                </div>
                {doc.description && <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-3">{doc.description}</p>}
                {doc.tags?.length > 0 && <div className="flex flex-wrap gap-1.5 mb-3">{doc.tags.map(t => <LabelChip key={t} value={t} />)}</div>}

                {/* Primary action */}
                <button
                    onClick={e => { e.stopPropagation(); onOpen(doc); }}
                    className="w-full inline-flex items-center justify-center gap-2 h-10 mb-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition shadow-sm shadow-emerald-200 dark:shadow-none"
                >
                    <FolderOpen size={15} /> View {count} file{count !== 1 ? "s" : ""}
                </button>

                <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate flex items-center gap-1">
                        <Folder size={11} /> {doc.datasetFolder?.name || "Folder"}
                    </span>
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                        {new Date(doc.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                </div>
            </div>
        </div>
    );
}

function DatasetFolderModal({ doc, onClose }) {
    const [preview, setPreview] = useState(null);
    const files = doc.datasetFolder?.files || [];
    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                        <Database size={16} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-zinc-800 dark:text-zinc-100 text-sm truncate">{doc.title}</h3>
                        <p className="text-[11px] text-zinc-400 truncate">{doc.datasetFolder?.name} · {files.length} file{files.length !== 1 ? "s" : ""}</p>
                    </div>
                    {files.length > 0 && (
                        <button onClick={() => copyLink(files.map(f => f.url).join("\n"))} className="p-2 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30" title="Copy all links">
                            <Link2 size={15} />
                        </button>
                    )}
                    <button onClick={onClose} className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X size={15} /></button>
                </div>
                <div className="p-4 overflow-y-auto space-y-2">
                    {files.length === 0
                        ? <p className="text-sm text-zinc-400 text-center py-8">This folder has no files yet.</p>
                        : files.map(f => <FileRow key={f.id} file={f} onPreview={setPreview} />)}
                </div>
            </div>
            {preview && <FilePreviewModal file={preview} onClose={() => setPreview(null)} />}
        </div>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ProjectDocuments({ projectId }) {
    const { getToken, user } = useAuth();
    const isAdmin = user?.role === "ADMIN";

    const [docs,       setDocs]       = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [showAdd,    setShowAdd]    = useState(false);
    const [viewingDoc, setViewingDoc] = useState(null);   // link docs → ViewerModal
    const [openFolder, setOpenFolder] = useState(null);   // dataset docs → DatasetFolderModal
    const [search,     setSearch]     = useState("");
    const [filterTag,  setFilterTag]  = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const token = await getToken();
            const res   = await fetch(`${API}/api/projects/${projectId}/documents`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setDocs(data.documents || []);
        } catch {
            toast.error("Failed to load documents");
        } finally {
            setLoading(false);
        }
    }, [projectId, getToken]);

    useEffect(() => { load(); }, [load]);

    const handleAdded  = (doc)   => setDocs(prev => [doc, ...prev]);
    const handleDelete = async (docId) => {
        try {
            const token = await getToken();
            await fetch(`${API}/api/projects/${projectId}/documents/${docId}`, {
                method: "DELETE", headers: { Authorization: `Bearer ${token}` },
            });
            setDocs(prev => prev.filter(d => d.id !== docId));
            toast.success("Document removed");
        } catch {
            toast.error("Failed to delete");
        }
    };

    // All unique tags across docs for filter bar
    const allTags = [...new Set(docs.flatMap(d => d.tags || []))];

    const filtered = docs.filter(d => {
        const q = search.toLowerCase();
        const matchSearch = !q || d.title.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q);
        const matchTag    = !filterTag || d.tags?.includes(filterTag);
        return matchSearch && matchTag;
    });

    return (
        <div className="max-w-6xl space-y-5">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-zinc-800 dark:text-zinc-100 text-base">Project Documents</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {loading ? "Loading…" : docs.length === 0 ? "No documents yet" : `${docs.length} document${docs.length !== 1 ? "s" : ""}`}
                    </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 sm:w-52">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search…"
                            className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
                        />
                    </div>
                    {isAdmin && (
                        <button
                            onClick={() => setShowAdd(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold shadow-sm shadow-blue-200 dark:shadow-none transition shrink-0"
                        >
                            <Plus size={15} />
                            Add
                        </button>
                    )}
                </div>
            </div>

            {/* Label filter pills */}
            {allTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-xs text-zinc-400 flex items-center gap-1"><Tag size={11} /> Filter:</span>
                    <button
                        onClick={() => setFilterTag("")}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium transition border ${!filterTag ? "bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent" : "bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"}`}
                    >
                        All
                    </button>
                    {allTags.map(t => {
                        const l = labelMap[t];
                        const active = filterTag === t;
                        return (
                            <button
                                key={t}
                                onClick={() => setFilterTag(active ? "" : t)}
                                className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold border transition-all ${
                                    active
                                        ? `${l?.color || "bg-zinc-200 text-zinc-700"} border-transparent shadow-sm scale-105`
                                        : "bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                                }`}
                            >
                                {l && <span className={`w-1.5 h-1.5 rounded-full ${l.dot}`} />}
                                {t}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Loading skeleton */}
            {loading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800">
                            <div className="h-1.5 bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                            <div className="p-4 space-y-3">
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-700 animate-pulse shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-700 animate-pulse rounded" />
                                        <div className="h-3 w-1/3 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded" />
                                    </div>
                                </div>
                                <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded" />
                                <div className="h-3 w-2/3 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty */}
            {!loading && docs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center mb-5 shadow-inner">
                        <FolderOpen size={32} className="text-blue-400 dark:text-blue-500" />
                    </div>
                    <p className="text-base font-semibold text-zinc-600 dark:text-zinc-300">No documents yet</p>
                    {isAdmin
                        ? <p className="text-sm text-zinc-400 mt-1.5 max-w-xs">Click <span className="font-semibold text-blue-600 dark:text-blue-400">Add</span> to share Google Drive files, datasets, presentations and more with the team.</p>
                        : <p className="text-sm text-zinc-400 mt-1.5">Your admin hasn't added any documents yet.</p>
                    }
                </div>
            )}

            {/* No search results */}
            {!loading && docs.length > 0 && filtered.length === 0 && (
                <div className="text-center py-12 text-zinc-400">
                    <Search size={24} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No documents match your search</p>
                    <button onClick={() => { setSearch(""); setFilterTag(""); }} className="text-xs text-blue-500 hover:underline mt-1">Clear filters</button>
                </div>
            )}

            {/* Grid */}
            {!loading && filtered.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(doc => (
                        doc.kind === "dataset"
                            ? <DatasetDocCard key={doc.id} doc={doc} isAdmin={isAdmin} onDelete={handleDelete} onOpen={setOpenFolder} />
                            : <DocCard key={doc.id} doc={doc} isAdmin={isAdmin} onDelete={handleDelete} onView={setViewingDoc} />
                    ))}
                </div>
            )}

            {showAdd    && <AddDocModal projectId={projectId} onClose={() => setShowAdd(false)} onAdded={handleAdded} />}
            {viewingDoc && <ViewerModal doc={viewingDoc} onClose={() => setViewingDoc(null)} />}
            {openFolder && <DatasetFolderModal doc={openFolder} onClose={() => setOpenFolder(null)} />}
        </div>
    );
}
