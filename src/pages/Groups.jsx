import { useEffect, useMemo, useRef, useState } from "react";
import api from "../configs/api";
import { useSelector } from "react-redux";
import { ArrowLeft, UsersIcon, MessageCircle, Trash2, Search, Send, MessageSquareOff } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { toIST, nowIST, TIMEZONE } from "../configs/timezone";
import toast from "react-hot-toast";

const PAGE_SIZE = 200;

const Groups = () => {
    const { getToken } = useAuth();
    const { user } = useAuth();
    const currentWorkspace = useSelector((state) => state?.workspace?.currentWorkspace || null);
    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [page, setPage] = useState(1);
    const [memberPage, setMemberPage] = useState(1);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [memberFilter, setMemberFilter] = useState("ALL");
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [selectedGroupsForDelete, setSelectedGroupsForDelete] = useState(new Set());
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [showMembers, setShowMembers] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [sortFilter, setSortFilter] = useState(user?.role === "ADMIN" ? "conversations" : "latest");
    const [groupSearch, setGroupSearch] = useState("");
    const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
    const [broadcastMessage, setBroadcastMessage] = useState("");
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [isBulkClearChatOpen, setIsBulkClearChatOpen] = useState(false);
    const [isBulkClearing, setIsBulkClearing] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [isMessagesLoading, setIsMessagesLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [groupLastMessages, setGroupLastMessages] = useState({});
    const [seenMessages, setSeenMessages] = useState(() => {
        try { return JSON.parse(localStorage.getItem("seenGroupMessages") || "{}"); } catch { return {}; }
    });
    const messagesEndRef = useRef(null);

    const shortText = (value, max = 5) => {
        const text = String(value || "");
        return text.length > max ? `${text.slice(0, max)}...` : text;
    };

    const getInitials = (name) => {
        if (!name) return "?";
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return parts[0][0]?.toUpperCase() || "?";
    };

    const avatarColors = [
        "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-rose-500",
        "bg-amber-500", "bg-cyan-500", "bg-pink-500", "bg-teal-500",
        "bg-indigo-500", "bg-orange-500"
    ];

    const getAvatarColor = (name) => {
        if (!name) return avatarColors[0];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return avatarColors[Math.abs(hash) % avatarColors.length];
    };

    const fetchGroups = async () => {
        if (!currentWorkspace) return;
        try {
            setIsLoading(true);
            const { data } = await api.get(`/api/groups?workspaceId=${currentWorkspace.id}`, { headers: { Authorization: `Bearer ${await getToken()}` } });
            setGroups(data.groups || []);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchGroupLastMessages = async () => {
        if (!currentWorkspace) return;
        try {
            const token = await getToken();
            const results = {};
            await Promise.all(
                (groups || []).map(async (group) => {
                    try {
                        const { data } = await api.get(`/api/groups/${group.id}/messages`, { headers: { Authorization: `Bearer ${token}` } });
                        const msgs = data.messages || [];
                        if (msgs.length > 0) {
                            results[group.id] = msgs[msgs.length - 1];
                        }
                    } catch { /* skip */ }
                })
            );
            setGroupLastMessages(results);
        } catch { /* skip */ }
    };

    useEffect(() => {
        fetchGroups();
    }, [currentWorkspace]);

    useEffect(() => {
        if (groups.length > 0) {
            fetchGroupLastMessages();
        }
    }, [groups]);

    const visibleGroups = useMemo(() => {
        let filtered = user?.role === "ADMIN" ? [...groups] : groups.filter((group) => group.members?.some((m) => m.userId === user?.id));
        if (groupSearch.trim()) {
            const term = groupSearch.trim().toLowerCase();
            filtered = filtered.filter((g) => g.name?.toLowerCase().includes(term));
        }
        if (sortFilter === "conversations") {
            filtered.sort((a, b) => {
                const msgA = groupLastMessages[a.id]?.createdAt ? new Date(groupLastMessages[a.id].createdAt).getTime() : 0;
                const msgB = groupLastMessages[b.id]?.createdAt ? new Date(groupLastMessages[b.id].createdAt).getTime() : 0;
                return msgB - msgA;
            });
        } else if (sortFilter === "latest") {
            filtered.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
            });
        }
        return filtered;
    }, [groups, user, sortFilter, groupLastMessages]);

    const pagedGroups = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return visibleGroups.slice(start, start + PAGE_SIZE);
    }, [visibleGroups, page]);

    const totalPages = Math.ceil(visibleGroups.length / PAGE_SIZE) || 1;

    const groupMembers = selectedGroup?.members || [];
    const pagedMembers = useMemo(() => {
        const start = (memberPage - 1) * PAGE_SIZE;
        return groupMembers.slice(start, start + PAGE_SIZE);
    }, [groupMembers, memberPage]);
    const totalMemberPages = Math.ceil(groupMembers.length / PAGE_SIZE) || 1;

    // Moved this declaration BEFORE it's used
    const allWorkspaceMembers = currentWorkspace?.members || [];
    const userGroupsMap = useMemo(() => {
        const map = {};
        (groups || []).forEach((g) => {
            (g.members || []).forEach((m) => {
                if (!map[m.userId]) map[m.userId] = [];
                map[m.userId].push({ id: g.id, name: g.name });
            });
        });
        return map;
    }, [groups]);
    const activeGroupMembers = useMemo(() => {
        if (!groupMembers.length) return [];
        const workspaceIds = new Set(allWorkspaceMembers.map((m) => m.userId));
        return groupMembers.filter((member) => workspaceIds.has(member.userId));
    }, [groupMembers, allWorkspaceMembers]);
    const workspaceFilteredMembers = useMemo(() => {
        if (!allWorkspaceMembers) return [];
        return allWorkspaceMembers.filter((member) => {
            const uGroups = userGroupsMap[member.userId] || [];
            if (memberFilter === "NOT_IN_ANY") return uGroups.length === 0;
            if (memberFilter === "IN_CURRENT") return selectedGroup && uGroups.some((g) => g.id === selectedGroup.id);
            if (memberFilter === "IN_OTHER") return uGroups.length > 0 && !(selectedGroup && uGroups.some((g) => g.id === selectedGroup.id));
            return true;
        });
    }, [allWorkspaceMembers, userGroupsMap, memberFilter, selectedGroup]);

    const pagedWorkspaceMembers = useMemo(() => {
        const start = (memberPage - 1) * PAGE_SIZE;
        return workspaceFilteredMembers.slice(start, start + PAGE_SIZE);
    }, [workspaceFilteredMembers, memberPage]);
    const totalWorkspacePages = Math.ceil(allWorkspaceMembers.length / PAGE_SIZE) || 1;

    const handleToggle = (userId) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });
    };

    const handleSelectPage = () => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            const ids = pagedWorkspaceMembers.map((m) => m.userId);
            const allSelected = ids.every((id) => next.has(id));
            ids.forEach((id) => {
                if (allSelected) next.delete(id);
                else next.add(id);
            });
            return next;
        });
    };

    const openEdit = () => {
        const existing = new Set(activeGroupMembers.map((m) => m.userId));
        setSelectedIds(existing);
        setIsEditOpen(true);
    };

    const handleSaveMembers = async () => {
        const existing = new Set((selectedGroup?.members || []).map((m) => m.userId));
        const next = new Set(selectedIds);
        const addUserIds = Array.from(next).filter((id) => !existing.has(id));
        const removeUserIds = Array.from(existing).filter((id) => !next.has(id));

        await api.put(`/api/groups/${selectedGroup.id}/members`, { addUserIds, removeUserIds }, { headers: { Authorization: `Bearer ${await getToken()}` } });
        await fetchGroups();
        const updated = await api.get(`/api/groups/${selectedGroup.id}`, { headers: { Authorization: `Bearer ${await getToken()}` } });
        setSelectedGroup(updated.data.group);
        setIsEditOpen(false);
    };

    const fetchMessages = async (showLoading = false) => {
        if (!selectedGroup) return;
        if (showLoading) setIsMessagesLoading(true);
        try {
            const { data } = await api.get(`/api/groups/${selectedGroup.id}/messages`, { headers: { Authorization: `Bearer ${await getToken()}` } });
            setMessages(data.messages || []);
        } finally {
            if (showLoading) setIsMessagesLoading(false);
        }
    };

    const handleClearChat = async () => {
        if (!selectedGroup) return;
        const confirm = window.confirm("Clear all messages in this group chat?");
        if (!confirm) return;
        await api.delete(`/api/groups/${selectedGroup.id}/messages`, { headers: { Authorization: `Bearer ${await getToken()}` } });
        setMessages([]);
    };

    const handleDeleteGroup = async () => {
        if (!selectedGroup) return;
        const confirm = window.confirm("Delete this group? This removes all members and chats.");
        if (!confirm) return;
        await api.delete(`/api/groups/${selectedGroup.id}`, { headers: { Authorization: `Bearer ${await getToken()}` } });
        setSelectedGroup(null);
        fetchGroups();
    };

    const toggleGroupSelectForDelete = (groupId) => {
        setSelectedGroupsForDelete((prev) => {
            const next = new Set(prev);
            if (next.has(groupId)) next.delete(groupId);
            else next.add(groupId);
            return next;
        });
    };

    const toggleSelectAllGroupsForDelete = () => {
        setSelectedGroupsForDelete((prev) => {
            const next = new Set(prev);
            const groupIds = pagedGroups.map((g) => g.id);
            const allSelected = groupIds.every((id) => next.has(id));
            groupIds.forEach((id) => {
                if (allSelected) next.delete(id);
                else next.add(id);
            });
            return next;
        });
    };

    const handleBulkDeleteGroups = async () => {
        try {
            const groupIds = Array.from(selectedGroupsForDelete);
            const token = await getToken();
            for (const groupId of groupIds) {
                await api.delete(`/api/groups/${groupId}`, { headers: { Authorization: `Bearer ${token}` } });
            }
            toast.success(`Deleted ${groupIds.length} group(s) successfully!`);
            setSelectedGroupsForDelete(new Set());
            setIsBulkDeleteModalOpen(false);
            setDeleteConfirmText("");
            fetchGroups();
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        }
    };

    const handleBulkClearChat = async () => {
        if (selectedGroupsForDelete.size === 0) return;
        try {
            setIsBulkClearing(true);
            const token = await getToken();
            const groupIds = Array.from(selectedGroupsForDelete);
            let cleared = 0;
            for (const groupId of groupIds) {
                try {
                    await api.delete(`/api/groups/${groupId}/messages`, { headers: { Authorization: `Bearer ${token}` } });
                    cleared++;
                } catch { /* skip */ }
            }
            toast.success(`Cleared chat in ${cleared} group(s)`);
            setIsBulkClearChatOpen(false);
            setSelectedGroupsForDelete(new Set());
            fetchGroupLastMessages();
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        } finally {
            setIsBulkClearing(false);
        }
    };

    const handleBroadcastMessage = async () => {
        if (!broadcastMessage.trim() || selectedGroupsForDelete.size === 0) return;
        try {
            setIsBroadcasting(true);
            const token = await getToken();
            const groupIds = Array.from(selectedGroupsForDelete);
            let sent = 0;
            for (const groupId of groupIds) {
                try {
                    await api.post(
                        `/api/groups/${groupId}/messages`,
                        { content: broadcastMessage },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    sent++;
                } catch { /* skip failed */ }
            }
            toast.success(`Message sent to ${sent} group(s)`);
            setBroadcastMessage("");
            setIsBroadcastOpen(false);
            setSelectedGroupsForDelete(new Set());
            fetchGroupLastMessages();
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        } finally {
            setIsBroadcasting(false);
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || isSending) return;
        try {
            setIsSending(true);
            const { data } = await api.post(
                `/api/groups/${selectedGroup.id}/messages`,
                { content: newMessage },
                { headers: { Authorization: `Bearer ${await getToken()}` } }
            );
            setMessages((prev) => prev.concat(data.message));
            setNewMessage("");
        } finally {
            setIsSending(false);
        }
    };

    useEffect(() => {
        if (selectedGroup) {
            fetchMessages(true);
            const interval = setInterval(() => fetchMessages(false), 10000);
            // Mark as seen
            const lastMsg = groupLastMessages[selectedGroup.id];
            if (lastMsg) {
                const updated = { ...seenMessages, [selectedGroup.id]: lastMsg.id };
                setSeenMessages(updated);
                localStorage.setItem("seenGroupMessages", JSON.stringify(updated));
            }
            return () => clearInterval(interval);
        }
    }, [selectedGroup, groupLastMessages]);

    useEffect(() => {
        if (selectedGroup) {
            messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
        }
    }, [messages, selectedGroup]);

    useEffect(() => {
        if (selectedGroup && user?.role !== "ADMIN") {
            const isMember = selectedGroup.members?.some((m) => m.userId === user?.id);
            if (!isMember) setSelectedGroup(null);
        }
    }, [selectedGroup, user]);

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {!selectedGroup ? (
                <>
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                            {user?.role === "ADMIN" ? "Groups" : "Team Group"}
                        </h1>
                        {user?.role === "ADMIN" && selectedGroupsForDelete.size > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    onClick={() => setIsBroadcastOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm transition"
                                >
                                    <Send className="w-4 h-4" />
                                    Message ({selectedGroupsForDelete.size})
                                </button>
                                <button
                                    onClick={() => setIsBulkClearChatOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 rounded bg-amber-500 hover:bg-amber-600 text-white text-sm transition"
                                >
                                    <MessageSquareOff className="w-4 h-4" />
                                    Clear Chats ({selectedGroupsForDelete.size})
                                </button>
                                <button
                                    onClick={() => { setIsBulkDeleteModalOpen(true); setDeleteConfirmText(""); }}
                                    className="flex items-center gap-2 px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm transition"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete ({selectedGroupsForDelete.size})
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Search bar + Sort filters */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                            <input
                                value={groupSearch}
                                onChange={(e) => { setGroupSearch(e.target.value); setPage(1); }}
                                placeholder="Search groups..."
                                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                                <span className="text-xs text-zinc-500 dark:text-zinc-400 mr-1">Sort by:</span>
                                {[
                                    { key: "latest", label: "Latest Created" },
                                    { key: "conversations", label: "Conversations" },
                                ].map((opt) => (
                                    <button
                                        key={opt.key}
                                        onClick={() => { setSortFilter(opt.key); setPage(1); }}
                                        className={`px-3 py-1.5 text-xs rounded-full border transition ${
                                            sortFilter === opt.key
                                                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white"
                                                : "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-600"
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                    </div>

                    {isLoading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 6 }).map((_, idx) => (
                                <div key={idx} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 animate-pulse">
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 rounded-full bg-zinc-200 dark:bg-zinc-800 flex-shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="h-4 w-28 bg-zinc-200 dark:bg-zinc-800 rounded" />
                                                <div className="h-3 w-12 bg-zinc-200 dark:bg-zinc-800 rounded" />
                                            </div>
                                            <div className="h-3 w-44 bg-zinc-200 dark:bg-zinc-800 rounded" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : visibleGroups.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
                                <UsersIcon className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
                            </div>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">No groups found</p>
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Your Project Manager will create shortly.</p>
                        </div>
                    ) : (
                        <div>
                            {user?.role === "ADMIN" && visibleGroups.length > 0 && (
                                <div className="mb-3 flex items-center gap-2 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                    <input
                                        type="checkbox"
                                        checked={pagedGroups.length > 0 && pagedGroups.every((g) => selectedGroupsForDelete.has(g.id))}
                                        onChange={toggleSelectAllGroupsForDelete}
                                        className="cursor-pointer accent-blue-500"
                                    />
                                    <span className="text-xs text-zinc-600 dark:text-zinc-400">
                                        {pagedGroups.length > 0 && pagedGroups.every((g) => selectedGroupsForDelete.has(g.id))
                                            ? "Deselect all on this page"
                                            : "Select all on this page"}
                                    </span>
                                    {selectedGroupsForDelete.size > 0 && (
                                        <span className="ml-auto text-xs font-medium text-blue-600 dark:text-blue-400">{selectedGroupsForDelete.size} selected</span>
                                    )}
                                </div>
                            )}
                            <div className="space-y-2">
                                {pagedGroups.map((group) => {
                                    const lastMsg = groupLastMessages[group.id];
                                    const hasNew = lastMsg && seenMessages[group.id] !== lastMsg.id;
                                    const lastMsgTime = lastMsg?.createdAt ? new Date(lastMsg.createdAt) : null;
                                    const timeStr = lastMsgTime
                                        ? (nowIST().toDateString() === toIST(lastMsgTime).toDateString()
                                            ? toIST(lastMsgTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: TIMEZONE })
                                            : toIST(lastMsgTime).toLocaleDateString("en-IN", { month: "short", day: "numeric", timeZone: TIMEZONE }))
                                        : null;
                                    const isSelected = selectedGroupsForDelete.has(group.id);
                                    return (
                                        <div
                                            key={group.id}
                                            className={`border rounded-xl transition-all cursor-pointer group ${
                                                isSelected
                                                    ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50"
                                                    : hasNew
                                                        ? "bg-blue-50/40 dark:bg-blue-900/5 border-blue-200/60 dark:border-blue-800/30"
                                                        : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
                                            } hover:shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700`}
                                        >
                                            <div className="flex items-center gap-3 p-3">
                                                {user?.role === "ADMIN" && (
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleGroupSelectForDelete(group.id)}
                                                        className="cursor-pointer accent-blue-500 flex-shrink-0"
                                                    />
                                                )}
                                                <button
                                                    onClick={() => { setSelectedGroup(group); setMemberPage(1); }}
                                                    className="flex items-center gap-3 flex-1 text-left min-w-0"
                                                >
                                                    <div className="relative flex-shrink-0">
                                                        <div className={`w-11 h-11 rounded-full ${getAvatarColor(group.name)} flex items-center justify-center text-white font-semibold text-sm shadow-sm`}>
                                                            {getInitials(group.name)}
                                                        </div>
                                                        {hasNew && (
                                                            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                                                                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-blue-500 border-2 border-white dark:border-zinc-950" />
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <h3 className={`text-sm truncate ${hasNew ? "font-bold text-zinc-900 dark:text-white" : "font-semibold text-zinc-900 dark:text-white"}`}>{group.name}</h3>
                                                            {timeStr && (
                                                                <span className={`text-[11px] flex-shrink-0 ${hasNew ? "font-semibold text-blue-600 dark:text-blue-400" : "text-zinc-400 dark:text-zinc-500"}`}>{timeStr}</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center justify-between gap-2 mt-0.5">
                                                            <p className={`text-xs truncate ${hasNew ? "text-zinc-700 dark:text-zinc-300 font-medium" : "text-zinc-500 dark:text-zinc-400"}`}>
                                                                {lastMsg
                                                                    ? `${lastMsg.user?.name?.split(" ")[0] || "Someone"}: ${lastMsg.content?.length > 35 ? lastMsg.content.slice(0, 35) + "..." : lastMsg.content}`
                                                                    : `${group.members?.length || 0} members`
                                                                }
                                                            </p>
                                                            {hasNew && (
                                                                <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
                                                                    new
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 text-sm rounded border">Prev</button>
                            <span className="text-sm">{page} / {totalPages}</span>
                            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 text-sm rounded border">Next</button>
                        </div>
                    )}
                </>
            ) : (
                <div className="flex flex-col h-[calc(100vh-140px)] overflow-hidden lg:h-auto lg:overflow-visible">
                    {/* Chat Header */}
                    <div className="flex items-center justify-between gap-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 mb-3 shadow-sm">
                        <div className="flex items-center gap-3 min-w-0">
                            <button
                                onClick={() => setSelectedGroup(null)}
                                aria-label="Go back"
                                className="flex items-center justify-center h-9 w-9 rounded-full active:scale-95 transition-all text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                            <div className={`flex-shrink-0 w-10 h-10 rounded-full ${getAvatarColor(selectedGroup.name)} flex items-center justify-center text-white font-semibold text-sm shadow-sm`}>
                                {getInitials(selectedGroup.name)}
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                                    <span className="sm:hidden">{shortText(selectedGroup.name, 12)}</span>
                                    <span className="hidden sm:inline">{selectedGroup.name}</span>
                                </h2>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">{activeGroupMembers.length} members</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <button onClick={() => setShowMembers((prev) => !prev)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition text-zinc-700 dark:text-zinc-300">Members</button>
                            {user?.role === "ADMIN" && (
                                <>
                                    <button onClick={openEdit} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition text-zinc-700 dark:text-zinc-300">Edit</button>
                                    <button onClick={handleClearChat} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition text-zinc-700 dark:text-zinc-300">Clear</button>
                                    <button onClick={handleDeleteGroup} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition">Delete</button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-3 h-full overflow-hidden lg:h-auto">
                        {/* Chat Area */}
                        <div className="flex-1 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 overflow-hidden flex flex-col h-full lg:h-[calc(100vh-230px)] lg:min-h-[420px] shadow-sm">
                            {/* Chat background pattern */}
                            <div className="p-4 flex-1 overflow-y-auto no-scrollbar space-y-1 bg-zinc-50/50 dark:bg-zinc-900/30">
                                {isMessagesLoading ? (
                                    <div className="space-y-4 py-2">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <div key={i} className={`flex items-end gap-2.5 ${i % 3 === 0 ? "justify-end" : ""}`}>
                                                {i % 3 !== 0 && <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse flex-shrink-0" />}
                                                <div className={`animate-pulse ${i % 3 === 0 ? "max-w-[65%] ml-auto" : "max-w-[65%]"}`}>
                                                    {i % 3 !== 0 && <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded mb-1.5" />}
                                                    <div className={`rounded-2xl px-4 py-3 ${i % 3 === 0 ? "bg-blue-100 dark:bg-blue-900/30" : "bg-white dark:bg-zinc-800"}`}>
                                                        <div className={`h-4 bg-zinc-200 dark:bg-zinc-700 rounded ${i % 2 === 0 ? "w-48" : "w-32"}`} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                                        <div className={`w-16 h-16 rounded-full ${getAvatarColor(selectedGroup.name)} flex items-center justify-center text-white text-xl font-bold mb-4 opacity-60`}>
                                            {getInitials(selectedGroup.name)}
                                        </div>
                                        <p className="text-sm text-zinc-400 dark:text-zinc-500">No messages yet</p>
                                        <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-1">Start the conversation!</p>
                                    </div>
                                ) : (
                                    messages.map((msg, idx) => {
                                        const isMe = msg.user?.id === user?.id || msg.userId === user?.id;
                                        const senderName = msg.user?.name || msg.user?.email || "Unknown";
                                        const prevMsg = messages[idx - 1];
                                        const sameSenderAsPrev = prevMsg && (prevMsg.user?.id === msg.user?.id || prevMsg.userId === msg.userId);
                                        const showAvatar = !isMe && !sameSenderAsPrev;
                                        const showName = !isMe && !sameSenderAsPrev;
                                        return (
                                            <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "justify-end" : ""} ${sameSenderAsPrev ? "mt-0.5" : "mt-3"}`}>
                                                {!isMe && (
                                                    <div className="w-7 flex-shrink-0">
                                                        {showAvatar && (
                                                            <div className={`w-7 h-7 rounded-full ${getAvatarColor(senderName)} flex items-center justify-center text-white text-[10px] font-semibold`}>
                                                                {getInitials(senderName)}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                                                    {showName && (
                                                        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 ml-1 mb-0.5">{senderName}</span>
                                                    )}
                                                    <div className={`px-3.5 py-2 text-sm leading-relaxed ${
                                                        isMe
                                                            ? "bg-blue-500 text-white rounded-2xl rounded-br-md"
                                                            : "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-2xl rounded-bl-md border border-zinc-200 dark:border-zinc-700/50"
                                                    }`}>
                                                        {msg.content}
                                                    </div>
                                                    <span className={`text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 ${isMe ? "mr-1 text-right" : "ml-1"}`}>
                                                        {toIST(msg.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: TIMEZONE })}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                            {/* Message Input */}
                            <div className="border-t border-zinc-200 dark:border-zinc-800 p-3 flex items-center gap-2 bg-white dark:bg-zinc-950">
                                <input
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 rounded-full bg-zinc-100 dark:bg-zinc-900 border-0 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendMessage(); } }}
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={isSending || !newMessage.trim()}
                                    className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-40 disabled:hover:bg-blue-500 transition-all active:scale-95"
                                >
                                    {isSending ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Desktop Members Sidebar */}
                        <div className="w-full lg:w-80 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 h-full lg:h-[calc(100vh-230px)] lg:min-h-[420px] flex-col hidden lg:flex shadow-sm overflow-hidden">
                            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Members</h3>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{activeGroupMembers.length} members in this group</p>
                            </div>
                            <div className="flex-1 overflow-y-auto no-scrollbar p-2">
                                {activeGroupMembers.map((member) => {
                                    const name = member.user?.name || member.user?.email || "Unknown";
                                    return (
                                        <div key={member.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition">
                                            <div className={`w-9 h-9 rounded-full ${getAvatarColor(name)} flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 shadow-sm`}>
                                                {getInitials(name)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{name}</p>
                                                {member.user?.email && (
                                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{member.user.email}</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Mobile Members Sheet */}
                    {showMembers && (
                        <div className="fixed inset-0 z-50 lg:hidden">
                            <button
                                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                                onClick={() => setShowMembers(false)}
                                aria-label="Close members"
                            />
                            <div className="absolute bottom-0 left-0 right-0 h-[75vh] bg-white dark:bg-zinc-950 rounded-t-2xl border-t border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col animate-slide-up">
                                <div className="flex justify-center pt-2 pb-1">
                                    <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                                </div>
                                <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Members</h3>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{activeGroupMembers.length} members</p>
                                    </div>
                                    <button className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition" onClick={() => setShowMembers(false)}>Close</button>
                                </div>
                                <div className="flex-1 overflow-y-auto no-scrollbar p-2">
                                    {activeGroupMembers.map((member) => {
                                        const name = member.user?.name || member.user?.email || "Unknown";
                                        return (
                                            <div key={member.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
                                                <div className={`w-10 h-10 rounded-full ${getAvatarColor(name)} flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 shadow-sm`}>
                                                    {getInitials(name)}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{name}</p>
                                                    {member.user?.email && (
                                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{member.user.email}</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {isEditOpen && (
                        <div className="fixed inset-0 z-50 bg-white dark:bg-zinc-950">
                            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                                <h3 className="text-lg font-semibold">Edit Members</h3>
                                <div className="flex items-center gap-3">
                                    <button onClick={handleSaveMembers} className="px-4 py-2 rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm">Save</button>
                                    <button onClick={() => setIsEditOpen(false)} className="px-4 py-2 rounded border text-sm">Close</button>
                                </div>
                            </div>
                            <div className="p-4 sm:p-6">
                                <div className="flex items-center justify-between mb-3 gap-2">
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => { setMemberFilter("ALL"); setMemberPage(1); }} className={`px-3 py-1 text-sm rounded ${memberFilter==="ALL"?"bg-zinc-100 dark:bg-zinc-900":"border"}`}>All</button>
                                        <button onClick={() => { setMemberFilter("NOT_IN_ANY"); setMemberPage(1); }} className={`px-3 py-1 text-sm rounded ${memberFilter==="NOT_IN_ANY"?"bg-zinc-100 dark:bg-zinc-900":"border"}`}>Not in any group</button>
                                        <button onClick={() => { setMemberFilter("IN_CURRENT"); setMemberPage(1); }} className={`px-3 py-1 text-sm rounded ${memberFilter==="IN_CURRENT"?"bg-zinc-100 dark:bg-zinc-900":"border"}`}>In this group</button>
                                        <button onClick={() => { setMemberFilter("IN_OTHER"); setMemberPage(1); }} className={`px-3 py-1 text-sm rounded ${memberFilter==="IN_OTHER"?"bg-zinc-100 dark:bg-zinc-900":"border"}`}>In other groups</button>
                                    </div>
                                    <div className="text-xs text-zinc-500">Showing {workspaceFilteredMembers.length} members</div>
                                </div>

                                <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-zinc-800">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
                                        <thead className="bg-gray-50 dark:bg-zinc-900/50">
                                            <tr>
                                                <th className="px-3 sm:px-4 py-2.5 text-left text-xs sm:text-sm"><input type="checkbox" onChange={handleSelectPage} checked={pagedWorkspaceMembers.length > 0 && pagedWorkspaceMembers.every((m) => selectedIds.has(m.userId))} /></th>
                                                <th className="px-3 sm:px-6 py-2.5 text-left font-medium text-xs sm:text-sm">Name</th>
                                                <th className="px-3 sm:px-6 py-2.5 text-left font-medium text-xs sm:text-sm">Email</th>
                                                <th className="px-3 sm:px-6 py-2.5 text-left font-medium text-xs sm:text-sm">Groups</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                                            {pagedWorkspaceMembers.map((member) => (
                                                <tr key={member.id}>
                                                    <td className="px-3 sm:px-4 py-2.5"><input type="checkbox" checked={selectedIds.has(member.userId)} onChange={() => handleToggle(member.userId)} /></td>
                                                    <td className="px-3 sm:px-6 py-2.5 text-xs sm:text-sm text-zinc-800 dark:text-white">
                                                        <span className="sm:hidden">{shortText(member.user?.name || "Unknown")}</span>
                                                        <span className="hidden sm:inline">{member.user?.name || "Unknown"}</span>
                                                    </td>
                                                    <td className="px-3 sm:px-6 py-2.5 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                                                        <span className="sm:hidden">{shortText(member.user?.email || "")}</span>
                                                        <span className="hidden sm:inline">{member.user?.email}</span>
                                                    </td>
                                                    <td className="px-3 sm:px-6 py-2.5 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                                                        {(() => {
                                                            const ug = userGroupsMap[member.userId] || [];
                                                            if (ug.length === 0) return <span className="text-xs text-zinc-400">—</span>;
                                                            return ug.map((g) => (
                                                                <span key={g.id} className={`inline-block text-xs mr-2 px-2 py-0.5 rounded ${selectedGroup && g.id===selectedGroup.id ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800'}`}>
                                                                    {g.name}{selectedGroup && g.id===selectedGroup.id ? ' (current)' : ''}
                                                                </span>
                                                            ));
                                                        })()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex items-center gap-2 mt-4">
                                    <button disabled={memberPage === 1} onClick={() => setMemberPage((p) => p - 1)} className="px-3 py-1 text-sm rounded border">Prev</button>
                                    <span className="text-sm">{memberPage} / {totalWorkspacePages}</span>
                                    <button disabled={memberPage === totalWorkspacePages} onClick={() => setMemberPage((p) => p + 1)} className="px-3 py-1 text-sm rounded border">Next</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Broadcast Message Modal */}
            {isBroadcastOpen && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-950 rounded-lg max-w-md w-full p-6 space-y-4">
                        <div>
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Broadcast Message</h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                                Send a message to {selectedGroupsForDelete.size} selected group(s)
                            </p>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3">
                            <div className="text-xs font-medium text-blue-900 dark:text-blue-200 mb-2">Sending to:</div>
                            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                                {visibleGroups
                                    .filter((g) => selectedGroupsForDelete.has(g.id))
                                    .map((group) => (
                                        <span key={group.id} className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300">
                                            {group.name}
                                        </span>
                                    ))}
                            </div>
                        </div>

                        <textarea
                            value={broadcastMessage}
                            onChange={(e) => setBroadcastMessage(e.target.value)}
                            placeholder="Type your message..."
                            rows={4}
                            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:focus:border-zinc-600 resize-none"
                        />

                        <div className="flex gap-3 justify-end pt-2">
                            <button
                                onClick={() => { setIsBroadcastOpen(false); setBroadcastMessage(""); }}
                                className="px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBroadcastMessage}
                                disabled={!broadcastMessage.trim() || isBroadcasting}
                                className="px-4 py-2 rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white transition disabled:opacity-50"
                            >
                                {isBroadcasting ? "Sending..." : "Send to All"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Clear Chat Modal */}
            {isBulkClearChatOpen && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-950 rounded-lg max-w-md w-full p-6 space-y-4">
                        <div>
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Clear All Chats</h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                                Clear all messages in {selectedGroupsForDelete.size} selected group(s)? This cannot be undone.
                            </p>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded p-3">
                            <div className="text-xs font-medium text-amber-900 dark:text-amber-200 mb-2">Groups to clear:</div>
                            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                                {visibleGroups
                                    .filter((g) => selectedGroupsForDelete.has(g.id))
                                    .map((group) => (
                                        <span key={group.id} className="text-xs px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300">
                                            {group.name}
                                        </span>
                                    ))}
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end pt-2">
                            <button
                                onClick={() => setIsBulkClearChatOpen(false)}
                                className="px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkClearChat}
                                disabled={isBulkClearing}
                                className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-600 text-white transition disabled:opacity-50"
                            >
                                {isBulkClearing ? "Clearing..." : "Clear All Chats"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Delete Modal - Dual Confirmation */}
            {isBulkDeleteModalOpen && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-950 rounded-lg max-w-md w-full p-6 space-y-4">
                        <div>
                            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">⚠ Delete Groups</h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                                This will permanently delete {selectedGroupsForDelete.size} group(s), including all members and chat messages. This action cannot be undone.
                            </p>
                        </div>

                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
                            <div className="text-sm font-medium text-red-900 dark:text-red-200 mb-2">Groups to delete:</div>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                {visibleGroups
                                    .filter((g) => selectedGroupsForDelete.has(g.id))
                                    .map((group) => (
                                        <div key={group.id} className="text-sm text-red-800 dark:text-red-300 flex items-center gap-2">
                                            <span className="text-red-600 dark:text-red-400">•</span>
                                            {group.name} ({group.members?.length || 0} members)
                                        </div>
                                    ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-sm text-zinc-600 dark:text-zinc-400 block mb-1">
                                Type <span className="font-bold text-red-600 dark:text-red-400">{selectedGroupsForDelete.size}</span> to confirm:
                            </label>
                            <input
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder={`Type ${selectedGroupsForDelete.size}`}
                                className="w-full rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-red-400"
                            />
                        </div>

                        <div className="flex gap-3 justify-end pt-2">
                            <button
                                onClick={() => { setIsBulkDeleteModalOpen(false); setDeleteConfirmText(""); }}
                                className="px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkDeleteGroups}
                                disabled={deleteConfirmText !== String(selectedGroupsForDelete.size)}
                                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Delete Groups
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Groups;