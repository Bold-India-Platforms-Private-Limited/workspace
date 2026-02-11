import api from "../configs/api";
import toast from "react-hot-toast";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { toIST } from "../configs/timezone";
import { useAuth } from "../auth/AuthContext";
import { useDispatch, useSelector } from "react-redux";
import { deleteTask, updateTask } from "../features/workspaceSlice";
import { Bug, CalendarIcon, GitCommit, MessageSquare, Square, Trash, XIcon, Zap, PencilIcon, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import EditTaskDialog from "./EditTaskDialog";

const typeIcons = {
    BUG: { icon: Bug, color: "text-red-600 dark:text-red-400" },
    FEATURE: { icon: Zap, color: "text-blue-600 dark:text-blue-400" },
    TASK: { icon: Square, color: "text-green-600 dark:text-green-400" },
    IMPROVEMENT: { icon: GitCommit, color: "text-purple-600 dark:text-purple-400" },
    OTHER: { icon: MessageSquare, color: "text-amber-600 dark:text-amber-400" },
};

const priorityTexts = {
    LOW: { background: "bg-red-100 dark:bg-red-950", prioritycolor: "text-red-600 dark:text-red-400" },
    MEDIUM: { background: "bg-blue-100 dark:bg-blue-950", prioritycolor: "text-blue-600 dark:text-blue-400" },
    HIGH: { background: "bg-emerald-100 dark:bg-emerald-950", prioritycolor: "text-emerald-600 dark:text-emerald-400" },
};

const ProjectTasks = ({ tasks, groups }) => {
    const dispatch = useDispatch();
    const { getToken, user } = useAuth();
    const navigate = useNavigate();
    const [selectedTasks, setSelectedTasks] = useState([]);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [openGroupsTaskId, setOpenGroupsTaskId] = useState(null);
    const [openAssigneesTaskId, setOpenAssigneesTaskId] = useState(null);
    const currentWorkspace = useSelector((state) => state.workspace?.currentWorkspace || null);

    const [filters, setFilters] = useState({
        status: "",
        type: "",
        priority: "",
        group: "",
    });

    const userGroupIds = useMemo(() => {
        if (!currentWorkspace || !user?.id) return new Set();
        return new Set(
            (currentWorkspace.groups || [])
                .filter((group) => group.members?.some((m) => m.userId === user.id))
                .map((group) => group.id)
        );
    }, [currentWorkspace, user]);

    const visibleTasks = useMemo(() => {
        if (user?.role === "ADMIN") return tasks;
        return tasks.filter((task) => task.groups?.some((tg) => userGroupIds.has(tg.groupId || tg.group?.id)));
    }, [tasks, user, userGroupIds]);

    const isMember = user?.role !== "ADMIN";

    const filterTaskGroups = (taskGroups) => {
        if (!isMember) return taskGroups || [];
        return (taskGroups || []).filter((g) => userGroupIds.has(g.groupId || g.group?.id));
    };

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

    const groupList = useMemo(
        () => Array.from(new Set(
            visibleTasks.flatMap((t) => filterTaskGroups(t.groups).map((g) => g.group?.name).filter(Boolean))
        )),
        [visibleTasks, isMember, userGroupIds]
    );

    const filteredTasks = useMemo(() => {
        return visibleTasks.filter((task) => {
            const { status, type, priority, group } = filters;
            return (
                (!status || task.status === status) &&
                (!type || task.type === type) &&
                (!priority || task.priority === priority) &&
                (!group || task.groups?.some((g) => g.group?.name === group))
            );
        });
    }, [filters, visibleTasks]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    const handleStatusChange = async (taskId, newStatus) => {
        try {
            toast.loading("Updating status...");
            const token = await getToken();

            await api.put(`/api/tasks/${taskId}`, { status: newStatus }, { headers: { Authorization: `Bearer ${token}` } });

            let updatedTask = structuredClone(tasks.find((t) => t.id === taskId));
            updatedTask.status = newStatus;
            dispatch(updateTask(updatedTask));

            toast.dismissAll();
            toast.success("Task status updated successfully");
        } catch (error) {
            toast.dismissAll();
            toast.error(error?.response?.data?.message || error.message);
        }
    };

    const handleDelete = async () => {
        try {
            const confirm = window.confirm("Are you sure you want to delete the selected tasks?");
            if (!confirm) return;

            const token = await getToken();
            toast.loading("Deleting tasks...");

            await api.post("/api/tasks/delete", { tasksIds: selectedTasks }, { headers: { Authorization: `Bearer ${token}` } });
            dispatch(deleteTask(selectedTasks));

            toast.dismissAll();
            toast.success("Tasks deleted successfully");
        } catch (error) {
            toast.dismissAll();
            toast.error(error?.response?.data?.message || error.message);
        }
    };

    return (
        <div>
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-4">
                {["status", "type", "priority", "group"].map((name) => {
                    const options = {
                        status: [
                            { label: "All Statuses", value: "" },
                            { label: "To Do", value: "TODO" },
                            { label: "In Progress", value: "IN_PROGRESS" },
                            { label: "Done", value: "DONE" },
                        ],
                        type: [
                            { label: "All Types", value: "" },
                            { label: "Task", value: "TASK" },
                            { label: "Bug", value: "BUG" },
                            { label: "Feature", value: "FEATURE" },
                            { label: "Improvement", value: "IMPROVEMENT" },
                            { label: "Other", value: "OTHER" },
                        ],
                        priority: [
                            { label: "All Priorities", value: "" },
                            { label: "Low", value: "LOW" },
                            { label: "Medium", value: "MEDIUM" },
                            { label: "High", value: "HIGH" },
                        ],
                        group: [
                            { label: "All Groups", value: "" },
                            ...groupList.map((n) => ({ label: n, value: n })),
                        ],
                    };
                    return (
                        <select
                            key={name}
                            name={name}
                            onChange={handleFilterChange}
                            className=" border not-dark:bg-white border-zinc-300 dark:border-zinc-800 outline-none px-3 py-1 rounded text-sm text-zinc-900 dark:text-zinc-200"
                        >
                            {options[name].map((opt, idx) => (
                                <option key={idx} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    );
                })}

                {/* Reset filters */}
                {(filters.status || filters.type || filters.priority || filters.group) && (
                    <button
                        type="button"
                        onClick={() => setFilters({ status: "", type: "", priority: "", group: "" })}
                        className="px-3 py-1 flex items-center gap-2 rounded bg-gradient-to-br from-purple-400 to-purple-500 text-zinc-100 dark:text-zinc-200 text-sm transition-colors"
                    >
                        <XIcon className="size-3" /> Reset
                    </button>
                )}

                {user?.role === "ADMIN" && selectedTasks.length === 1 && (
                    <button
                        type="button"
                        onClick={() => setIsEditOpen(true)}
                        className="px-3 py-1 flex items-center gap-2 rounded bg-gradient-to-br from-blue-400 to-blue-500 text-zinc-100 dark:text-zinc-200 text-sm transition-colors"
                    >
                        <PencilIcon className="size-3" /> Edit
                    </button>
                )}

                {user?.role === "ADMIN" && selectedTasks.length > 0 && (
                    <button type="button" onClick={handleDelete} className="px-3 py-1 flex items-center gap-2 rounded bg-gradient-to-br from-indigo-400 to-indigo-500 text-zinc-100 dark:text-zinc-200 text-sm transition-colors" >
                        <Trash className="size-3" /> Delete
                    </button>
                )}
            </div>

            {user?.role === "ADMIN" && (
                <EditTaskDialog
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                task={tasks.find((t) => t.id === selectedTasks[0])}
                groups={groups}
                />
            )}

            {/* Tasks Table */}
            <div className="overflow-auto rounded-lg lg:border border-zinc-300 dark:border-zinc-800">
                <div className="w-full">
                    {/* Desktop/Table View */}
                    <div className="hidden lg:block overflow-x-auto">
                        <table className="min-w-full text-sm text-left not-dark:bg-white text-zinc-900 dark:text-zinc-300">
                            <thead className="text-xs uppercase dark:bg-zinc-800/70 text-zinc-500 dark:text-zinc-400 ">
                                <tr>
                                    {user?.role === "ADMIN" && (
                                        <th className="pl-2 pr-1">
                                            <input
                                                onChange={() => selectedTasks.length > 1 ? setSelectedTasks([]) : setSelectedTasks(visibleTasks.map((t) => t.id))}
                                                checked={selectedTasks.length === visibleTasks.length && visibleTasks.length > 0}
                                                type="checkbox"
                                                className="size-3 accent-zinc-600 dark:accent-zinc-500"
                                            />
                                        </th>
                                    )}
                                    <th className={`px-4 py-3 ${user?.role === "ADMIN" ? "pl-0" : "pl-2"}`}>Title</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Priority</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Groups</th>
                                    <th className="px-4 py-3">Assignee</th>
                                    <th className="px-4 py-3">Due Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTasks.length > 0 ? (
                                    filteredTasks.map((task) => {
                                        const { icon: Icon, color } = typeIcons[task.type] || {};
                                        const { background, prioritycolor } = priorityTexts[task.priority] || {};

                                        return (
                                            <tr
                                                key={task.id}
                                                onClick={() => navigate(`/taskDetails?projectId=${task.projectId}&taskId=${task.id}`)}
                                                className=" border-t border-zinc-300 dark:border-zinc-800 group hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all cursor-pointer"
                                            >
                                                {user?.role === "ADMIN" && (
                                                    <td onClick={e => e.stopPropagation()} className="pl-2 pr-1">
                                                        <input
                                                            type="checkbox"
                                                            className="size-3 accent-zinc-600 dark:accent-zinc-500"
                                                            onChange={() =>
                                                                selectedTasks.includes(task.id)
                                                                    ? setSelectedTasks(selectedTasks.filter((i) => i !== task.id))
                                                                    : setSelectedTasks((prev) => [...prev, task.id])
                                                            }
                                                            checked={selectedTasks.includes(task.id)}
                                                        />
                                                    </td>
                                                )}
                                                <td className={`px-4 py-2 ${user?.role === "ADMIN" ? "pl-0" : "pl-2"}`}>{task.title}</td>
                                                <td className="px-4 py-2">
                                                    <div className="flex items-center gap-2">
                                                        {Icon && <Icon className={`size-4 ${color}`} />}
                                                        <span className={`uppercase text-xs ${color}`}>{task.type}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <span className={`text-xs px-2 py-1 rounded ${background} ${prioritycolor}`}>
                                                        {task.priority}
                                                    </span>
                                                </td>
                                                <td onClick={e => e.stopPropagation()} className="px-4 py-2">
                                                    <select
                                                        name="status"
                                                        onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                                        value={task.status}
                                                        disabled={user?.role !== "ADMIN"}
                                                        className={`group-hover:ring ring-zinc-100 outline-none px-2 pr-4 py-1 rounded text-sm text-zinc-900 dark:text-zinc-200 ${user?.role === "ADMIN" ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
                                                    >
                                                        <option value="TODO">To Do</option>
                                                        <option value="IN_PROGRESS">In Progress</option>
                                                        <option value="DONE">Done</option>
                                                    </select>
                                                </td>
                                                <td className="px-4 py-2">
                                                    {(() => {
                                                        const displayGroups = filterTaskGroups(task.groups);
                                                        return displayGroups.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1 items-center">
                                                                {displayGroups.slice(0, 2).map((g) => (
                                                                    <span key={g.id || g.group?.id} className="text-[10px] px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700">
                                                                        {g.group?.name}
                                                                    </span>
                                                                ))}
                                                                {displayGroups.length > 2 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => { e.stopPropagation(); setOpenGroupsTaskId(task.id); }}
                                                                        className="text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                                                                    >
                                                                        +{displayGroups.length - 2} more
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span>-</span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setOpenAssigneesTaskId(task.id)}
                                                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                                                    >
                                                        <Eye className="size-3" />
                                                    </button>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                                                        <CalendarIcon className="size-4" />
                                                        {format(toIST(task.due_date), "dd MMMM")}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="text-center text-zinc-500 dark:text-zinc-400 py-6">
                                            No tasks found for the selected filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile/Card View */}
                    <div className="lg:hidden flex flex-col gap-4">
                        {filteredTasks.length > 0 ? (
                            filteredTasks.map((task) => {
                                const { icon: Icon, color } = typeIcons[task.type] || {};
                                const { background, prioritycolor } = priorityTexts[task.priority] || {};

                                return (
                                    <div key={task.id} className=" dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-300 dark:border-zinc-800 rounded-lg p-4 flex flex-col gap-2">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-zinc-900 dark:text-zinc-200 text-sm font-semibold">{task.title}</h3>
                                            {user?.role === "ADMIN" && (
                                                <input
                                                    type="checkbox"
                                                    className="size-4 accent-zinc-600 dark:accent-zinc-500"
                                                    onChange={() =>
                                                        selectedTasks.includes(task.id)
                                                            ? setSelectedTasks(selectedTasks.filter((i) => i !== task.id))
                                                            : setSelectedTasks((prev) => [...prev, task.id])
                                                    }
                                                    checked={selectedTasks.includes(task.id)}
                                                />
                                            )}
                                        </div>

                                        <div className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                                            {Icon && <Icon className={`size-4 ${color}`} />}
                                            <span className={`${color} uppercase`}>{task.type}</span>
                                        </div>

                                        <div>
                                            <span className={`text-xs px-2 py-1 rounded ${background} ${prioritycolor}`}>
                                                {task.priority}
                                            </span>
                                        </div>

                                        <div>
                                            <label className="text-zinc-600 dark:text-zinc-400 text-xs">Status</label>
                                            <select
                                                name="status"
                                                onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                                value={task.status}
                                                disabled={user?.role !== "ADMIN"}
                                                className={`w-full mt-1 bg-zinc-100 dark:bg-zinc-800 ring-1 ring-zinc-300 dark:ring-zinc-700 outline-none px-2 py-1 rounded text-sm text-zinc-900 dark:text-zinc-200 ${user?.role === "ADMIN" ? "" : "cursor-not-allowed opacity-60"}`}
                                            >
                                                <option value="TODO">To Do</option>
                                                <option value="IN_PROGRESS">In Progress</option>
                                                <option value="DONE">Done</option>
                                            </select>
                                        </div>

                                        <div className="flex flex-wrap gap-1 text-sm text-zinc-700 dark:text-zinc-300">
                                            {(() => {
                                                const displayGroups = filterTaskGroups(task.groups);
                                                return displayGroups.length > 0 ? (
                                                    <>
                                                        {displayGroups.slice(0, 2).map((g) => (
                                                            <span key={g.id || g.group?.id} className="text-xs px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700">
                                                                {g.group?.name}
                                                            </span>
                                                        ))}
                                                        {displayGroups.length > 2 && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.stopPropagation(); setOpenGroupsTaskId(task.id); }}
                                                                className="text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                                                            >
                                                                +{displayGroups.length - 2} more
                                                            </button>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span>-</span>
                                                );
                                            })()}
                                        </div>

                                        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                                            <CalendarIcon className="size-4" />
                                            {format(toIST(task.due_date), "dd MMMM")}
                                        </div>

                                        <div className="flex items-center gap-2 text-xs">
                                            <button
                                                type="button"
                                                onClick={() => setOpenAssigneesTaskId(task.id)}
                                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                                            >
                                                <Eye className="size-3" /> Assignees
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-center text-zinc-500 dark:text-zinc-400 py-4">
                                No tasks found for the selected filters.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {openGroupsTaskId && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur flex items-center justify-center" onClick={() => setOpenGroupsTaskId(null)}>
                    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 max-w-md w-full min-h-[200px]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">All Groups</h3>
                            <button onClick={() => setOpenGroupsTaskId(null)} className="text-xs text-zinc-500">Close</button>
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-80 overflow-y-auto">
                            {filterTaskGroups(tasks.find((t) => t.id === openGroupsTaskId)?.groups).map((g) => (
                                <span key={g.id || g.group?.id} className="text-xs px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700">
                                    {g.group?.name}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {openAssigneesTaskId && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur flex items-center justify-center" onClick={() => setOpenAssigneesTaskId(null)}>
                    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 max-w-md w-full min-h-[200px]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Assignees</h3>
                            <button onClick={() => setOpenAssigneesTaskId(null)} className="text-xs text-zinc-500">Close</button>
                        </div>
                        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                            {(() => {
                                const displayAssignees = filterAssignees(tasks.find((t) => t.id === openAssigneesTaskId)?.assignees);
                                return displayAssignees.length > 0 ? (
                                    displayAssignees.map((a) => (
                                        <div key={a.id} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <span>{a.user?.name || a.user?.email}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-xs text-zinc-500">Unassigned</div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectTasks;
