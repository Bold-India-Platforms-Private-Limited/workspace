import { useMemo, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeftIcon, PlusIcon, SettingsIcon, BarChart3Icon, CalendarIcon, FileStackIcon, ZapIcon, FileIcon, FolderOpenIcon, Maximize2, X, MessageSquare, Send, Loader2 } from "lucide-react";
import ProjectAnalytics from "../components/ProjectAnalytics";
import ProjectSettings from "../components/ProjectSettings";
import CreateTaskDialog from "../components/CreateTaskDialog";
import ProjectCalendar from "../components/ProjectCalendar";
import ProjectTasks from "../components/ProjectTasks";
import ProjectDocuments from "../components/ProjectDocuments";
import { useAuth } from "../auth/AuthContext";
import api from "../configs/api";
import toast from "react-hot-toast";
import DOMPurify from "dompurify";

export default function ProjectDetail() {

    const [searchParams, setSearchParams] = useSearchParams();
    const tab = searchParams.get('tab');
    const id = searchParams.get('id');

    const navigate = useNavigate();
    const currentWorkspace = useSelector((state) => state?.workspace?.currentWorkspace || null);
    const detailLoading = useSelector((state) => state?.workspace?.detailLoading);
    const projects = currentWorkspace?.projects || [];
    // The selected workspace's project graph is still loading — don't flash
    // "Project not found" before the data has even arrived.
    const graphLoading = detailLoading && !Array.isArray(currentWorkspace?.projects);

    const [project, setProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [showCreateTask, setShowCreateTask] = useState(false);
    const [activeTab, setActiveTab] = useState(tab || "tasks");
    const [htmlModalOpen, setHtmlModalOpen] = useState(false);
    const [showMessagePM, setShowMessagePM] = useState(false);
    const [pmMessage, setPmMessage] = useState("");
    const [sendingPM, setSendingPM] = useState(false);
    const { user, getToken } = useAuth();
    const userGroupIds = useMemo(() => {
        if (!user?.id || !currentWorkspace) return new Set();
        return new Set(
            (currentWorkspace.groups || [])
                .filter((group) => group.members?.some((m) => m.userId === user.id))
                .map((group) => group.id)
        );
    }, [currentWorkspace, user]);
    const groupMemberCount = useMemo(() => {
        const isAdmin = user?.role === "ADMIN";
        const groups = project?.groups || [];
        const relevantGroups = isAdmin
            ? groups
            : groups.filter((g) => userGroupIds.has(g.groupId || g.group?.id));
        return relevantGroups.reduce((acc, g) => {
            const members = g.group?.members || [];
            members.forEach((m) => acc.add(m.userId));
            return acc;
        }, new Set()).size;
    }, [project, user, userGroupIds]);

    useEffect(() => {
        if (tab) setActiveTab(tab);
    }, [tab]);

    useEffect(() => {
        if (projects && projects.length > 0) {
            const proj = projects.find((p) => p.id === id);
            setProject(proj);
            setTasks(proj?.tasks || []);
        }
    }, [id, projects]);

    const statusColors = {
        PLANNING: "bg-zinc-200 text-zinc-900 dark:bg-zinc-600 dark:text-zinc-200",
        ACTIVE: "bg-emerald-200 text-emerald-900 dark:bg-emerald-500 dark:text-emerald-900",
        ON_HOLD: "bg-amber-200 text-amber-900 dark:bg-amber-500 dark:text-amber-900",
        COMPLETED: "bg-blue-200 text-blue-900 dark:bg-blue-500 dark:text-blue-900",
        CANCELLED: "bg-red-200 text-red-900 dark:bg-red-500 dark:text-red-900",
    };

    const handleSendPM = async () => {
        if (!pmMessage.trim()) return;
        try {
            setSendingPM(true);
            await api.post(
                `/api/projects/${id}/messages`,
                { message: pmMessage.trim() },
                { headers: { Authorization: `Bearer ${await getToken()}` } }
            );
            toast.success("Message sent to Project Manager");
            setPmMessage("");
            setShowMessagePM(false);
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        } finally {
            setSendingPM(false);
        }
    };

    if (!project && graphLoading) {
        return (
            <div className="max-w-5xl mx-auto space-y-4 animate-pulse p-6">
                <div className="h-8 w-64 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-4 w-96 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-64 rounded-lg bg-zinc-200 dark:bg-zinc-800 mt-6" />
            </div>
        );
    }

    if (!project) {
        return (
            <div className="p-6 text-center text-zinc-900 dark:text-zinc-200">
                <p className="text-3xl md:text-5xl mt-40 mb-10">Project not found</p>
                <button
                    onClick={() => navigate('/projects')}
                    className="mt-4 px-4 py-2 rounded bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
                >
                    Back to Projects
                </button>
            </div>
        );
    }

    const projectGroupIds = (project?.groups || []).map((g) => g.groupId || g.group?.id).filter(Boolean);
    const isMember = user?.role !== "ADMIN";
    const isAllowed = !isMember || projectGroupIds.some((id) => userGroupIds.has(id));

    if (!isAllowed) {
        return (
            <div className="p-6 text-center text-zinc-900 dark:text-zinc-200">
                <p className="text-2xl md:text-4xl mt-32 mb-6">Access denied</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">You only have access to projects assigned to your groups.</p>
                <button
                    onClick={() => navigate('/projects')}
                    className="mt-4 px-4 py-2 rounded bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
                >
                    Back to Projects
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-5 max-w-6xl mx-auto text-zinc-900 dark:text-white">
            {/* Header */}
            <div className="flex max-md:flex-col gap-4 flex-wrap items-start justify-between max-w-6xl">
                <div className="flex items-center gap-4">
                    <button className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400" onClick={() => navigate('/projects')}>
                        <ArrowLeftIcon className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-medium">{project.name}</h1>
                        <span className={`px-2 py-1 rounded text-xs capitalize ${statusColors[project.status]}`} >
                            {project.status.replace("_", " ")}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowMessagePM(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm rounded border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                    >
                        <MessageSquare className="size-4" />
                        Message PM
                    </button>
                    {user?.role === "ADMIN" && (
                        <button
                            onClick={() => setShowCreateTask(true)}
                            className="flex items-center gap-2 px-5 py-2 text-sm rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                        >
                            <PlusIcon className="size-4" />
                            New Task
                        </button>
                    )}
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-2 sm:flex flex-wrap gap-6">
                {[
                    { label: "Total Tasks", value: tasks.length, color: "text-zinc-900 dark:text-white" },
                    { label: "Completed", value: tasks.filter((t) => t.status === "DONE").length, color: "text-emerald-700 dark:text-emerald-400" },
                    { label: "In Progress", value: tasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "TODO").length, color: "text-amber-700 dark:text-amber-400" },
                    { label: "Team Members", value: groupMemberCount || 0, color: "text-blue-700 dark:text-blue-400" },
                ].map((card, idx) => (
                    <div key={idx} className=" dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-200 dark:border-zinc-800 flex justify-between sm:min-w-60 p-4 py-2.5 rounded">
                        <div>
                            <div className="text-sm text-zinc-600 dark:text-zinc-400">{card.label}</div>
                            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                        </div>
                        <ZapIcon className={`size-4 ${card.color}`} />
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div>
                <div className="inline-flex flex-wrap max-sm:grid grid-cols-3 gap-2 border border-zinc-200 dark:border-zinc-800 rounded overflow-hidden">
                    {[
                        { key: "tasks",       label: "Tasks",       icon: FileStackIcon   },
                        { key: "documents",   label: "Documents",   icon: FolderOpenIcon  },
                        { key: "description", label: "Description", icon: FileIcon        },
                        { key: "calendar",    label: "Calendar",    icon: CalendarIcon    },
                        { key: "analytics",   label: "Analytics",   icon: BarChart3Icon   },
                        ...(user?.role === "ADMIN" ? [{ key: "settings", label: "Settings", icon: SettingsIcon }] : []),
                    ].map((tabItem) => (
                        <button
                            key={tabItem.key}
                            onClick={() => { setActiveTab(tabItem.key); setSearchParams({ id: id, tab: tabItem.key }) }}
                            className={`flex items-center gap-2 px-4 py-2 text-sm transition-all ${activeTab === tabItem.key
                                ? "bg-zinc-100 dark:bg-zinc-800/80"
                                : "hover:bg-zinc-50 dark:hover:bg-zinc-700"
                                }`}
                        >
                            <tabItem.icon className="size-3.5" />
                            {tabItem.label}
                        </button>
                    ))}
                </div>

                <div className="mt-6">
                    {activeTab === "tasks" && (
                        <div className=" dark:bg-zinc-900/40 rounded max-w-6xl">
                            <ProjectTasks tasks={tasks} groups={(() => {
                                const projectGroupIds = new Set((project?.groups || []).map((g) => g.groupId || g.group?.id).filter(Boolean));
                                return (currentWorkspace?.groups || []).filter((g) => projectGroupIds.has(g.id));
                            })()} />
                        </div>
                    )}
                    {activeTab === "description" && (
                        <div>
                            {/* ── Single trigger card ── */}
                            {!project?.description ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
                                        <FileIcon size={22} className="text-zinc-400" />
                                    </div>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">No description added yet.</p>
                                    {user?.role === "ADMIN" && (
                                        <p className="text-xs text-zinc-400 mt-1">Go to <span className="font-semibold">Settings</span> to add one.</p>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-14 text-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center">
                                        <FileIcon size={26} className="text-blue-500 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-zinc-700 dark:text-zinc-200 text-base">{project.name}</p>
                                        <p className="text-xs text-zinc-400 mt-0.5">
                                            {project.descriptionType === "html" ? "HTML page description" : "Rich text description"}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setHtmlModalOpen(true)}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold shadow-md shadow-blue-200 dark:shadow-none transition"
                                    >
                                        <Maximize2 size={15} />
                                        View project description
                                    </button>
                                </div>
                            )}

                            {/* ── Full-screen modal — works for both HTML and text ── */}
                            {htmlModalOpen && project?.description && (
                                <div
                                    className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
                                    onClick={() => setHtmlModalOpen(false)}
                                >
                                    <div
                                        className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden"
                                        style={{ maxWidth: 1100, height: "92vh" }}
                                        onClick={e => e.stopPropagation()}
                                    >
                                        {/* Modal header */}
                                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                                                    <FileIcon size={13} className="text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-zinc-800 dark:text-zinc-100 text-sm leading-tight">{project.name}</p>
                                                    <p className="text-[11px] text-zinc-400">Project Description</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setHtmlModalOpen(false)}
                                                className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>

                                        {/* Modal body */}
                                        <div className="flex-1 overflow-hidden">
                                            {project.descriptionType === "html" ? (
                                                /* HTML — sandboxed iframe */
                                                <iframe
                                                    srcDoc={project.description}
                                                    title="Project Description"
                                                    sandbox="allow-scripts"
                                                    className="w-full h-full border-0"
                                                />
                                            ) : (
                                                /* Rich text — DOMPurify rendered, scrollable */
                                                <div className="w-full h-full overflow-y-auto px-8 py-6">
                                                    <div
                                                        className="description-content prose prose-zinc dark:prose-invert max-w-3xl mx-auto text-sm sm:text-base text-zinc-700 dark:text-zinc-200 leading-relaxed break-words"
                                                        dangerouslySetInnerHTML={{
                                                            __html: DOMPurify.sanitize(
                                                                /<\s*\/?[a-z][\s\S]*>/i.test(project.description)
                                                                    ? project.description
                                                                    : project.description.replace(/\n/g, "<br />"),
                                                                {
                                                                    ALLOWED_TAGS: ["p","b","i","u","strong","em","h1","h2","h3","h4","h5","h6","ul","ol","li","blockquote","code","pre","span","div","br","a","img"],
                                                                    ALLOWED_ATTR: ["style","class","align","href","src","alt"],
                                                                    ALLOW_STYLE: true,
                                                                }
                                                            )
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {activeTab === "documents" && (
                        <div className="dark:bg-zinc-900/40 rounded max-w-6xl">
                            <ProjectDocuments projectId={id} />
                        </div>
                    )}
                    {activeTab === "analytics" && (
                        <div className=" dark:bg-zinc-900/40 rounded max-w-6xl">
                            <ProjectAnalytics tasks={tasks} project={project} />
                        </div>
                    )}
                    {activeTab === "calendar" && (
                        <div className=" dark:bg-zinc-900/40 rounded max-w-6xl">
                            <ProjectCalendar tasks={tasks} />
                        </div>
                    )}
                    {activeTab === "settings" && user?.role === "ADMIN" && (
                        <div className=" dark:bg-zinc-900/40 rounded max-w-6xl">
                            <ProjectSettings project={project} />
                        </div>
                    )}
                </div>
            </div>

            {/* Create Task Modal */}
            {showCreateTask && user?.role === "ADMIN" && <CreateTaskDialog showCreateTask={showCreateTask} setShowCreateTask={setShowCreateTask} projectId={id} />}

            {/* Message Project Manager Modal */}
            {showMessagePM && (
                <div
                    className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
                    onClick={() => setShowMessagePM(false)}
                >
                    <div
                        className="bg-white dark:bg-zinc-900 rounded-lg max-w-md w-full p-5 space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div>
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Message Project Manager</h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Send a note about "{project.name}" to its Project Manager.</p>
                        </div>
                        <textarea
                            rows={4}
                            value={pmMessage}
                            onChange={(e) => setPmMessage(e.target.value)}
                            placeholder="Type your message…"
                            className="w-full px-3 py-2 text-sm rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowMessagePM(false)}
                                className="px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSendPM}
                                disabled={sendingPM || !pmMessage.trim()}
                                className="flex items-center gap-2 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 transition"
                            >
                                {sendingPM ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
