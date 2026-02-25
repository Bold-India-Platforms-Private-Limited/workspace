import { format } from "date-fns";
import { toIST } from "../configs/timezone";
import { useDispatch } from "react-redux";
import { Save, Trash } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { fetchWorkspaces } from "../features/workspaceSlice";
import api from "../configs/api";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import RichTextInput from "./RichTextInput";

export default function ProjectSettings({ project }) {
    
    const dispatch = useDispatch();
    const { getToken } = useAuth();
    const navigate = useNavigate();
    const currentWorkspace = useSelector((state) => state.workspace?.currentWorkspace || null);

    const [formData, setFormData] = useState({
        name: "New Website Launch",
        description: "Initial launch for new web platform.",
        status: "PLANNING",
        priority: "MEDIUM",
        start_date: "2025-09-10",
        end_date: "2025-10-15",
        progress: 30,
        groupIds: [],
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showFullDescription, setShowFullDescription] = useState(false);
    const [groupQuery, setGroupQuery] = useState("");

    const allGroups = currentWorkspace?.groups || [];
    const filteredGroups = useMemo(
        () => allGroups.filter((g) => g.name?.toLowerCase().includes(groupQuery.toLowerCase())),
        [allGroups, groupQuery]
    );
    const selectedGroups = useMemo(
        () => allGroups.filter((g) => formData.groupIds.includes(g.id)),
        [allGroups, formData.groupIds]
    );

    const toggleGroup = useCallback((groupId) => {
        setFormData((prev) => ({
            ...prev,
            groupIds: prev.groupIds.includes(groupId)
                ? prev.groupIds.filter((id) => id !== groupId)
                : prev.groupIds.concat(groupId),
        }));
    }, []);

    const toggleSelectAll = useCallback(() => {
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
    }, [filteredGroups, formData.groupIds]);

    const descriptionHtml = useMemo(() => {
        if (!formData.description) return "";
        const hasHtmlTags = /<\/?[a-z][\s\S]*>/i.test(formData.description);
        return hasHtmlTags ? formData.description : formData.description.replace(/\n/g, "<br />");
    }, [formData.description]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        toast.loading("Saving...");
        try {
            const { data } = await api.put(`/api/projects`, formData, { headers: { Authorization: `Bearer ${await getToken()}` } });
            dispatch(fetchWorkspaces({ getToken }));
            toast.dismissAll();
            toast.success(data.message);
        } catch (error) {
            toast.dismissAll();
            toast.error(error?.response?.data?.message || error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (project) {
            setFormData({
                ...project,
                groupIds: project.groups?.map((g) => g.groupId || g.group?.id) || [],
            });
        }
    }, [project]);

    const inputClasses = "w-full px-3 py-2 rounded mt-2 border text-sm dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-300";

    const cardClasses = "rounded-lg border p-6 not-dark:bg-white dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border-zinc-300 dark:border-zinc-800";

    const labelClasses = "text-sm text-zinc-600 dark:text-zinc-400";

    const handleDeleteProject = async () => {
        if (!project?.id || !currentWorkspace?.id) return;
        const confirm = window.confirm("Are you sure you want to delete this project and all its tasks?");
        if (!confirm) return;
        try {
            toast.loading("Deleting project...");
            await api.delete(`/api/projects/${project.id}`, { headers: { Authorization: `Bearer ${await getToken()}` } });
            dispatch(fetchWorkspaces({ getToken }));
            toast.dismissAll();
            toast.success("Project deleted");
            navigate("/projects");
        } catch (error) {
            toast.dismissAll();
            toast.error(error?.response?.data?.message || error.message);
        }
    };

    return (
        <div className="grid lg:grid-cols-2 gap-8">
            {/* Project Details */}
            <div className={cardClasses}>
                <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-300 mb-4">Project Details</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name */}
                    <div className="space-y-2">
                        <label className={labelClasses}>Project Name</label>
                        <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputClasses} required />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className={labelClasses}>Description</label>
                        {formData.description && (
                            <div className="description-content text-sm text-zinc-600 dark:text-white">
                                <div
                                    className={`${showFullDescription ? "" : "line-clamp-3"} whitespace-pre-wrap`}
                                    dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowFullDescription((prev) => !prev)}
                                    className="mt-1 text-xs text-blue-600 dark:text-blue-400"
                                >
                                    {showFullDescription ? "Show less" : "...more"}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Status & Priority */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className={labelClasses}>Status</label>
                            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className={inputClasses} >
                                <option value="PLANNING">Planning</option>
                                <option value="ACTIVE">Active</option>
                                <option value="ON_HOLD">On Hold</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className={labelClasses}>Priority</label>
                            <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className={inputClasses} >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                            </select>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-4 grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className={labelClasses}>Start Date</label>
                            <input type="date" value={format(toIST(formData.start_date), "yyyy-MM-dd")} onChange={(e) => setFormData({ ...formData, start_date: new Date(e.target.value) })} className={inputClasses} />
                        </div>
                        <div className="space-y-2">
                            <label className={labelClasses}>End Date</label>
                            <input type="date" value={format(toIST(formData.end_date), "yyyy-MM-dd")} onChange={(e) => setFormData({ ...formData, end_date: new Date(e.target.value) })} className={inputClasses} />
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-2">
                        <label className={labelClasses}>Progress: {formData.progress}%</label>
                        <input type="range" min="0" max="100" step="5" value={formData.progress} onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })} className="w-full accent-blue-500 dark:accent-blue-400" />
                    </div>

                    {/* Save Button */}
                    <button type="submit" disabled={isSubmitting} className="ml-auto flex items-center text-sm justify-center gap-2 bg-gradient-to-br from-blue-500 to-blue-600 text-white px-4 py-2 rounded" >
                        <Save className="size-4" /> {isSubmitting ? "Saving..." : "Save Changes"}
                    </button>
                </form>
            </div>

            {/* Assign Groups */}
            <div className="space-y-6">
                <div className={cardClasses}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-300">Assign Groups</h2>
                        <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                            <input
                                type="checkbox"
                                onChange={toggleSelectAll}
                                checked={filteredGroups.length > 0 && filteredGroups.every((g) => formData.groupIds.includes(g.id))}
                            />
                            <span>Select all</span>
                        </div>
                    </div>
                    <input
                        value={groupQuery}
                        onChange={(e) => setGroupQuery(e.target.value)}
                        placeholder="Search groups..."
                        className={inputClasses + " mb-3"}
                    />
                    <div className="border border-zinc-300 dark:border-zinc-700 rounded p-3 max-h-48 overflow-auto space-y-1">
                        {filteredGroups.length > 0 ? filteredGroups.map((group) => (
                            <label key={group.id} className="flex items-center gap-2 py-1 text-sm">
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
                        <div className="flex flex-wrap gap-2 mt-3">
                            {selectedGroups.map((group) => (
                                <button
                                    key={group.id}
                                    type="button"
                                    onClick={() => toggleGroup(group.id)}
                                    className="text-xs px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                                >
                                    {group.name} ×
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className={cardClasses}>
                    <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-300 mb-2">Danger Zone</h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                        Deleting a project removes all its tasks permanently.
                    </p>
                    <button
                        type="button"
                        onClick={handleDeleteProject}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm"
                    >
                        <Trash className="size-4" /> Delete Project
                    </button>
                </div>
            </div>
        </div>
    );
}
