import { useEffect, useMemo, useState } from "react";
import { Calendar as CalendarIcon, XIcon } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { addTask } from "../features/workspaceSlice";
import { useAuth } from "../auth/AuthContext";
import { format } from "date-fns";
import toast from "react-hot-toast";
import api from "../configs/api";
import QuillEditor from "./QuillEditor";

export default function CreateTaskDialog({ showCreateTask, setShowCreateTask, projectId }) {
    const { getToken } = useAuth();
    const dispatch = useDispatch();
    const currentWorkspace = useSelector((state) => state.workspace?.currentWorkspace || null);
    const project = currentWorkspace?.projects.find((p) => p.id === projectId);
    const projectGroupIds = useMemo(
        () => project?.groups?.map((g) => g.groupId || g.group?.id).filter(Boolean) || [],
        [project]
    );
    const availableGroups = useMemo(
        () => (currentWorkspace?.groups || []).filter((g) => projectGroupIds.includes(g.id)),
        [currentWorkspace, projectGroupIds]
    );
    const groupMap = useMemo(
        () => new Map(availableGroups.map((g) => [g.id, g])),
        [availableGroups]
    );

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [groupQuery, setGroupQuery] = useState("");
    const [activeGroupId, setActiveGroupId] = useState(null);
    const [memberQuery, setMemberQuery] = useState("");
    const [groupMemberSelections, setGroupMemberSelections] = useState({});
    const [isDesktop, setIsDesktop] = useState(
        typeof window !== "undefined" ? window.innerWidth >= 1024 : true
    );
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        type: "TASK",
        status: "TODO",
        priority: "MEDIUM",
        due_date: "",
        groupIds: [],
    });
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const assigneeIds = Array.from(
                new Set(
                    formData.groupIds.flatMap((groupId) => groupMemberSelections[groupId] || [])
                )
            );

            const { data } = await api.post(
                "/api/tasks",
                { ...formData, workspaceId: currentWorkspace.id, projectId, assigneeIds },
                { headers: { Authorization: `Bearer ${await getToken()}` } }
            );
            setShowCreateTask(false);
            setFormData({
                title: "",
                description: "",
                type: "TASK",
                status: "TODO",
                priority: "MEDIUM",
                due_date: "",
                groupIds: [],
            });
            setGroupMemberSelections({});
            toast.success(data.message);
            dispatch(addTask(data.task));
        } catch (error) {
            toast.error(error?.response?.data?.message || error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredGroups = useMemo(
        () => availableGroups.filter((g) => g.name?.toLowerCase().includes(groupQuery.toLowerCase())),
        [availableGroups, groupQuery]
    );

    const selectedGroups = useMemo(
        () => availableGroups.filter((g) => formData.groupIds.includes(g.id)),
        [availableGroups, formData.groupIds]
    );

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

    useEffect(() => {
        setGroupMemberSelections((prev) => {
            const next = { ...prev };
            let changed = false;

            formData.groupIds.forEach((groupId) => {
                if (!next[groupId]) {
                    const group = groupMap.get(groupId);
                    next[groupId] = (group?.members || []).map((m) => m.userId);
                    changed = true;
                }
            });

            Object.keys(next).forEach((groupId) => {
                if (!formData.groupIds.includes(groupId)) {
                    delete next[groupId];
                    changed = true;
                }
            });

            return changed ? next : prev;
        });
    }, [formData.groupIds, groupMap]);

    useEffect(() => {
        if (!activeGroupId) return;
        setGroupMemberSelections((prev) => {
            if (prev[activeGroupId]) return prev;
            const group = groupMap.get(activeGroupId);
            const members = (group?.members || []).map((m) => m.userId);
            return { ...prev, [activeGroupId]: members };
        });
    }, [activeGroupId, groupMap]);

    useEffect(() => {
        const media = window.matchMedia("(min-width: 1024px)");
        const handler = (e) => setIsDesktop(e.matches);
        handler(media);
        media.addEventListener("change", handler);
        return () => media.removeEventListener("change", handler);
    }, []);

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

    return showCreateTask ? (
        <div className="fixed inset-0 z-50 bg-black/20 dark:bg-black/60 backdrop-blur">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 w-full h-full text-zinc-900 dark:text-white flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                    <h2 className="text-xl font-bold">Create New Task</h2>
                    <button onClick={() => setShowCreateTask(false)} className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        <XIcon className="size-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-hidden">
                    <div className="h-full grid grid-cols-1 lg:grid-cols-[7fr_3fr]">
                        <div className="h-full overflow-y-auto p-6 space-y-6">
                            <div className="space-y-1">
                                <label htmlFor="title" className="text-sm font-medium">Title</label>
                                <input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Task title" className="w-full rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-zinc-900 dark:text-zinc-200 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                            </div>

                            {!isDesktop && (
                                <><label className="block text-sm mb-2">Description</label><div className="rounded border border-zinc-300 dark:border-zinc-700 overflow-hidden">
                                    <QuillEditor
                                        value={formData.description}
                                        onChange={(html) => setFormData({ ...formData, description: html })}
                                        modules={quillModules}
                                        formats={quillFormats} />
                                </div></>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Type</label>
                                    <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-zinc-900 dark:text-zinc-200 text-sm mt-1" >
                                        <option value="BUG">Bug</option>
                                        <option value="FEATURE">Feature</option>
                                        <option value="TASK">Task</option>
                                        <option value="IMPROVEMENT">Improvement</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Priority</label>
                                    <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="w-full rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-zinc-900 dark:text-zinc-200 text-sm mt-1"                             >
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Status</label>
                                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-zinc-900 dark:text-zinc-200 text-sm mt-1" >
                                        <option value="TODO">To Do</option>
                                        <option value="IN_PROGRESS">In Progress</option>
                                        <option value="DONE">Done</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Due Date</label>
                                    <div className="flex items-center gap-2">
                                        <CalendarIcon className="size-5 text-zinc-500 dark:text-zinc-400" />
                                        <input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} min={new Date().toISOString().split('T')[0]} className="w-full rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-zinc-900 dark:text-zinc-200 text-sm mt-1" />
                                    </div>
                                    {formData.due_date && (
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                            {format(new Date(formData.due_date), "PPP")}
                                        </p>
                                    )}
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
                                        <div key={group.id} className="flex items-center justify-between gap-2 text-sm">
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.groupIds.includes(group.id)}
                                                    onChange={() => toggleGroup(group.id)}
                                                />
                                                <span>{group.name}</span>
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setActiveGroupId(group.id)}
                                                className="text-xs text-blue-600 dark:text-blue-400"
                                            >
                                                Members
                                            </button>
                                        </div>
                                    )) : (
                                        <div className="text-xs text-zinc-500">No groups available</div>
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

                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setShowCreateTask(false)} className="rounded border border-zinc-300 dark:border-zinc-700 px-5 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition" >
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSubmitting} className="rounded px-5 py-2 text-sm bg-gradient-to-br from-blue-500 to-blue-600 hover:opacity-90 text-white dark:text-zinc-200 transition" >
                                    {isSubmitting ? "Creating..." : "Create Task"}
                                </button>
                            </div>
                        </div>

                        {isDesktop && (
                            <div className="h-full border-t lg:border-t-0 lg:border-l border-zinc-200 dark:border-zinc-800 p-6 overflow-y-auto">
                                <label className="block text-sm mb-2">Description</label>
                                <div className="rounded border border-zinc-300 dark:border-zinc-700 overflow-hidden">
                                    <QuillEditor
                                        value={formData.description}
                                        onChange={(html) => setFormData({ ...formData, description: html })}
                                        modules={quillModules}
                                        formats={quillFormats}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </form>
            </div>

            {activeGroupId && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur flex items-center justify-center" onClick={() => setActiveGroupId(null)}>
                    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold">Select Members</h3>
                            <button onClick={() => setActiveGroupId(null)} className="text-xs text-zinc-500">Close</button>
                        </div>
                        <input
                            value={memberQuery}
                            onChange={(e) => setMemberQuery(e.target.value)}
                            placeholder="Search members"
                            className="w-full rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 px-3 py-2 text-sm mb-3"
                        />
                        <div className="flex items-center gap-2 text-xs mb-2">
                            <input
                                type="checkbox"
                                onChange={() => {
                                    const members = (groupMap.get(activeGroupId)?.members || []).filter((m) =>
                                        m.user?.name?.toLowerCase().includes(memberQuery.toLowerCase()) ||
                                        m.user?.email?.toLowerCase().includes(memberQuery.toLowerCase())
                                    );
                                    const memberIds = members.map((m) => m.userId);
                                    const allSelected = memberIds.every((id) => (groupMemberSelections[activeGroupId] || []).includes(id));
                                    setGroupMemberSelections((prev) => {
                                        const next = { ...prev };
                                        const current = new Set(next[activeGroupId] || []);
                                        memberIds.forEach((id) => {
                                            if (allSelected) current.delete(id);
                                            else current.add(id);
                                        });
                                        next[activeGroupId] = Array.from(current);
                                        return next;
                                    });
                                }}
                                checked={(groupMap.get(activeGroupId)?.members || [])
                                    .filter((m) => m.user?.name?.toLowerCase().includes(memberQuery.toLowerCase()) || m.user?.email?.toLowerCase().includes(memberQuery.toLowerCase()))
                                    .every((m) => (groupMemberSelections[activeGroupId] || []).includes(m.userId))}
                            />
                            <span>Select all</span>
                        </div>
                        <div className="max-h-64 overflow-auto space-y-2">
                            {(groupMap.get(activeGroupId)?.members || [])
                                .filter((m) => m.user?.name?.toLowerCase().includes(memberQuery.toLowerCase()) || m.user?.email?.toLowerCase().includes(memberQuery.toLowerCase()))
                                .map((member) => (
                                    <label key={member.userId} className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={(groupMemberSelections[activeGroupId] || []).includes(member.userId)}
                                            onChange={() => {
                                                setGroupMemberSelections((prev) => {
                                                    const next = { ...prev };
                                                    const current = new Set(next[activeGroupId] || []);
                                                    if (current.has(member.userId)) current.delete(member.userId);
                                                    else current.add(member.userId);
                                                    next[activeGroupId] = Array.from(current);
                                                    return next;
                                                });
                                            }}
                                        />
                                        <span>{member.user?.name || member.user?.email}</span>
                                    </label>
                                ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    ) : null;
}
