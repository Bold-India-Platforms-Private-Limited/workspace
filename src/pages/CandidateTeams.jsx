import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../auth/AuthContext";
import { useSelector } from "react-redux";
import api from "../configs/api";
import toast from "react-hot-toast";
import { Users, MessageSquare, RefreshCw, ChevronDown, Clock } from "lucide-react";
import { formatDateTimeIST } from "../configs/timezone";
import { thumb } from "../utils/cloudinaryUrl";

const CandidateTeams = () => {
    const { user, getToken } = useAuth();
    const currentWorkspace = useSelector((state) => state?.workspace?.currentWorkspace || null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(new Set());
    const [search, setSearch] = useState("");

    const fetchMessages = async () => {
        if (!currentWorkspace) return;
        try {
            setLoading(true);
            const { data } = await api.get("/api/projects/candidate-teams", {
                params: { workspaceId: currentWorkspace.id },
                headers: { Authorization: `Bearer ${await getToken()}` },
            });
            setMessages(data.messages || []);
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.role === "ADMIN") fetchMessages();
    }, [currentWorkspace, user]);

    // Group the flat message list by project — the backend already returns
    // them newest-first, so each group's first entry is its most recent message.
    const grouped = useMemo(() => {
        const map = new Map();
        messages.forEach((m) => {
            const pid = m.project?.id;
            if (!pid) return;
            if (!map.has(pid)) map.set(pid, { project: m.project, messages: [] });
            map.get(pid).messages.push(m);
        });
        return Array.from(map.values());
    }, [messages]);

    const filteredGroups = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return grouped;
        return grouped
            .map((g) => ({
                ...g,
                messages: g.messages.filter(
                    (m) =>
                        m.user?.name?.toLowerCase().includes(term) ||
                        m.user?.email?.toLowerCase().includes(term) ||
                        m.message?.toLowerCase().includes(term) ||
                        g.project?.name?.toLowerCase().includes(term)
                ),
            }))
            .filter((g) => g.messages.length > 0);
    }, [grouped, search]);

    const toggleExpand = (pid) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(pid)) next.delete(pid);
            else next.add(pid);
            return next;
        });
    };

    if (user?.role !== "ADMIN") {
        return (
            <div className="p-6 text-center text-zinc-900 dark:text-zinc-200">
                <p className="text-2xl md:text-4xl mt-32 mb-6">Access denied</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Candidate Teams is available for admins only.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                    <Users className="size-6" />
                    <h1 className="text-xl font-semibold">Candidate Teams</h1>
                </div>
                <button
                    onClick={fetchMessages}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition disabled:opacity-40"
                >
                    <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            <input
                type="text"
                placeholder="Search by project, member, or message…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400"
            />

            {loading && messages.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
                    <div className="inline-block animate-spin">⏳</div> Loading messages...
                </div>
            ) : filteredGroups.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                    No messages yet
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredGroups.map(({ project, messages: msgs }) => {
                        const isOpen = expanded.has(project.id);
                        return (
                            <div key={project.id} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                                <button
                                    onClick={() => toggleExpand(project.id)}
                                    className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="flex items-center justify-center size-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 shrink-0">
                                            <MessageSquare className="size-4 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{project.name}</p>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                                PM: {project.owner?.name || project.owner?.email || "Unknown"} · {msgs.length} message{msgs.length !== 1 ? "s" : ""}
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronDown className={`size-4 text-zinc-400 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                                </button>
                                {isOpen && (
                                    <div className="border-t border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
                                        {msgs.map((m) => (
                                            <div key={m.id} className="p-4 flex items-start gap-3">
                                                <img src={thumb(m.user?.image, 48, 48)} alt="" className="size-8 rounded-full object-cover shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{m.user?.name || m.user?.email}</p>
                                                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1 shrink-0">
                                                            <Clock className="size-3" />
                                                            {m.createdAt ? formatDateTimeIST(m.createdAt, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-1 whitespace-pre-wrap break-words">{m.message}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CandidateTeams;
