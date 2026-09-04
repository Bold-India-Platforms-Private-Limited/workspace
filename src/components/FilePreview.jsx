import { useState } from "react";
import toast from "react-hot-toast";
import {
    X, Copy, Download, ExternalLink, Loader2,
    FileText, FileSpreadsheet, FileImage, Presentation, File as FileIco,
} from "lucide-react";

// ── type detection ────────────────────────────────────────────────────────────
export function fileKind(nameOrType = "") {
    const s = String(nameOrType).toLowerCase();
    if (/\.(png|jpe?g|gif|webp|bmp|svg|avif)(\?|$)/.test(s) || s.startsWith("image/")) return "image";
    if (/\.pdf(\?|$)/.test(s) || s.includes("pdf")) return "pdf";
    if (/\.(xlsx?|xlsm|csv|tsv)(\?|$)/.test(s) || s.includes("spreadsheet") || s.includes("excel") || s.includes("csv")) return "sheet";
    if (/\.(docx?|rtf|odt)(\?|$)/.test(s) || s.includes("word") || s.includes("document")) return "doc";
    if (/\.(pptx?|odp)(\?|$)/.test(s) || s.includes("presentation") || s.includes("powerpoint")) return "slides";
    if (/\.(txt|md|json|log)(\?|$)/.test(s) || s.startsWith("text/")) return "text";
    return "other";
}

const META = {
    image:  { Icon: FileImage,       color: "text-pink-600 dark:text-pink-400",       bg: "bg-pink-50 dark:bg-pink-900/30" },
    pdf:    { Icon: FileText,        color: "text-red-600 dark:text-red-400",         bg: "bg-red-50 dark:bg-red-900/30" },
    sheet:  { Icon: FileSpreadsheet, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30" },
    doc:    { Icon: FileText,        color: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-50 dark:bg-blue-900/30" },
    slides: { Icon: Presentation,    color: "text-orange-600 dark:text-orange-400",   bg: "bg-orange-50 dark:bg-orange-900/30" },
    text:   { Icon: FileText,        color: "text-zinc-600 dark:text-zinc-400",       bg: "bg-zinc-100 dark:bg-zinc-800" },
    other:  { Icon: FileIco,         color: "text-violet-600 dark:text-violet-400",   bg: "bg-violet-50 dark:bg-violet-900/30" },
};

export function fileMeta(nameOrType) {
    return META[fileKind(nameOrType)] || META.other;
}

export function FileTypeIcon({ nameOrType, size = 18, className = "" }) {
    const { Icon } = fileMeta(nameOrType);
    return <Icon size={size} className={className} />;
}

export function humanSize(bytes = 0) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export async function copyLink(url) {
    try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
    } catch {
        // Fallback for non-secure contexts
        const ta = document.createElement("textarea");
        ta.value = url; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); toast.success("Link copied"); }
        catch { toast.error("Couldn't copy — long-press the link to copy"); }
        document.body.removeChild(ta);
    }
}

const gview = (url) => `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

// ── Preview modal ─────────────────────────────────────────────────────────────
export function FilePreviewModal({ file, onClose }) {
    const [loaded, setLoaded] = useState(false);
    if (!file) return null;
    const kind = fileKind(file.contentType || file.name || file.url || "");
    const { Icon } = fileMeta(file.contentType || file.name);

    let body;
    if (kind === "image") {
        body = <img src={file.url} alt={file.name} className="max-h-full max-w-full m-auto object-contain" onLoad={() => setLoaded(true)} />;
    } else if (kind === "pdf") {
        body = <iframe src={file.url} title={file.name} className="w-full h-full border-0" onLoad={() => setLoaded(true)} />;
    } else if (kind === "sheet" || kind === "doc" || kind === "slides" || kind === "text") {
        body = <iframe src={gview(file.url)} title={file.name} className="w-full h-full border-0" onLoad={() => setLoaded(true)} sandbox="allow-scripts allow-same-origin allow-popups" />;
    } else {
        body = (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-400 p-6 text-center">
                <Icon size={40} />
                <p className="text-sm">No inline preview for this file type.</p>
                <a href={file.url} target="_blank" rel="noreferrer" className="text-sm text-blue-500 hover:underline font-medium">Open / download →</a>
            </div>
        );
    }

    const showSpinner = !loaded && kind !== "other";

    return (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5" onClick={onClose}>
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden" style={{ maxWidth: 1100, height: "92vh" }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                    <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                        <Icon size={15} className="text-zinc-600 dark:text-zinc-300" />
                    </div>
                    <p className="flex-1 min-w-0 font-semibold text-zinc-800 dark:text-zinc-100 text-sm truncate">{file.name}</p>
                    <button onClick={() => copyLink(file.url)} className="p-2 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition" title="Copy link">
                        <Copy size={15} />
                    </button>
                    <a href={file.url} target="_blank" rel="noreferrer" download className="p-2 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition" title="Open / download">
                        <ExternalLink size={15} />
                    </a>
                    <button onClick={onClose} className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition" title="Close">
                        <X size={15} />
                    </button>
                </div>

                <div className="flex-1 relative bg-zinc-100 dark:bg-zinc-950 overflow-auto flex">
                    {showSpinner && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-400 z-10">
                            <Loader2 size={30} className="animate-spin text-blue-500" />
                            <p className="text-sm font-medium">Loading preview…</p>
                        </div>
                    )}
                    {body}
                </div>

                <div className="px-5 py-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 shrink-0 text-center">
                    <p className="text-[11px] text-zinc-400">
                        Not loading?{" "}
                        <a href={file.url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline font-medium">Open the file directly →</a>
                    </p>
                </div>
            </div>
        </div>
    );
}

// ── Compact file row (name · size · copy · preview · open · delete) ────────────
export function FileRow({ file, onPreview, onDelete, canDelete }) {
    const { Icon, color, bg } = fileMeta(file.contentType || file.name);
    const [deleting, setDeleting] = useState(false);
    return (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition">
            <button onClick={() => onPreview(file)} className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`} title="Preview">
                <Icon size={17} className={color} />
            </button>
            <button onClick={() => onPreview(file)} className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">{file.name}</p>
                <p className="text-[11px] text-zinc-400">{humanSize(file.size)}{file.uploadedBy?.name ? ` · ${file.uploadedBy.name}` : ""}</p>
            </button>
            <button onClick={() => copyLink(file.url)} className="p-2 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition shrink-0" title="Copy link">
                <Copy size={14} />
            </button>
            <a href={file.url} target="_blank" rel="noreferrer" download className="p-2 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition shrink-0" title="Open / download">
                <Download size={14} />
            </a>
            {canDelete && (
                <button
                    onClick={async () => { if (!confirm(`Delete "${file.name}"?`)) return; setDeleting(true); await onDelete(file); setDeleting(false); }}
                    disabled={deleting}
                    className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 transition shrink-0"
                    title="Delete"
                >
                    {deleting ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                </button>
            )}
        </div>
    );
}
