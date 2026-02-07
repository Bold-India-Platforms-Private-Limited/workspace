import { useEffect, useMemo, useRef, useState } from "react";
import api from "../configs/api";
import { useSelector } from "react-redux";
import { ArrowLeft, UsersIcon, MessageCircle } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

const PAGE_SIZE = 20;

const Groups = () => {
    const { getToken } = useAuth();
    const { user } = useAuth();
    const currentWorkspace = useSelector((state) => state?.workspace?.currentWorkspace || null);
    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [page, setPage] = useState(1);
    const [memberPage, setMemberPage] = useState(1);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [showMembers, setShowMembers] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
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

    useEffect(() => {
        fetchGroups();
    }, [currentWorkspace]);

    const visibleGroups = useMemo(() => {
        if (user?.role === "ADMIN") return groups;
        return groups.filter((group) => group.members?.some((m) => m.userId === user?.id));
    }, [groups, user]);

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
    const activeGroupMembers = useMemo(() => {
        if (!groupMembers.length) return [];
        const workspaceIds = new Set(allWorkspaceMembers.map((m) => m.userId));
        return groupMembers.filter((member) => workspaceIds.has(member.userId));
    }, [groupMembers, allWorkspaceMembers]);
    const pagedWorkspaceMembers = useMemo(() => {
        const start = (memberPage - 1) * PAGE_SIZE;
        return allWorkspaceMembers.slice(start, start + PAGE_SIZE);
    }, [allWorkspaceMembers, memberPage]);
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
            return () => clearInterval(interval);
        }
    }, [selectedGroup]);

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
                        <div className="text-zinc-500 dark:text-zinc-400">No groups found.</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {pagedGroups.map((group) => (
                                <button
                                    key={group.id}
                                    onClick={() => { setSelectedGroup(group); setMemberPage(1); }}
                                    className="text-left bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 hover:border-zinc-300 dark:hover:border-zinc-700"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-semibold text-zinc-900 dark:text-white">{group.name}</h3>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{group.members?.length || 0} members</p>
                                        </div>
                                        <UsersIcon className="size-4 text-zinc-500 dark:text-zinc-400" />
                                    </div>
                                </button>
                            ))}
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
                            <button onClick={() => setSelectedGroup(null)} className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                                <ArrowLeft className="size-4" /> Back
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
                                <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-zinc-800">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
                                        <thead className="bg-gray-50 dark:bg-zinc-900/50">
                                            <tr>
                                                <th className="px-3 sm:px-4 py-2.5 text-left text-xs sm:text-sm"><input type="checkbox" onChange={handleSelectPage} checked={pagedWorkspaceMembers.length > 0 && pagedWorkspaceMembers.every((m) => selectedIds.has(m.userId))} /></th>
                                                <th className="px-3 sm:px-6 py-2.5 text-left font-medium text-xs sm:text-sm">Name</th>
                                                <th className="px-3 sm:px-6 py-2.5 text-left font-medium text-xs sm:text-sm">Email</th>
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
        </div>
    );
};

export default Groups;