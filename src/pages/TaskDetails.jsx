import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { CalendarIcon, PenIcon } from "lucide-react";
import { useSelector } from "react-redux";
import { useAuth } from "../auth/AuthContext";
import DOMPurify from "dompurify";

const TaskDetails = () => {
    const [searchParams] = useSearchParams();
    const projectId = searchParams.get("projectId");
    const taskId = searchParams.get("taskId");

    const [task, setTask] = useState(null);
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);

    const { currentWorkspace } = useSelector((state) => state.workspace);
    const { user } = useAuth();
    const isMember = user?.role !== "ADMIN";

    const userGroupIds = useMemo(() => {
        if (!user?.id || !currentWorkspace) return new Set();
        return new Set(
            (currentWorkspace.groups || [])
                .filter((group) => group.members?.some((m) => m.userId === user.id))
                .map((group) => group.id)
        );
    }, [currentWorkspace, user]);

    const userGroupMemberIds = useMemo(() => {
        if (!isMember || !currentWorkspace) return null;
        const ids = new Set();
        (currentWorkspace.groups || [])
            .filter((group) => userGroupIds.has(group.id))
            .forEach((group) => (group.members || []).forEach((m) => ids.add(m.userId)));
        return ids;
    }, [isMember, currentWorkspace, userGroupIds]);

    const filterAssignees = (assignees) => {
        if (!isMember || !userGroupMemberIds) return assignees || [];
        return (assignees || []).filter((a) => userGroupMemberIds.has(a.userId));
    };

    const filterTaskGroups = (taskGroups) => {
        if (!isMember) return taskGroups || [];
        return (taskGroups || []).filter((g) => userGroupIds.has(g.groupId || g.group?.id));
    };

    const fetchTaskDetails = async () => {
        setLoading(true);
        if (!projectId || !taskId) return;

        const proj = currentWorkspace.projects.find((p) => p.id === projectId);
        if (!proj) return;

        const tsk = proj.tasks.find((t) => t.id === taskId);
        if (!tsk) return;

        setTask(tsk);
        setProject(proj);
        setLoading(false);
    };

    useEffect(() => { fetchTaskDetails(); }, [taskId]);

    if (loading) return <div className="text-gray-500 dark:text-zinc-400 px-4 py-6">Loading task details...</div>;
    if (!task) return <div className="text-red-500 px-4 py-6">Task not found.</div>;

    const rawDescription = task?.description || "";
    const hasHtmlTags = /<\s*\/?[a-z][\s\S]*>/i.test(rawDescription);
    const descriptionHtml = rawDescription
        ? DOMPurify.sanitize(hasHtmlTags ? rawDescription : rawDescription.replace(/\n/g, "<br />"), {
            ALLOWED_TAGS: ["p", "b", "i", "u", "strong", "em", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote", "code", "pre", "span", "div", "br"],
            ALLOWED_ATTR: ["style", "class", "align"],
            ALLOW_STYLE: true,
        })
        : "";

    const getInitials = (nameOrEmail = "") => {
        const value = String(nameOrEmail).trim();
        if (!value) return "U";
        const parts = value.split(/\s+/).filter(Boolean);
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    return (
        <div className="flex flex-col gap-6 sm:p-4 text-gray-900 dark:text-zinc-100 max-w-6xl mx-auto">
            {/* Task + Project Info */}
            <div className="w-full flex flex-col gap-6">
                {/* Task Info */}
                <div className="p-5 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 ">
                    <div className="mb-3">
                        <h1 className="text-lg font-medium text-gray-900 dark:text-zinc-100">{task.title}</h1>
                        <div className="flex flex-wrap gap-2 mt-2">
                            <span className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-300 text-xs">
                                {task.status}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-300 text-xs">
                                {task.type}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-green-200 dark:bg-emerald-900 text-green-900 dark:text-emerald-300 text-xs">
                                {task.priority}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700 dark:text-zinc-300 mb-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">Assigned to</span>
                            {(() => {
                                const displayAssignees = filterAssignees(task.assignees);
                                return displayAssignees.length > 0 ? (
                                    displayAssignees.map((a) => (
                                        <span key={a.id} className="flex items-center gap-2 px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-800 text-xs">
                                            {a.user?.image ? (
                                                <img src={a.user.image} className="size-5 rounded-full object-cover" alt="avatar" />
                                            ) : (
                                                <span className="size-5 rounded-full bg-zinc-300 dark:bg-zinc-700 text-[9px] font-semibold text-zinc-700 dark:text-zinc-200 flex items-center justify-center">
                                                    {getInitials(a.user?.name || a.user?.email)}
                                                </span>
                                            )}
                                            {a.user?.name || a.user?.email}
                                        </span>
                                    ))
                                ) : (
                                    <span>Unassigned</span>
                                );
                            })()}
                        </div>
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="size-4 text-gray-500 dark:text-zinc-500" />
                            Due : {format(new Date(task.due_date), "dd MMM yyyy")}
                        </div>
                    </div>

                    {task.description && (
                        <div
                            className="description-content text-sm text-gray-600 dark:text-white leading-relaxed break-words"
                            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                        />
                    )}
                </div>

                {/* Project Info */}
                {project && (
                    <div className="p-4 rounded-md bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 border border-gray-300 dark:border-zinc-800 ">
                        <p className="text-xl font-medium mb-4">Project Details</p>
                        <h2 className="text-gray-900 dark:text-zinc-100 flex items-center gap-2"> <PenIcon className="size-4" /> {project.name}</h2>
                        <p className="text-xs mt-3">Project Start Date: {format(new Date(project.start_date), "dd MMM yyyy")}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-zinc-400 mt-3">
                            <span>Status: {project.status}</span>
                            <span>Priority: {project.priority}</span>
                            <span>Progress: {project.progress}%</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TaskDetails;
