import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../auth/AuthContext";
import api from "../configs/api";
import toast from "react-hot-toast";
import {
    Database, FolderPlus, Folder, ArrowLeft, UploadCloud, Loader2, X,
    Trash2, MoreVertical, Copy, Search, Pencil,
} from "lucide-react";
import { FilePreviewModal, FileRow, copyLink } from "../components/FilePreview";

// ── New / rename folder modal ─────────────────────────────────────────────────
function FolderModal({ initial, onClose, onSave }) {
    const [name, setName] = useState(initial?.name || "");
    const [description, setDescription] = useState(initial?.description || "");
    const [saving, setSaving] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSaving(true);
        try { await onSave({ name: name.trim(), description: description.trim() }); onClose(); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
                        <FolderPlus size={16} className="text-white" />
                    </div>
                    <h3 className="flex-1 font-bold text-zinc-800 dark:text-zinc-100 text-base">{initial ? "Rename folder" : "New folder"}</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X size={16} /></button>
                </div>
                <form onSubmit={submit} className="p-6 space-y-4">
                    <div>
                        <label className="text-[13px] font-medium text-zinc-600 dark:text-zinc-300 block mb-1.5">Folder name</label>
                        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nifty 100 Financials"
                            className="w-full h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 px-3.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500" />
                    </div>
                    <div>
                        <label className="text-[13px] font-medium text-zinc-600 dark:text-zinc-300 block mb-1.5">Description <span className="text-zinc-400 font-normal">(optional)</span></label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What's in this folder…"
                            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 resize-none" />
                    </div>
                    <div className="flex gap-2.5 pt-1">
                        <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">Cancel</button>
                        <button type="submit" disabled={saving || !name.trim()} className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                            {saving ? <Loader2 size={15} className="animate-spin" /> : (initial ? "Save" : "Create")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Folder detail (files) ─────────────────────────────────────────────────────
function FolderDetail({ folderId, onBack, onFolderChanged }) {
    const { getToken } = useAuth();
    const [folder, setFolder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploads, setUploads] = useState([]);       // [{ name, pct }]
    const [preview, setPreview] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [renaming, setRenaming] = useState(false);
    const fileInput = useRef(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/api/datasets/${folderId}`, { headers: { Authorization: `Bearer ${await getToken()}` } });
            setFolder(data.folder);
        } catch { toast.error("Failed to load folder"); }
        finally { setLoading(false); }
    }, [folderId, getToken]);

    useEffect(() => { load(); }, [load]);

    const doUpload = async (fileList) => {
        const files = Array.from(fileList || []).slice(0, 20);
        if (!files.length) return;
        const tooBig = files.find((f) => f.size > 25 * 1024 * 1024);
        if (tooBig) { toast.error(`"${tooBig.name}" is over 25 MB`); return; }

        const fd = new FormData();
        files.forEach((f) => fd.append("files", f));
        const tag = { name: files.length === 1 ? files[0].name : `${files.length} files`, pct: 0 };
        setUploads((u) => [...u, tag]);
        try {
            const { data } = await api.post(`/api/datasets/${folderId}/files`, fd, {
                headers: { Authorization: `Bearer ${await getToken()}` },
                onUploadProgress: (e) => {
                    const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
                    setUploads((u) => u.map((x) => (x === tag ? { ...x, pct } : x)));
                },
            });
            setFolder((prev) => prev && { ...prev, files: [...data.files, ...prev.files], fileCount: (prev.fileCount || 0) + data.files.length });
            onFolderChanged?.();
            toast.success(`${data.files.length} file${data.files.length !== 1 ? "s" : ""} uploaded`);
        } catch (err) {
            toast.error(err?.response?.data?.message || "Upload failed");
        } finally {
            setUploads((u) => u.filter((x) => x !== tag));
        }
    };

    const deleteFile = async (file) => {
        try {
            await api.delete(`/api/datasets/${folderId}/files/${file.id}`, { headers: { Authorization: `Bearer ${await getToken()}` } });
            setFolder((prev) => prev && { ...prev, files: prev.files.filter((f) => f.id !== file.id), fileCount: Math.max(0, (prev.fileCount || 1) - 1) });
            onFolderChanged?.();
            toast.success("File deleted");
        } catch { toast.error("Failed to delete"); }
    };

    const saveRename = async ({ name, description }) => {
        const { data } = await api.patch(`/api/datasets/${folderId}`, { name, description }, { headers: { Authorization: `Bearer ${await getToken()}` } });
        setFolder((prev) => ({ ...prev, ...data.folder }));
        onFolderChanged?.();
    };

    return (
        <div className="max-w-5xl space-y-5">
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-2 -ml-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"><ArrowLeft size={18} /></button>
                <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-white truncate flex items-center gap-2">
                        <Folder size={18} className="text-blue-500 shrink-0" />
                        {folder?.name || "…"}
                    </h2>
                    {folder?.description && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{folder.description}</p>}
                </div>
                <button onClick={() => setRenaming(true)} className="p-2 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30" title="Rename"><Pencil size={15} /></button>
                {folder?.files?.length > 0 && (
                    <button onClick={() => copyLink(folder.files.map((f) => f.url).join("\n"))} className="hidden sm:inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800" title="Copy all links">
                        <Copy size={13} /> Copy all
                    </button>
                )}
            </div>

            {/* Dropzone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); doUpload(e.dataTransfer.files); }}
                onClick={() => fileInput.current?.click()}
                className={`rounded-2xl border-2 border-dashed px-5 py-8 text-center cursor-pointer transition ${
                    dragging ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" : "border-zinc-300 dark:border-zinc-700 hover:border-blue-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                }`}
            >
                <input ref={fileInput} type="file" multiple hidden onChange={(e) => { doUpload(e.target.files); e.target.value = ""; }} />
                <UploadCloud size={26} className="mx-auto text-blue-500 mb-2" />
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Drop files here or tap to upload</p>
                <p className="text-[11px] text-zinc-400 mt-1">PDF, Excel, CSV, Word, images… up to 25 MB each, 20 at a time</p>
            </div>

            {uploads.map((u, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                    <Loader2 size={15} className="animate-spin text-blue-500 shrink-0" />
                    <span className="text-xs text-blue-700 dark:text-blue-300 flex-1 truncate">Uploading {u.name}…</span>
                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">{u.pct}%</span>
                </div>
            ))}

            {/* Files */}
            {loading ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />)}</div>
            ) : folder?.files?.length ? (
                <div className="space-y-2">
                    {folder.files.map((f) => (
                        <FileRow key={f.id} file={f} canDelete onPreview={setPreview} onDelete={deleteFile} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-14 text-zinc-400">
                    <Folder size={30} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No files yet — upload some above.</p>
                </div>
            )}

            {preview && <FilePreviewModal file={preview} onClose={() => setPreview(null)} />}
            {renaming && <FolderModal initial={folder} onClose={() => setRenaming(false)} onSave={saveRename} />}
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DatasetStorage() {
    const { user, getToken } = useAuth();
    const isAdmin = user?.role === "ADMIN";

    const [folders, setFolders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [openId, setOpenId] = useState(null);
    const [search, setSearch] = useState("");
    const [menuFor, setMenuFor] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/api/datasets`, {
                headers: { Authorization: `Bearer ${await getToken()}` },
            });
            setFolders(data.folders || []);
        } catch { toast.error("Failed to load folders"); }
        finally { setLoading(false); }
    }, [getToken]);

    useEffect(() => { load(); }, [load]);

    const createFolder = async ({ name, description }) => {
        const { data } = await api.post(`/api/datasets`, { name, description }, { headers: { Authorization: `Bearer ${await getToken()}` } });
        setFolders((f) => [data.folder, ...f]);
        toast.success("Folder created");
    };

    const deleteFolder = async (folder) => {
        if (!confirm(`Delete "${folder.name}" and all its files? This cannot be undone.`)) return;
        try {
            await api.delete(`/api/datasets/${folder.id}`, { headers: { Authorization: `Bearer ${await getToken()}` } });
            setFolders((f) => f.filter((x) => x.id !== folder.id));
            toast.success("Folder deleted");
        } catch { toast.error("Failed to delete folder"); }
        setMenuFor(null);
    };

    if (!isAdmin) {
        return <div className="max-w-md mx-auto text-center py-20 text-zinc-500">Dataset Storage is available to admins only.</div>;
    }

    if (openId) {
        return <FolderDetail folderId={openId} onBack={() => { setOpenId(null); load(); }} onFolderChanged={load} />;
    }

    const filtered = folders.filter((f) => !search || f.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="max-w-5xl space-y-5" onClick={() => setMenuFor(null)}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <Database size={20} className="text-blue-500" /> Dataset Storage
                    </h1>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Shared across all workspaces · {loading ? "loading…" : `${folders.length} folder${folders.length !== 1 ? "s" : ""}`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative flex-1 sm:w-48">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search folders…"
                            className="w-full h-9 pl-8 pr-3 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                    </div>
                    <button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 px-4 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shrink-0">
                        <FolderPlus size={15} /> New
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {[...Array(6)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-zinc-400">
                    <Database size={30} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">{folders.length === 0 ? "No folders yet — create one to start uploading datasets." : "No folders match your search."}</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {filtered.map((folder) => (
                        <div key={folder.id} className="group relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-md transition cursor-pointer"
                            onClick={() => setOpenId(folder.id)}>
                            <div className="flex items-start justify-between">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
                                    <Folder size={20} className="text-blue-500" />
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === folder.id ? null : folder.id); }}
                                    className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition">
                                    <MoreVertical size={15} />
                                </button>
                            </div>
                            <p className="mt-3 text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">{folder.name}</p>
                            <p className="text-[11px] text-zinc-400 mt-0.5">{folder.fileCount} file{folder.fileCount !== 1 ? "s" : ""}</p>

                            {menuFor === folder.id && (
                                <div className="absolute right-3 top-12 z-20 w-36 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg py-1" onClick={(e) => e.stopPropagation()}>
                                    <button onClick={() => deleteFolder(folder)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30">
                                        <Trash2 size={14} /> Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {creating && <FolderModal onClose={() => setCreating(false)} onSave={createFolder} />}
        </div>
    );
}
