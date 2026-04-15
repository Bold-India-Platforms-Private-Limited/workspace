import { useEffect, useMemo, useState, useRef } from "react";
import { UsersIcon, Search, UserPlus, Shield, Activity, XIcon, Plus, RefreshCw, Wifi, WifiOff } from "lucide-react";
import InviteMemberDialog from "../components/InviteMemberDialog";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../auth/AuthContext";
import api from "../configs/api";
import toast from "react-hot-toast";
import { fetchWorkspaces } from "../features/workspaceSlice";
import { useNavigate } from "react-router-dom";
import { getSocket } from "../configs/socket";

const Team = () => {

    const [tasks, setTasks] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
    const [isBulkGenerateModalOpen, setIsBulkGenerateModalOpen] = useState(false);
    const [groupName, setGroupName] = useState("");
    const [selectedMembers, setSelectedMembers] = useState(new Set());
    const [page, setPage] = useState(1);
    const [removePage, setRemovePage] = useState(1);
    const [removeSelected, setRemoveSelected] = useState(new Set());
    const [users, setUsers] = useState([]);
    const [groupFilter, setGroupFilter] = useState("not-in-group");
    const [membersPerGroup, setMembersPerGroup] = useState(10);
    const [bulkGenerateLoading, setBulkGenerateLoading] = useState(false);

    // Regenerate credentials state
    const [regeneratingId, setRegeneratingId] = useState(null);

    // Search-by-email remove state
    const [emailSearch, setEmailSearch] = useState("");
    const [emailSearchResult, setEmailSearchResult] = useState(null);
    const [emailSearchLoading, setEmailSearchLoading] = useState(false);
    const [emailSearchError, setEmailSearchError] = useState("");
    const [removingByEmail, setRemovingByEmail] = useState(false);
    const [isEmailSearchModalOpen, setIsEmailSearchModalOpen] = useState(false);

    // Socket / active users state — only alive while the panel is open
    const [showActiveUsers, setShowActiveUsers] = useState(false);
    const [activeUsers, setActiveUsers] = useState([]);
    const [socketConnected, setSocketConnected] = useState(false);
    const socketRef = useRef(null);

    const { user, getToken } = useAuth();
    const currentWorkspace = useSelector((state) => state?.workspace?.currentWorkspace || null);
    const projects = currentWorkspace?.projects || [];
    const groups = currentWorkspace?.groups || [];
    const PAGE_SIZE = 20;
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // ─── Socket.io — connect ONLY when panel is open, disconnect when closed ───
    useEffect(() => {
        // Do nothing until admin explicitly opens the panel
        if (!showActiveUsers || !user || !currentWorkspace?.id) return;

        const socket = getSocket();
        socketRef.current = socket;

        socket.connect();

        socket.on('connect', () => {
            setSocketConnected(true);
            socket.emit('join_workspace', {
                workspaceId: currentWorkspace.id,
                userId: user.id,
                name: user.name,
                email: user.email,
            });
        });

        socket.on('disconnect', () => {
            setSocketConnected(false);
        });

        socket.on('active_users', (list) => {
            setActiveUsers(list || []);
        });

        // Cleanup: disconnect as soon as panel closes or component unmounts
        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('active_users');
            socket.disconnect();
            setSocketConnected(false);
            setActiveUsers([]);
        };
    }, [showActiveUsers, user?.id, currentWorkspace?.id]);

    const shortText = (value, max = 5) => {
        const text = String(value || "");
        return text.length > max ? `${text.slice(0, max)}...` : text;
    };

    const generateUniqueGroupName = () => {
        const baseName = "FMBF";
        const existingNumbers = groups
            .map((g) => {
                const match = g.name?.match(/^(\d+)FMBF$/);
                return match ? parseInt(match[1], 10) : 0;
            })
            .filter((num) => num > 0);

        const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 7;
        const nextNumber = maxNumber + 1;

        return `${nextNumber}${baseName}`;
    };

    const getInitials = (nameOrEmail = "") => {
        const value = String(nameOrEmail).trim();
        if (!value) return "U";
        const parts = value.split(/\s+/).filter(Boolean);
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const getUserGroups = (userId) => {
        return groups.filter((group) => group.members?.some((m) => m.userId === userId));
    };

    const getFilteredMembersForModal = () => {
        const allMembers = currentWorkspace?.members || [];
        const membersWithoutAdmin = allMembers.slice(1);
        if (groupFilter === "not-in-group") {
            return membersWithoutAdmin.filter((member) => getUserGroups(member.userId).length === 0);
        } else if (groupFilter === "in-group") {
            return membersWithoutAdmin.filter((member) => getUserGroups(member.userId).length > 0);
        }
        return membersWithoutAdmin;
    };

    const filteredUsers = users.filter(
        (u) =>
            u?.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u?.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        if (selectedMembers.size > 0 && !groupName) {
            setGroupName(generateUniqueGroupName());
        }
    }, [selectedMembers, isGroupModalOpen]);

    useEffect(() => {
        setUsers(currentWorkspace?.members || []);
        setTasks(currentWorkspace?.projects?.reduce((acc, project) => [...acc, ...project.tasks], []) || []);
    }, [currentWorkspace]);

    const pagedMembers = useMemo(() => {
        const filteredMembers = getFilteredMembersForModal();
        const start = (page - 1) * PAGE_SIZE;
        return filteredMembers.slice(start, start + PAGE_SIZE);
    }, [currentWorkspace, page, groupFilter, groups]);

    const totalPages = Math.ceil((getFilteredMembersForModal().length) / PAGE_SIZE) || 1;
    const removeTotalPages = Math.ceil((currentWorkspace?.members?.length || 0) / PAGE_SIZE) || 1;
    const removePagedMembers = useMemo(() => {
        const start = (removePage - 1) * PAGE_SIZE;
        return (currentWorkspace?.members || []).slice(start, start + PAGE_SIZE);
    }, [currentWorkspace, removePage]);

    const toggleSelectMember = (userId) => {
        setSelectedMembers((prev) => {
            const copy = new Set(prev);
            if (copy.has(userId)) copy.delete(userId);
            else copy.add(userId);
            return copy;
        });
    };

    const toggleSelectPage = () => {
        setSelectedMembers((prev) => {
            const copy = new Set(prev);
            const pageIds = pagedMembers.map((m) => m.userId);
            const allSelected = pageIds.every((id) => copy.has(id));
            pageIds.forEach((id) => {
                if (allSelected) copy.delete(id);
                else copy.add(id);
            });
            return copy;
        });
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim()) return toast.error("Group name is required");
        try {
            const memberIds = Array.from(selectedMembers);
            const { data } = await api.post(
                "/api/groups",
                { workspaceId: currentWorkspace.id, name: groupName.trim(), memberIds },
                { headers: { Authorization: `Bearer ${await getToken()}` } }
            );
            toast.success(data.message || "Group created");
            setIsGroupModalOpen(false);
            setGroupName("");
            setSelectedMembers(new Set());
            dispatch(fetchWorkspaces({ getToken }));
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        }
    };

    const toggleRemoveSelect = (userId) => {
        setRemoveSelected((prev) => {
            const next = new Set(prev);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });
    };

    const toggleRemoveSelectPage = () => {
        setRemoveSelected((prev) => {
            const next = new Set(prev);
            const ids = removePagedMembers.map((m) => m.userId);
            const allSelected = ids.every((id) => next.has(id));
            ids.forEach((id) => {
                if (allSelected) next.delete(id);
                else next.add(id);
            });
            return next;
        });
    };

    const handleQuickSelect = (count) => {
        const notInGroupMembers = getFilteredMembersForModal();
        const idsToSelect = notInGroupMembers.slice(0, count).map((m) => m.userId);
        setSelectedMembers(new Set(idsToSelect));
        setGroupName(generateUniqueGroupName());
    };

    const handleRemoveMembers = async () => {
        try {
            const userIds = Array.from(removeSelected);
            await api.delete(`/api/workspaces/${currentWorkspace.id}/members`, { data: { userIds }, headers: { Authorization: `Bearer ${await getToken()}` } });
            toast.success("Members removed successfully");
            setIsRemoveModalOpen(false);
            setRemoveSelected(new Set());
            dispatch(fetchWorkspaces({ getToken }));
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        }
    };

    // ─── Regenerate credentials ────────────────────────────────────────────────
    const handleRegenerateCredentials = async (memberId, memberEmail) => {
        if (!window.confirm(`Regenerate login credentials for ${memberEmail}? A new password will be sent to their email.`)) return;
        try {
            setRegeneratingId(memberId);
            await api.post(
                `/api/workspaces/${currentWorkspace.id}/members/${memberId}/regenerate-credentials`,
                {},
                { headers: { Authorization: `Bearer ${await getToken()}` } }
            );
            toast.success(`New credentials sent to ${memberEmail}`);
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        } finally {
            setRegeneratingId(null);
        }
    };

    // ─── Search by email + remove ─────────────────────────────────────────────
    const handleEmailSearch = async () => {
        if (!emailSearch.trim()) return;
        try {
            setEmailSearchLoading(true);
            setEmailSearchError("");
            setEmailSearchResult(null);
            const { data } = await api.get(
                `/api/workspaces/${currentWorkspace.id}/members/search?email=${encodeURIComponent(emailSearch.trim())}`,
                { headers: { Authorization: `Bearer ${await getToken()}` } }
            );
            setEmailSearchResult(data.member);
        } catch (error) {
            setEmailSearchError(error.response?.data?.message || "Member not found");
        } finally {
            setEmailSearchLoading(false);
        }
    };

    const handleRemoveByEmail = async () => {
        if (!emailSearchResult) return;
        if (!window.confirm(`Remove ${emailSearchResult.user?.email} from this workspace?`)) return;
        try {
            setRemovingByEmail(true);
            await api.delete(`/api/workspaces/${currentWorkspace.id}/members`, {
                data: { userIds: [emailSearchResult.userId] },
                headers: { Authorization: `Bearer ${await getToken()}` },
            });
            toast.success("Member removed successfully");
            setEmailSearch("");
            setEmailSearchResult(null);
            setIsEmailSearchModalOpen(false);
            dispatch(fetchWorkspaces({ getToken }));
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        } finally {
            setRemovingByEmail(false);
        }
    };

    const getBulkGenerationPreview = () => {
        const notInGroupMembers = getFilteredMembersForModal();
        const totalMembers = notInGroupMembers.length;
        const groupsNeeded = Math.ceil(totalMembers / membersPerGroup);
        const fullGroups = Math.floor(totalMembers / membersPerGroup);
        const remainingMembers = totalMembers % membersPerGroup;

        return {
            totalMembers,
            groupsNeeded,
            fullGroups,
            remainingMembers,
            members: notInGroupMembers,
        };
    };

    const handleBulkGenerateGroups = async () => {
        try {
            setBulkGenerateLoading(true);
            const { members, groupsNeeded, fullGroups, remainingMembers } = getBulkGenerationPreview();

            const groupsToCreate = [];
            let memberIndex = 0;

            for (let i = 0; i < fullGroups; i++) {
                const groupMembers = members.slice(memberIndex, memberIndex + membersPerGroup);
                const baseName = "FMBF";
                const existingNumbers = groups
                    .map((g) => {
                        const match = g.name?.match(/^(\d+)FMBF$/);
                        return match ? parseInt(match[1], 10) : 0;
                    })
                    .filter((num) => num > 0);

                const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 7;
                const nextNumber = maxNumber + groupsToCreate.length + 1;

                groupsToCreate.push({
                    name: `${nextNumber}${baseName}`,
                    memberIds: groupMembers.map((m) => m.userId),
                });

                memberIndex += membersPerGroup;
            }

            if (remainingMembers > 0) {
                const groupMembers = members.slice(memberIndex, memberIndex + remainingMembers);
                const baseName = "FMBF";
                const existingNumbers = groups
                    .map((g) => {
                        const match = g.name?.match(/^(\d+)FMBF$/);
                        return match ? parseInt(match[1], 10) : 0;
                    })
                    .filter((num) => num > 0);

                const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 7;
                const nextNumber = maxNumber + groupsToCreate.length + 1;

                groupsToCreate.push({
                    name: `${nextNumber}${baseName}`,
                    memberIds: groupMembers.map((m) => m.userId),
                });
            }

            for (const groupData of groupsToCreate) {
                await api.post(
                    "/api/groups",
                    { workspaceId: currentWorkspace.id, name: groupData.name, memberIds: groupData.memberIds },
                    { headers: { Authorization: `Bearer ${await getToken()}` } }
                );
            }

            toast.success(`Created ${groupsToCreate.length} groups successfully!`);
            setIsBulkGenerateModalOpen(false);
            setMembersPerGroup(10);
            dispatch(fetchWorkspaces({ getToken }));
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        } finally {
            setBulkGenerateLoading(false);
        }
    };

    if (user?.role !== "ADMIN") {
        return (
            <div className="p-6 text-center text-zinc-900 dark:text-zinc-200">
                <p className="text-2xl md:text-4xl mt-32 mb-6">Access denied</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Team management is available for admins only.</p>
                <button
                    onClick={() => navigate('/')}
                    className="mt-4 px-4 py-2 rounded bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-1">Team</h1>
                    <p className="text-gray-500 dark:text-zinc-400 text-sm">
                        Manage team members and their contributions
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {user?.role === "ADMIN" && (
                        <button
                            onClick={() => {
                                setEmailSearch("");
                                setEmailSearchResult(null);
                                setEmailSearchError("");
                                setIsEmailSearchModalOpen(true);
                            }}
                            className="flex items-center px-4 py-2 rounded text-sm border border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition w-full sm:w-auto"
                        >
                            <Search className="w-4 h-4 mr-2" /> Find & Remove
                        </button>
                    )}
                    {user?.role === "ADMIN" && (
                        <button onClick={() => {
                            setIsGroupModalOpen(true);
                            setGroupFilter("not-in-group");
                            setPage(1);
                        }} className="flex items-center px-4 py-2 rounded text-sm border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition w-full sm:w-auto" >
                            <Plus className="w-4 h-4 mr-2" /> Create Group
                        </button>
                    )}
                    {user?.role === "ADMIN" && (
                        <button onClick={() => setIsBulkGenerateModalOpen(true)} className="flex items-center px-4 py-2 rounded text-sm border border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition w-full sm:w-auto" >
                            <Plus className="w-4 h-4 mr-2" /> Generate Groups
                        </button>
                    )}
                    {user?.role === "ADMIN" && (
                        <button onClick={() => setIsRemoveModalOpen(true)} className="flex items-center px-4 py-2 rounded text-sm border border-red-300 dark:border-red-700 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition w-full sm:w-auto" >
                            Remove Members
                        </button>
                    )}
                    {user?.role === "ADMIN" && (
                        <button onClick={() => setIsDialogOpen(true)} className="flex items-center px-4 py-2 rounded text-sm bg-gradient-to-br from-blue-500 to-blue-600 hover:opacity-90 text-white transition w-full sm:w-auto" >
                            <UserPlus className="w-4 h-4 mr-2" /> Invite Member
                        </button>
                    )}
                </div>
                <InviteMemberDialog isDialogOpen={isDialogOpen} setIsDialogOpen={setIsDialogOpen} />
            </div>

            {/* Stats Cards */}
            <div className="flex flex-wrap gap-4">
                <div className="max-sm:w-full dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-gray-300 dark:border-zinc-800 rounded-lg p-6">
                    <div className="flex items-center justify-between gap-8 md:gap-22">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-zinc-400">Total Members</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{users.length}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-500/10">
                            <UsersIcon className="size-4 text-blue-500 dark:text-blue-200" />
                        </div>
                    </div>
                </div>

                <div className="max-sm:w-full dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-gray-300 dark:border-zinc-800 rounded-lg p-6">
                    <div className="flex items-center justify-between gap-8 md:gap-22">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-zinc-400">Active Projects</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">
                                {projects.filter((p) => p.status !== "CANCELLED" && p.status !== "COMPLETED").length}
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-500/10">
                            <Activity className="size-4 text-emerald-500 dark:text-emerald-200" />
                        </div>
                    </div>
                </div>

                <div className="max-sm:w-full dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-gray-300 dark:border-zinc-800 rounded-lg p-6">
                    <div className="flex items-center justify-between gap-8 md:gap-22">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-zinc-400">Total Tasks</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{tasks.length}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-500/10">
                            <Shield className="size-4 text-purple-500 dark:text-purple-200" />
                        </div>
                    </div>
                </div>

                {/* Active Users Card — click to open/close the live panel */}
                <button
                    onClick={() => setShowActiveUsers((v) => !v)}
                    className={`max-sm:w-full text-left dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border rounded-lg p-6 transition ${showActiveUsers ? "border-green-400 dark:border-green-600" : "border-gray-300 dark:border-zinc-800 hover:border-green-300 dark:hover:border-green-700"}`}
                >
                    <div className="flex items-center justify-between gap-8 md:gap-22">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-zinc-400">Online Now</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">
                                {showActiveUsers ? activeUsers.length : "—"}
                            </p>
                            <p className="text-xs text-zinc-400 mt-0.5">{showActiveUsers ? "Click to hide" : "Click to view"}</p>
                        </div>
                        <div className={`p-3 rounded-xl ${showActiveUsers && socketConnected ? "bg-green-100 dark:bg-green-500/10" : "bg-zinc-100 dark:bg-zinc-800"}`}>
                            {showActiveUsers && socketConnected
                                ? <Wifi className="size-4 text-green-500 dark:text-green-300" />
                                : <WifiOff className="size-4 text-zinc-400" />
                            }
                        </div>
                    </div>
                </button>
            </div>

            {/* Active Users Panel — only mounts (and connects socket) when admin opens it */}
            {user?.role === "ADMIN" && showActiveUsers && (
                <div className="dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-green-300 dark:border-green-800 rounded-lg p-4 sm:p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <div className={`w-2 h-2 rounded-full ${socketConnected ? "bg-green-500 animate-pulse" : "bg-zinc-400"}`} />
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                            Active Users — Live
                        </h2>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {socketConnected ? "Connected" : "Connecting..."}
                        </span>
                        <button
                            onClick={() => setShowActiveUsers(false)}
                            className="ml-auto p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                            title="Close panel and disconnect"
                        >
                            <XIcon className="size-3.5" />
                        </button>
                    </div>

                    {activeUsers.length === 0 ? (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 py-2">
                            {socketConnected ? "No users currently active in this workspace." : "Connecting to live feed..."}
                        </p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {activeUsers.map((u) => (
                                <div
                                    key={u.userId}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                                >
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                    <span className="text-xs font-medium text-green-800 dark:text-green-200">
                                        {u.name || u.email}
                                    </span>
                                    <span className="text-xs text-green-600 dark:text-green-400 opacity-70 hidden sm:inline">
                                        {u.email}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Group Create Modal */}
            {isGroupModalOpen && (
                <div className="fixed inset-0 z-50 bg-white dark:bg-zinc-950 h-screen">
                    <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                        <div className="flex flex-col gap-2 flex-1">
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">Group Name</div>
                            <input
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                placeholder="Select members to generate name"
                                className="text-2xl font-bold bg-transparent outline-none text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleCreateGroup}
                                disabled={!groupName.trim() || selectedMembers.size === 0}
                                className="px-4 py-2 rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Create
                            </button>
                            <button onClick={() => {
                                setIsGroupModalOpen(false);
                                setGroupName("");
                                setSelectedMembers(new Set());
                            }} className="p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800">
                                <XIcon className="size-4" />
                            </button>
                        </div>
                    </div>

                    <div className="p-4 sm:p-6 space-y-4">
                        {/* Filter and Quick Select */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <select
                                value={groupFilter}
                                onChange={(e) => { setGroupFilter(e.target.value); setPage(1); }}
                                className="rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-200 py-2 px-3 text-sm"
                            >
                                <option value="not-in-group">Not in any group</option>
                                <option value="in-group">In a group</option>
                                <option value="all">All members</option>
                            </select>
                            <div className="flex gap-2">
                                {[5, 10, 20].map((n) => (
                                    <button
                                        key={n}
                                        onClick={() => handleQuickSelect(n)}
                                        className="px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                    >
                                        Select {n}
                                    </button>
                                ))}
                                {selectedMembers.size > 0 && (
                                    <button
                                        onClick={() => setSelectedMembers(new Set())}
                                        className="px-3 py-1.5 rounded border border-red-300 dark:border-red-700 text-sm text-red-600 dark:text-red-300"
                                    >
                                        Clear ({selectedMembers.size})
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="rounded-md border border-gray-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[500px]">
                            <div className="overflow-x-auto overflow-y-auto flex-1">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
                                    <thead className="bg-gray-50 dark:bg-zinc-900/50 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-3 sm:px-4 py-2.5 text-left text-xs sm:text-sm w-12">SR No</th>
                                            <th className="px-3 sm:px-4 py-2.5 text-left text-xs sm:text-sm">
                                                <input type="checkbox" onChange={toggleSelectPage} checked={pagedMembers.length > 0 && pagedMembers.every((m) => selectedMembers.has(m.userId))} />
                                            </th>
                                            <th className="px-3 sm:px-6 py-2.5 text-left font-medium text-xs sm:text-sm">Name</th>
                                            <th className="px-3 sm:px-6 py-2.5 text-left font-medium text-xs sm:text-sm">Email</th>
                                            <th className="px-3 sm:px-6 py-2.5 text-left font-medium text-xs sm:text-sm hidden md:table-cell">Groups</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                                        {pagedMembers.map((member, index) => {
                                            const srNo = (page - 1) * PAGE_SIZE + index + 1;
                                            const memberGroups = getUserGroups(member.userId);
                                            return (
                                                <tr key={member.id} className={selectedMembers.has(member.userId) ? "bg-blue-50 dark:bg-blue-900/10" : ""}>
                                                    <td className="px-3 sm:px-4 py-2.5 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                                                        {srNo}
                                                    </td>
                                                    <td className="px-3 sm:px-4 py-2.5">
                                                        <input type="checkbox" checked={selectedMembers.has(member.userId)} onChange={() => toggleSelectMember(member.userId)} />
                                                    </td>
                                                    <td className="px-3 sm:px-6 py-2.5 text-xs sm:text-sm text-zinc-800 dark:text-white">
                                                        <span className="sm:hidden">{shortText(member.user?.name || "Unknown")}</span>
                                                        <span className="hidden sm:inline">{member.user?.name || "Unknown"}</span>
                                                    </td>
                                                    <td className="px-3 sm:px-6 py-2.5 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                                                        <span className="sm:hidden">{shortText(member.user?.email || "")}</span>
                                                        <span className="hidden sm:inline">{member.user?.email}</span>
                                                    </td>
                                                    <td className="px-3 sm:px-6 py-2.5 hidden md:table-cell">
                                                        {memberGroups.length === 0 ? (
                                                            <span className="text-xs text-zinc-400">No group</span>
                                                        ) : (
                                                            <div className="flex flex-wrap gap-1">
                                                                {memberGroups.map((g) => (
                                                                    <span key={g.id} className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                                                        {g.name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mt-4">
                            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 text-sm rounded border">Prev</button>
                            <span className="text-sm">{page} / {totalPages}</span>
                            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 text-sm rounded border">Next</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Remove Members Modal */}
            {isRemoveModalOpen && (
                <div className="fixed inset-0 z-50 bg-white dark:bg-zinc-950">
                    <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                        <h3 className="text-lg font-semibold">Remove Members</h3>
                        <div className="flex items-center gap-3">
                            <button onClick={handleRemoveMembers} className="px-4 py-2 rounded bg-red-600 text-white text-sm">Remove</button>
                            <button onClick={() => setIsRemoveModalOpen(false)} className="p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800">
                                <XIcon className="size-4" />
                            </button>
                        </div>
                    </div>

                    <div className="p-4 sm:p-6">
                        <div className="rounded-md border border-gray-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[500px]">
                            <div className="overflow-x-auto overflow-y-auto flex-1">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
                                    <thead className="bg-gray-50 dark:bg-zinc-900/50 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-3 sm:px-4 py-2.5 text-left text-xs sm:text-sm w-12">SR No</th>
                                            <th className="px-3 sm:px-4 py-2.5 text-left text-xs sm:text-sm">
                                                <input type="checkbox" onChange={toggleRemoveSelectPage} checked={removePagedMembers.length > 0 && removePagedMembers.every((m) => removeSelected.has(m.userId))} />
                                            </th>
                                            <th className="px-3 sm:px-6 py-2.5 text-left font-medium text-xs sm:text-sm">Name</th>
                                            <th className="px-3 sm:px-6 py-2.5 text-left font-medium text-xs sm:text-sm">Email</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                                        {removePagedMembers.map((member, index) => {
                                            const srNo = (removePage - 1) * PAGE_SIZE + index + 1;
                                            return (
                                                <tr key={member.id}>
                                                    <td className="px-3 sm:px-4 py-2.5 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                                                        {srNo}
                                                    </td>
                                                    <td className="px-3 sm:px-4 py-2.5">
                                                        <input type="checkbox" checked={removeSelected.has(member.userId)} onChange={() => toggleRemoveSelect(member.userId)} />
                                                    </td>
                                                    <td className="px-3 sm:px-6 py-2.5 text-xs sm:text-sm text-zinc-800 dark:text-white">
                                                        <span className="sm:hidden">{shortText(member.user?.name || "Unknown")}</span>
                                                        <span className="hidden sm:inline">{member.user?.name || "Unknown"}</span>
                                                    </td>
                                                    <td className="px-3 sm:px-6 py-2.5 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                                                        <span className="sm:hidden">{shortText(member.user?.email || "")}</span>
                                                        <span className="hidden sm:inline">{member.user?.email}</span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mt-4">
                            <button disabled={removePage === 1} onClick={() => setRemovePage((p) => p - 1)} className="px-3 py-1 text-sm rounded border">Prev</button>
                            <span className="text-sm">{removePage} / {removeTotalPages}</span>
                            <button disabled={removePage === removeTotalPages} onClick={() => setRemovePage((p) => p + 1)} className="px-3 py-1 text-sm rounded border">Next</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Find & Remove by Email Modal */}
            {isEmailSearchModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-950 rounded-lg w-full max-w-md p-6 space-y-4 border border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Find & Remove Member by Email</h3>
                            <button
                                onClick={() => {
                                    setIsEmailSearchModalOpen(false);
                                    setEmailSearch("");
                                    setEmailSearchResult(null);
                                    setEmailSearchError("");
                                }}
                                className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                                <XIcon className="size-4" />
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <input
                                type="email"
                                value={emailSearch}
                                onChange={(e) => {
                                    setEmailSearch(e.target.value);
                                    setEmailSearchResult(null);
                                    setEmailSearchError("");
                                }}
                                onKeyDown={(e) => e.key === "Enter" && handleEmailSearch()}
                                placeholder="Enter member email..."
                                className="flex-1 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                            />
                            <button
                                onClick={handleEmailSearch}
                                disabled={!emailSearch.trim() || emailSearchLoading}
                                className="px-4 py-2 rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm disabled:opacity-50"
                            >
                                {emailSearchLoading ? "..." : "Search"}
                            </button>
                        </div>

                        {emailSearchError && (
                            <div className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
                                {emailSearchError}
                            </div>
                        )}

                        {emailSearchResult && (
                            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                                        {getInitials(emailSearchResult.user?.name || emailSearchResult.user?.email)}
                                    </div>
                                    <div>
                                        <p className="font-medium text-zinc-900 dark:text-white text-sm">
                                            {emailSearchResult.user?.name || "Unknown"}
                                        </p>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                            {emailSearchResult.user?.email}
                                        </p>
                                    </div>
                                    <span className={`ml-auto px-2 py-0.5 text-xs rounded ${emailSearchResult.role === "ADMIN" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" : "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"}`}>
                                        {emailSearchResult.role}
                                    </span>
                                </div>
                                <button
                                    onClick={handleRemoveByEmail}
                                    disabled={removingByEmail}
                                    className="w-full px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm transition disabled:opacity-50"
                                >
                                    {removingByEmail ? "Removing..." : "Remove from Workspace"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Search Bar */}
            <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-zinc-400 size-3" />
                <input placeholder="Search team members..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 w-full text-sm rounded-md border border-gray-300 dark:border-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-400 py-2 focus:outline-none focus:border-blue-500" />
            </div>

            {/* Team Members Table */}
            <div className="w-full">
                {filteredUsers.length === 0 ? (
                    <div className="col-span-full text-center py-16">
                        <div className="w-24 h-24 mx-auto mb-6 bg-gray-200 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                            <UsersIcon className="w-12 h-12 text-gray-400 dark:text-zinc-500" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            {users.length === 0 ? "No team members yet" : "No members match your search"}
                        </h3>
                        <p className="text-gray-500 dark:text-zinc-400 mb-6">
                            {users.length === 0 ? "Invite team members to start collaborating" : "Try adjusting your search term"}
                        </p>
                    </div>
                ) : (
                    <div className="max-w-4xl w-full">
                        {/* Desktop Table */}
                        <div className="hidden sm:block overflow-x-auto rounded-md border border-gray-200 dark:border-zinc-800">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
                                <thead className="bg-gray-50 dark:bg-zinc-900/50">
                                    <tr>
                                        <th className="px-6 py-2.5 text-left font-medium text-sm">Name</th>
                                        <th className="px-6 py-2.5 text-left font-medium text-sm">Email</th>
                                        <th className="px-6 py-2.5 text-left font-medium text-sm">Role</th>
                                        {user?.role === "ADMIN" && (
                                            <th className="px-6 py-2.5 text-left font-medium text-sm">Actions</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                                    {filteredUsers.map((u) => {
                                        const isOnline = showActiveUsers && activeUsers.some((au) => au.userId === u.userId);
                                        return (
                                            <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                                                <td className="px-6 py-2.5 whitespace-nowrap flex items-center gap-3">
                                                    <div className="relative">
                                                        {u.user?.image ? (
                                                            <img src={u.user.image} alt={u.user.name} className="size-7 rounded-full bg-gray-200 dark:bg-zinc-800 object-cover" />
                                                        ) : (
                                                            <div className="size-7 rounded-full bg-zinc-200 dark:bg-zinc-800 text-[10px] font-semibold text-zinc-700 dark:text-zinc-200 flex items-center justify-center">
                                                                {getInitials(u.user?.name || u.user?.email)}
                                                            </div>
                                                        )}
                                                        {isOnline && (
                                                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white dark:border-zinc-900" />
                                                        )}
                                                    </div>
                                                    <span className="text-sm text-zinc-800 dark:text-white truncate">
                                                        {u.user?.name || "Unknown User"}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-500 dark:text-zinc-400">
                                                    {u.user?.email}
                                                </td>
                                                <td className="px-6 py-2.5 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs rounded-md ${u.role === "ADMIN" ? "bg-purple-100 dark:bg-purple-500/20 text-purple-500 dark:text-purple-400" : "bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300"}`}>
                                                        {u.role || "User"}
                                                    </span>
                                                </td>
                                                {user?.role === "ADMIN" && (
                                                    <td className="px-6 py-2.5 whitespace-nowrap">
                                                        <button
                                                            onClick={() => handleRegenerateCredentials(u.userId, u.user?.email)}
                                                            disabled={regeneratingId === u.userId}
                                                            title="Regenerate login credentials"
                                                            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition disabled:opacity-40"
                                                        >
                                                            <RefreshCw className={`w-3 h-3 ${regeneratingId === u.userId ? "animate-spin" : ""}`} />
                                                            {regeneratingId === u.userId ? "Sending..." : "Reset Login"}
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="sm:hidden space-y-3">
                            {filteredUsers.map((u) => {
                                const isOnline = activeUsers.some((au) => au.userId === u.userId);
                                return (
                                    <div key={u.id} className="p-4 border border-gray-200 dark:border-zinc-800 rounded-md bg-white dark:bg-zinc-900">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="relative">
                                                {u.user?.image ? (
                                                    <img src={u.user.image} alt={u.user.name} className="size-9 rounded-full bg-gray-200 dark:bg-zinc-800 object-cover" />
                                                ) : (
                                                    <div className="size-9 rounded-full bg-zinc-200 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 flex items-center justify-center">
                                                        {getInitials(u.user?.name || u.user?.email)}
                                                    </div>
                                                )}
                                                {isOnline && (
                                                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white dark:border-zinc-900" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 dark:text-white truncate">
                                                    {shortText(u.user?.name || "Unknown User")}
                                                </p>
                                                <p className="text-sm text-gray-500 dark:text-zinc-400 truncate">
                                                    {shortText(u.user?.email)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-1 text-xs rounded-md ${u.role === "ADMIN" ? "bg-purple-100 dark:bg-purple-500/20 text-purple-500 dark:text-purple-400" : "bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300"}`}>
                                                {u.role || "User"}
                                            </span>
                                            {user?.role === "ADMIN" && (
                                                <button
                                                    onClick={() => handleRegenerateCredentials(u.userId, u.user?.email)}
                                                    disabled={regeneratingId === u.userId}
                                                    className="flex items-center gap-1 px-2 py-1 rounded text-xs border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition disabled:opacity-40"
                                                >
                                                    <RefreshCw className={`w-3 h-3 ${regeneratingId === u.userId ? "animate-spin" : ""}`} />
                                                    Reset Login
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Bulk Generate Groups Modal */}
            {isBulkGenerateModalOpen && (() => {
                const preview = getBulkGenerationPreview();

                return (
                    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-zinc-950 rounded-lg max-w-md w-full p-6 space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">Bulk Generate Groups</h3>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                    Automatically create multiple groups from members not in any group
                                </p>
                            </div>

                            <div className="space-y-3 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-lg">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                        Members per group
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={membersPerGroup}
                                        onChange={(e) => setMembersPerGroup(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                                    />
                                </div>

                                <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3">
                                    <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Preview:</div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-zinc-600 dark:text-zinc-400">Available members:</span>
                                            <span className="font-semibold text-zinc-900 dark:text-white">{preview.totalMembers}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-zinc-600 dark:text-zinc-400">Groups to create:</span>
                                            <span className="font-semibold text-zinc-900 dark:text-white">{preview.groupsNeeded}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-zinc-600 dark:text-zinc-400">Full groups:</span>
                                            <span className="font-semibold text-zinc-900 dark:text-white">{preview.fullGroups} ({preview.fullGroups * membersPerGroup} members)</span>
                                        </div>
                                        {preview.remainingMembers > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-zinc-600 dark:text-zinc-400">Partial group:</span>
                                                <span className="font-semibold text-zinc-900 dark:text-white">1 group ({preview.remainingMembers} members)</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {preview.totalMembers === 0 && (
                                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded p-3">
                                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                            No members available to add to groups. All members are already in a group.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => {
                                        setIsBulkGenerateModalOpen(false);
                                        setMembersPerGroup(10);
                                    }}
                                    className="px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleBulkGenerateGroups}
                                    disabled={preview.totalMembers === 0 || bulkGenerateLoading}
                                    className="px-4 py-2 rounded bg-gradient-to-br from-emerald-500 to-emerald-600 text-white hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {bulkGenerateLoading ? "Creating..." : "Generate"}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

        </div>
    );
};

export default Team;
