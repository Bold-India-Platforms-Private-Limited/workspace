import { useEffect, useMemo, useState } from "react";
import { XIcon } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useDispatch, useSelector } from "react-redux";
import { addProject } from "../features/workspaceSlice";
import toast from "react-hot-toast";
import api from "../configs/api";
import QuillEditor from "./QuillEditor";

// ── Shared sub-components ─────────────────────────────────────────────────────
function DescriptionTypeToggle({ isHtml, onChange }) {
    return (
        <div className="inline-flex items-center rounded-lg border border-zinc-300 dark:border-zinc-700 overflow-hidden text-xs font-semibold">
            <button type="button" onClick={() => onChange("text")}
                className={`px-3 py-1.5 transition-colors ${!isHtml ? "bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900" : "bg-white dark:bg-zinc-900 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}>
                Text
            </button>
            <button type="button" onClick={() => onChange("html")}
                className={`px-3 py-1.5 transition-colors ${isHtml ? "bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900" : "bg-white dark:bg-zinc-900 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}>
                HTML
            </button>
        </div>
    );
}

function HtmlDescriptionEditor({ formData, setFormData, htmlPreview, setHtmlPreview }) {
    return (
        <div className="space-y-2">
            {/* Code / Preview tab strip */}
            <div className="flex gap-1">
                {["Code", "Preview"].map(tab => (
                    <button key={tab} type="button"
                        onClick={() => setHtmlPreview(tab === "Preview")}
                        className={`text-xs px-3 py-1 rounded font-medium transition-colors ${(tab === "Preview") === htmlPreview ? "bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}>
                        {tab}
                    </button>
                ))}
            </div>
            {!htmlPreview
                ? <textarea
                    value={formData.description}
                    onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                    placeholder={"<!DOCTYPE html>\n<html>\n<body>\n  <h1>Project Overview</h1>\n</body>\n</html>"}
                    rows={14}
                    spellCheck={false}
                    className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-950 text-green-400 font-mono text-xs px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                  />
                : <iframe
                    srcDoc={formData.description}
                    title="HTML Preview"
                    sandbox="allow-scripts"
                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded bg-white"
                    style={{ height: 320 }}
                  />
            }
            <p className="text-xs text-zinc-400">Full HTML page supported — users will see it rendered in a scrollable viewer.</p>
        </div>
    );
}

const CreateProjectDialog = ({ isDialogOpen, setIsDialogOpen }) => {

    const dispatch = useDispatch();
    const { getToken } = useAuth();
    const { currentWorkspace } = useSelector((state) => state.workspace);

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        descriptionType: "text",
        status: "PLANNING",
        priority: "MEDIUM",
        start_date: "",
        end_date: "",
        groupIds: [],
        progress: 0,
    });
    const [htmlPreview, setHtmlPreview] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [groupQuery, setGroupQuery] = useState("");
    const [isDesktop, setIsDesktop] = useState(
        typeof window !== "undefined" ? window.innerWidth >= 1024 : true
    );

    const allGroups = currentWorkspace?.groups || [];
    const filteredGroups = useMemo(
        () => allGroups.filter((g) => g.name?.toLowerCase().includes(groupQuery.toLowerCase())),
        [allGroups, groupQuery]
    );

    const selectedGroups = useMemo(
        () => allGroups.filter((g) => formData.groupIds.includes(g.id)),
        [allGroups, formData.groupIds]
    );

    useEffect(() => {
        const media = window.matchMedia("(min-width: 1024px)");
        const handler = (e) => setIsDesktop(e.matches);
        handler(media);
        media.addEventListener("change", handler);
        return () => media.removeEventListener("change", handler);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const { data } = await api.post("/api/projects", { workspaceId: currentWorkspace.id, ...formData }, { headers: { Authorization: `Bearer ${await getToken()}` } });
            dispatch(addProject(data.project));
            setIsDialogOpen(false);
        } catch (error) {
            toast.error(error?.response?.data?.message || error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleGroup = (groupId) => {
        setFormData((prev) => {
            const exists = prev.groupIds.includes(groupId);
            return { ...prev, groupIds: exists ? prev.groupIds.filter((id) => id !== groupId) : prev.groupIds.concat(groupId) };
        });
    };

    const toggleSelectAll = () => {
        const filteredIds = filteredGroups.map((g) => g.id);
        const allSelected = filteredIds.every((id) => formData.groupIds.includes(id));
        setFormData((prev) => {
            const next = new Set(prev.groupIds);
            filteredIds.forEach((id) => {
                if (allSelected) next.delete(id);
                else next.add(id);
            });
            return { ...prev, groupIds: Array.from(next) };
        });
    };

    const quillModules = {
        toolbar: [
            [{ font: [] }, { size: [] }],
            ["bold", "italic", "underline", "strike"],
            ["blockquote", "code-block"],
            [{ header: 1 }, { header: 2 }, { header: 3 }, { header: 4 }, { header: 5 }, { header: 6 }],
            [{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
            [{ script: "sub" }, { script: "super" }],
            [{ indent: "-1" }, { indent: "+1" }],
            [{ direction: "rtl" }],
            [{ align: [] }],
            [{ color: [] }, { background: [] }],
            ["link", "image", "video", "formula"],
            ["clean"],
        ],
    };

    const quillFormats = [
        "font",
        "size",
        "bold",
        "italic",
        "underline",
        "strike",
        "blockquote",
        "code-block",
        "header",
        "list",
        "bullet",
        "check",
        "script",
        "indent",
        "direction",
        "align",
        "color",
        "background",
        "link",
        "image",
        "video",
        "formula",
    ];

    const isHtml = formData.descriptionType === "html";

    if (!isDialogOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur z-50">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 w-full h-full text-zinc-900 dark:text-zinc-200 flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                    <div>
                        <h2 className="text-xl font-medium">Create New Project</h2>
                        {currentWorkspace && (
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                In workspace: <span className="text-blue-600 dark:text-blue-400">{currentWorkspace.name}</span>
                            </p>
                        )}
                    </div>
                    <button className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200" onClick={() => setIsDialogOpen(false)} >
                        <XIcon className="size-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-hidden">
                    <div className="h-full grid grid-cols-1 lg:grid-cols-[7fr_3fr]">
                        <div className="h-full overflow-y-auto p-6 space-y-6">
                            <div>
                                <label className="block text-sm mb-1">Project Name</label>
                                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enter project name" className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm" required />
                            </div>

                            {!isDesktop && (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm">Description</label>
                                        <DescriptionTypeToggle isHtml={isHtml} onChange={(t) => { setFormData(f => ({ ...f, descriptionType: t, description: "" })); setHtmlPreview(false); }} />
                                    </div>
                                    {isHtml
                                        ? <HtmlDescriptionEditor formData={formData} setFormData={setFormData} htmlPreview={htmlPreview} setHtmlPreview={setHtmlPreview} />
                                        : <div className="rounded border border-zinc-300 dark:border-zinc-700 overflow-hidden">
                                            <QuillEditor value={formData.description} onChange={(html) => setFormData(f => ({ ...f, description: html }))} modules={quillModules} formats={quillFormats} />
                                          </div>
                                    }
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm mb-1">Status</label>
                                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm" >
                                        <option value="PLANNING">Planning</option>
                                        <option value="ACTIVE">Active</option>
                                        <option value="COMPLETED">Completed</option>
                                        <option value="ON_HOLD">On Hold</option>
                                        <option value="CANCELLED">Cancelled</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm mb-1">Priority</label>
                                    <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm" >
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm mb-1">Start Date</label>
                                    <input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm mb-1">End Date</label>
                                    <input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} min={formData.start_date && new Date(formData.start_date).toISOString().split('T')[0]} className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm" />
                                </div>
                            </div>

                            <div className="border border-zinc-300 dark:border-zinc-700 rounded-lg p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium">Assign Groups</label>
                                    <div className="flex items-center gap-2 text-xs">
                                        <input type="checkbox" onChange={toggleSelectAll} checked={filteredGroups.length > 0 && filteredGroups.every((g) => formData.groupIds.includes(g.id))} />
                                        <span>Select all</span>
                                    </div>
                                </div>
                                <input
                                    value={groupQuery}
                                    onChange={(e) => setGroupQuery(e.target.value)}
                                    placeholder="Search groups"
                                    className="w-full rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 px-3 py-2 text-sm"
                                />
                                <div className="max-h-52 overflow-auto space-y-2">
                                    {filteredGroups.length > 0 ? filteredGroups.map((group) => (
                                        <label key={group.id} className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={formData.groupIds.includes(group.id)}
                                                onChange={() => toggleGroup(group.id)}
                                            />
                                            <span>{group.name}</span>
                                        </label>
                                    )) : (
                                        <div className="text-xs text-zinc-500">No groups found</div>
                                    )}
                                </div>
                                {selectedGroups.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {selectedGroups.map((group) => (
                                            <button
                                                key={group.id}
                                                type="button"
                                                onClick={() => toggleGroup(group.id)}
                                                className="text-xs px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-700"
                                            >
                                                {group.name} ×
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-2 text-sm">
                                <button type="button" onClick={() => setIsDialogOpen(false)} className="px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800" >
                                    Cancel
                                </button>
                                <button disabled={isSubmitting || !currentWorkspace} className="px-4 py-2 rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white dark:text-zinc-200" >
                                    {isSubmitting ? "Creating..." : "Create Project"}
                                </button>
                            </div>
                        </div>

                        {isDesktop && (
                            <div className="h-full border-t lg:border-t-0 lg:border-l border-zinc-200 dark:border-zinc-800 p-6 overflow-y-auto">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm">Description</label>
                                    <DescriptionTypeToggle isHtml={isHtml} onChange={(t) => { setFormData(f => ({ ...f, descriptionType: t, description: "" })); setHtmlPreview(false); }} />
                                </div>
                                {isHtml
                                    ? <HtmlDescriptionEditor formData={formData} setFormData={setFormData} htmlPreview={htmlPreview} setHtmlPreview={setHtmlPreview} />
                                    : <div className="rounded border border-zinc-300 dark:border-zinc-700 overflow-hidden">
                                        <QuillEditor value={formData.description} onChange={(html) => setFormData(f => ({ ...f, description: html }))} modules={quillModules} formats={quillFormats} />
                                      </div>
                                }
                            </div>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateProjectDialog;