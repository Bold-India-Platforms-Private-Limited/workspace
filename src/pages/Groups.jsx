import { useEffect, useMemo, useRef, useState } from "react";
import api from "../configs/api";
import { useSelector } from "react-redux";
import { ArrowLeft, UsersIcon, MessageCircle, Trash2, Search, Send, MessageSquareOff } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
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
    const [sortFilter, setSortFilter] = useState("latest");
    const [groupSearch, setGroupSearch] = useState("");
    const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
    const [broadcastMessage, setBroadcastMessage] = useState("");
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [isBulkClearChatOpen, setIsBulkClearChatOpen] = useState(false);
    const [isBulkClearing, setIsBulkClearing] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [groupLastMessages, setGroupLastMessages] = useState({});
    const [seenMessages, setSeenMessages] = useState(() => {
        try { return JSON.parse(localStorage.getItem("seenGroupMessages") || "{}"); } catch { return {}; }
    });
    const messagesEndRef = useRef(null);

    const shortText = (value, max = 5) => {
        const text = String(value || "");
        return text.length > max ? `${text.slice(0, max)}...` : text;
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
        if (!currentWorkspace || user?.role !== "ADMIN") return;
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
        if (groups.length > 0 && user?.role === "ADMIN") {
            fetchGroupLastMessages();
        }
    }, [groups]);

    const visibleGroups = useMemo(() => {
        let filtered = user?.role === "ADMIN" ? [...groups] : groups.filter((group) => group.members?.some((m) => m.userId === user?.id));
        if (groupSearch.trim()) {
            const term = groupSearch.trim().toLowerCase();
            filtered = filtered.filter((g) => g.name?.toLowerCase().includes(term));
        }
        if (user?.role === "ADMIN" && sortFilter === "conversations") {
            filtered.sort((a, b) => {
                const msgA = groupLastMessages[a.id]?.createdAt ? new Date(groupLastMessages[a.id].createdAt).getTime() : 0;
                const msgB = groupLastMessages[b.id]?.createdAt ? new Date(groupLastMessages[b.id].createdAt).getTime() : 0;
                return msgB - msgA;
            });
        } else if (user?.role === "ADMIN" && sortFilter === "latest") {
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

    const fetchMessages = async () => {
        if (!selectedGroup) return;
        const { data } = await api.get(`/api/groups/${selectedGroup.id}/messages`, { headers: { Authorization: `Bearer ${await getToken()}` } });
        setMessages(data.messages || []);
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
        if (!newMessage.trim()) return;
        const { data } = await api.post(
            `/api/groups/${selectedGroup.id}/messages`,
            { content: newMessage },
            { headers: { Authorization: `Bearer ${await getToken()}` } }
        );
        setMessages((prev) => prev.concat(data.message));
        setNewMessage("");
    };

    useEffect(() => {
        if (selectedGroup) {
            fetchMessages();
            const interval = setInterval(fetchMessages, 10000);
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
                        {user?.role === "ADMIN" && (
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
                        )}
                    </div>

                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Array.from({ length: 6 }).map((_, idx) => (
                                <div key={idx} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 animate-pulse">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-2">
                                            <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
                                            <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
                                        </div>
                                        <div className="h-6 w-6 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : visibleGroups.length === 0 ? (
                        <div className="text-zinc-500 dark:text-zinc-400">No groups found; Your Project Manager will create shortly.</div>
                        
                    ) : (
                        <div>
                            {user?.role === "ADMIN" && visibleGroups.length > 0 && (
                                <div className="mb-4 flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
                                    <input 
                                        type="checkbox" 
                                        checked={pagedGroups.length > 0 && pagedGroups.every((g) => selectedGroupsForDelete.has(g.id))}
                                        onChange={toggleSelectAllGroupsForDelete}
                                        className="cursor-pointer"
                                    />
                                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                        {pagedGroups.length > 0 && pagedGroups.every((g) => selectedGroupsForDelete.has(g.id)) 
                                            ? "Deselect all on this page" 
                                            : "Select all on this page"}
                                    </span>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {pagedGroups.map((group) => (
                                    <div
                                        key={group.id}
                                        className={`text-left border rounded-lg p-4 transition ${
                                            selectedGroupsForDelete.has(group.id)
                                                ? "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700"
                                                : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
                                        } hover:border-zinc-300 dark:hover:border-zinc-700`}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex-1 flex items-center gap-3">
                                                {user?.role === "ADMIN" && (
                                                    <input 
                                                        type="checkbox"
                                                        checked={selectedGroupsForDelete.has(group.id)}
                                                        onChange={() => toggleGroupSelectForDelete(group.id)}
                                                        className="cursor-pointer"
                                                    />
                                                )}
                                                <button
                                                    onClick={() => { setSelectedGroup(group); setMemberPage(1); }}
                                                    className="flex-1 text-left"
                                                >
                                                    <h3 className="font-semibold text-zinc-900 dark:text-white">{group.name}</h3>
                                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{group.members?.length || 0} members</p>
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {(() => {
                                                    const lastMsg = groupLastMessages[group.id];
                                                    const hasNew = lastMsg && seenMessages[group.id] !== lastMsg.id;
                                                    return hasNew ? (
                                                        <span className="relative flex h-2.5 w-2.5">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
                                                        </span>
                                                    ) : null;
                                                })()}
                                                <UsersIcon className="size-4 text-zinc-500 dark:text-zinc-400" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
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
                <div className="flex flex-col gap-4 h-[calc(100vh-140px)] overflow-hidden lg:h-auto lg:overflow-visible">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <button
  onClick={() => setSelectedGroup(null)}
  aria-label="Go back"
  className="
    flex items-center justify-center
    h-10 w-10
    rounded-full
    active:scale-95
    transition-all
    text-gray-700 dark:text-gray-200
    hover:bg-gray-100 dark:hover:bg-gray-800
    active:bg-gray-200 dark:active:bg-gray-700
    focus:outline-none focus:ring-2 focus:ring-blue-500
  "
>
  <ArrowLeft className="h-5 w-5" />
</button>
                            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                                <span className="sm:hidden">{shortText(selectedGroup.name)}</span>
                                <span className="hidden sm:inline">{selectedGroup.name}</span>
                            </h2>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => setShowMembers((prev) => !prev)} className="px-3 py-1.5 text-sm rounded border">Members</button>
                            {user?.role === "ADMIN" && (
                                <>
                                    <button onClick={openEdit} className="px-3 py-1.5 text-sm rounded border">Edit Members</button>
                                    <button onClick={handleClearChat} className="px-3 py-1.5 text-sm rounded border">Clear Chat</button>
                                    <button onClick={handleDeleteGroup} className="px-3 py-1.5 text-sm rounded border text-red-600 dark:text-red-400 border-red-300 dark:border-red-700">Delete Group</button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-4 lg:h-auto h-full overflow-hidden">
                        <div className="flex-1 border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 overflow-hidden flex flex-col h-full lg:h-[calc(100vh-220px)] lg:min-h-[420px]">
                            <div className="border-b border-gray-200 dark:border-zinc-800 p-3 flex items-center gap-2 text-sm">
                                <MessageCircle className="size-4" /> Group Chat
                            </div>
                            <div className="p-4 flex-1 overflow-y-auto no-scrollbar space-y-3">
                                {messages.length === 0 ? (
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">No messages yet.</p>
                                ) : (
                                    messages.map((msg) => (
                                        <div key={msg.id} className="text-sm">
                                            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                                                <span className="font-medium text-zinc-900 dark:text-white">{msg.user?.name || msg.user?.email}</span>
                                                <span>• {new Date(msg.createdAt).toLocaleString()}</span>
                                            </div>
                                            <div className="bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded px-3 py-2">
                                                {msg.content}
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                            <div className="border-t border-gray-200 dark:border-zinc-800 p-3 flex items-center gap-2">
                                <input
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 px-3 py-2 text-sm"
                                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendMessage(); } }}
                                />
                                <button onClick={sendMessage} className="px-4 py-2 rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm">
                                    Send
                                </button>
                            </div>
                        </div>

                        <div className={`w-full lg:w-72 border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 p-4 h-full lg:h-[calc(100vh-220px)] lg:min-h-[420px] flex-col hidden lg:flex`}>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold">Members</h3>
                            </div>
                            <div className="space-y-2 flex-1 overflow-y-auto no-scrollbar">
                                {activeGroupMembers.map((member) => (
                                    <div key={member.id} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                        <span>{member.user?.name || member.user?.email}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {showMembers && (
                        <div className="fixed inset-0 z-50 lg:hidden">
                            <button
                                className="absolute inset-0 bg-black/40"
                                onClick={() => setShowMembers(false)}
                                aria-label="Close members"
                            />
                            <div className="absolute bottom-0 left-0 right-0 h-[70vh] bg-white dark:bg-zinc-950 rounded-t-2xl border-t border-zinc-200 dark:border-zinc-800 shadow-xl flex flex-col animate-slide-up">
                                <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                                    <h3 className="text-sm font-semibold">Members</h3>
                                    <button className="text-xs text-zinc-500" onClick={() => setShowMembers(false)}>Close</button>
                                </div>
                                <div className="p-4 flex-1 overflow-y-auto no-scrollbar space-y-2">
                                    {activeGroupMembers.map((member) => (
                                        <div key={member.id} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1" />
                                            <div className="flex flex-col">
                                                <span>{member.user?.name || member.user?.email}</span>
                                                <span className="text-xs text-zinc-500 dark:text-zinc-400">{member.user?.email}</span>
                                            </div>
                                        </div>
                                    ))}
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