import { useEffect, useMemo, useState, useRef } from "react";
import { UsersIcon, Search, UserPlus, Shield, Activity, XIcon, Plus, RefreshCw, Wifi, WifiOff, Phone, ExternalLink, ChevronDown, ChevronUp, MessageCircle, KeyRound, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import InviteMemberDialog from "../components/InviteMemberDialog";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../auth/AuthContext";
import api from "../configs/api";
import toast from "react-hot-toast";
import { fetchWorkspaceDetail } from "../features/workspaceSlice";
import { useNavigate } from "react-router-dom";
import { getSocket } from "../configs/socket";
import { thumb } from "../utils/cloudinaryUrl";

const ResetPasswordButton = ({ memberId, memberEmail, memberName, workspaceId, getToken }) => {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState("auto"); // "auto" | "manual"
    const [newPassword, setNewPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const close = () => { setOpen(false); setNewPassword(""); setMode("auto"); };

    const handleReset = async () => {
        if (mode === "manual" && newPassword.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }
        setLoading(true);
        try {
            const token = await getToken();
            const body = mode === "auto"
                ? { userId: memberId, workspaceId }
                : { userId: memberId, workspaceId, newPassword };
            const res = await api.post("/api/users/reset-password", body, {
                headers: { Authorization: `Bearer ${token}` },
            });
            toast.success(res.data.message || "Password reset successfully");
            close();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to reset password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                title="Reset password"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-[11px] font-medium transition"
            >
                <KeyRound className="size-3.5" />
                Reset PW
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={close}>
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl p-6 w-96 max-w-full mx-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Reset Password</h3>
                            <button onClick={close} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"><XIcon className="size-4" /></button>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                            for <span className="font-medium text-zinc-700 dark:text-zinc-300">{memberName}</span>
                            <span className="ml-1 text-zinc-400">({memberEmail})</span>
                        </p>

                        {/* Mode toggle */}
                        <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden mb-4 text-[11px] font-medium">
                            <button
                                onClick={() => setMode("auto")}
                                className={`flex-1 py-2 transition ${mode === "auto" ? "bg-blue-600 text-white" : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"}`}
                            >
                                📧 Auto-generate & Email
                            </button>
                            <button
                                onClick={() => setMode("manual")}
                                className={`flex-1 py-2 transition ${mode === "manual" ? "bg-blue-600 text-white" : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"}`}
                            >
                                🔑 Set Manually
                            </button>
                        </div>

                        {mode === "auto" ? (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4">
                                A new random password will be generated and sent directly to <strong>{memberEmail}</strong>.
                            </p>
                        ) : (
                            <input
                                type="password"
                                placeholder="New password (min 6 chars)"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleReset()}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-500 mb-4"
                                autoFocus
                            />
                        )}

                        <div className="flex gap-2 justify-end">
                            <button onClick={close}
                                className="px-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
                                Cancel
                            </button>
                            <button onClick={handleReset} disabled={loading}
                                className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50">
                                {loading ? "Processing…" : mode === "auto" ? "Generate & Send Email" : "Set Password"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

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

    // Team Directory (new rich API)
    const [teamDir, setTeamDir] = useState([]);
    const [teamDirLoading, setTeamDirLoading] = useState(false);
    const [teamDirSearch, setTeamDirSearch] = useState("");
    const [neverLoggedIn, setNeverLoggedIn] = useState([]);
    const [showTeamDir, setShowTeamDir] = useState(false);
    const [teamDirFilter, setTeamDirFilter] = useState("all"); // all | no-mobile | never-logged
    const [teamDirPage, setTeamDirPage] = useState(1);
    const [teamDirSort, setTeamDirSort] = useState({ col: "name", dir: "asc" }); // col: name|login|mobile|groups
    const TEAM_DIR_PAGE_SIZE = 50;

    // Login reminder state
    const [loginReminderLoading, setLoginReminderLoading] = useState(false);       // bulk
    const [loginReminderRowId,   setLoginReminderRowId]   = useState(null);        // per-row

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

    const fetchTeamDir = async () => {
        if (!currentWorkspace?.id || user?.role !== "ADMIN") return;
        setTeamDirLoading(true);
        try {
            const [teamRes, neverRes] = await Promise.all([
                api.get(`/api/users/team?workspaceId=${currentWorkspace.id}`, { headers: { Authorization: `Bearer ${await getToken()}` } }),
                api.get(`/api/users/never-logged-in?workspaceId=${currentWorkspace.id}`, { headers: { Authorization: `Bearer ${await getToken()}` } }),
            ]);
            setTeamDir(teamRes.data.users || teamRes.data || []);
            setNeverLoggedIn(neverRes.data.users || neverRes.data || []);
        } catch (err) {
            toast.error(err?.response?.data?.message || err.message);
        } finally {
            setTeamDirLoading(false);
        }
    };

    useEffect(() => {
        if (showTeamDir) fetchTeamDir();
    }, [showTeamDir, currentWorkspace?.id]);

    // ── Send login reminder (bulk = all never-logged-in, or single userId) ────
    const sendLoginReminderBulk = async () => {
        if (!currentWorkspace?.id) return;
        setLoginReminderLoading(true);
        try {
            const { data } = await api.post(
                "/api/users/send-login-reminder",
                { workspaceId: currentWorkspace.id },
                { headers: { Authorization: `Bearer ${await getToken()}` } }
            );
            toast.success(data.message || "Reminder emails sent!");
        } catch (err) {
            toast.error(err?.response?.data?.message || err.message);
        } finally {
            setLoginReminderLoading(false);
        }
    };

    const sendLoginReminderOne = async (userId, userName) => {
        if (!currentWorkspace?.id) return;
        setLoginReminderRowId(userId);
        try {
            const { data } = await api.post(
                "/api/users/send-login-reminder",
                { workspaceId: currentWorkspace.id, userId },
                { headers: { Authorization: `Bearer ${await getToken()}` } }
            );
            toast.success(`Reminder sent to ${userName}!`);
        } catch (err) {
            toast.error(err?.response?.data?.message || err.message);
        } finally {
            setLoginReminderRowId(null);
        }
    };

    // Reset page when filter/search changes
    useEffect(() => { setTeamDirPage(1); }, [teamDirSearch, teamDirFilter, teamDirSort]);

    const toggleSort = (col) => {
        setTeamDirSort(prev => prev.col === col
            ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
            : { col, dir: col === "login" ? "desc" : "asc" } // login defaults desc (recent first)
        );
    };

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
            dispatch(fetchWorkspaceDetail({ getToken, workspaceId: currentWorkspace.id }));
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
            dispatch(fetchWorkspaceDetail({ getToken, workspaceId: currentWorkspace.id }));
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
            dispatch(fetchWorkspaceDetail({ getToken, workspaceId: currentWorkspace.id }));
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
            dispatch(fetchWorkspaceDetail({ getToken, workspaceId: currentWorkspace.id }));
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

            {/* ── User Management Panel (admin only) ───────────────────────── */}
            {user?.role === "ADMIN" && (() => {
                // Derived filtered list
                const tdFiltered = teamDir.filter((m) => {
                    const q = teamDirSearch.toLowerCase();
                    const matchSearch = !q || m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q) || m.mobile?.includes(q);
                    const matchTab =
                        teamDirFilter === "all" ? true :
                        teamDirFilter === "no-mobile" ? !m.hasMobile :
                        teamDirFilter === "never-logged" ? !m.hasLoggedIn :
                        teamDirFilter === "no-group" ? (m.groups || []).length === 0 : true;
                    return matchSearch && matchTab;
                }).sort((a, b) => {
                    const { col, dir } = teamDirSort;
                    let cmp = 0;
                    if (col === "name") {
                        cmp = (a.name || "").localeCompare(b.name || "");
                    } else if (col === "login") {
                        // Never-logged always at bottom regardless of dir
                        if (!a.lastLoginAt && !b.lastLoginAt) cmp = 0;
                        else if (!a.lastLoginAt) cmp = 1;
                        else if (!b.lastLoginAt) cmp = -1;
                        else cmp = new Date(b.lastLoginAt) - new Date(a.lastLoginAt); // recent first = natural desc
                        return dir === "asc" ? -cmp : cmp; // flip for asc = oldest first (never still at bottom)
                    } else if (col === "mobile") {
                        if (a.hasMobile && !b.hasMobile) cmp = -1;
                        else if (!a.hasMobile && b.hasMobile) cmp = 1;
                        else cmp = (a.mobile || "").localeCompare(b.mobile || "");
                    } else if (col === "groups") {
                        cmp = (b.groups?.length || 0) - (a.groups?.length || 0);
                    }
                    return dir === "asc" ? cmp : -cmp;
                });
                const tdTotalPages = Math.ceil(tdFiltered.length / TEAM_DIR_PAGE_SIZE) || 1;
                const tdPaged = tdFiltered.slice((teamDirPage - 1) * TEAM_DIR_PAGE_SIZE, teamDirPage * TEAM_DIR_PAGE_SIZE);

                const noMobileCount = teamDir.filter((m) => !m.hasMobile).length;
                const neverLoggedCount = teamDir.filter((m) => !m.hasLoggedIn).length;
                const noGroupCount = teamDir.filter((m) => (m.groups || []).length === 0).length;

                return (
                <div className="bg-white dark:bg-zinc-950 dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                    {/* Header */}
                    <button
                        onClick={() => { setShowTeamDir((v) => !v); }}
                        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30">
                                <Phone className="size-4 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">User Management</span>
                                <span className="ml-2 text-xs text-zinc-400">Mobile · Login Status · WhatsApp · Groups</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {teamDir.length > 0 && (
                                <div className="hidden sm:flex items-center gap-2 text-[11px]">
                                    {neverLoggedCount > 0 && (
                                        <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-medium">
                                            {neverLoggedCount} never logged in
                                        </span>
                                    )}
                                    {noMobileCount > 0 && (
                                        <span className="px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 font-medium">
                                            {noMobileCount} no mobile
                                        </span>
                                    )}
                                </div>
                            )}
                            {showTeamDir ? <ChevronUp className="size-4 text-zinc-400" /> : <ChevronDown className="size-4 text-zinc-400" />}
                        </div>
                    </button>

                    {showTeamDir && (
                        <div className="border-t border-zinc-200 dark:border-zinc-800">
                            {/* Toolbar */}
                            <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                                {/* Search */}
                                <div className="relative flex-1 min-w-48">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
                                    <input
                                        placeholder="Search name, email or mobile…"
                                        value={teamDirSearch}
                                        onChange={(e) => { setTeamDirSearch(e.target.value); setTeamDirPage(1); }}
                                        className="pl-8 w-full text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-zinc-400"
                                    />
                                </div>
                                {/* Filter tabs */}
                                <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs">
                                    {[
                                        { key: "all", label: `All (${teamDir.length})` },
                                        { key: "never-logged", label: `Never Logged In (${neverLoggedCount})`, danger: true },
                                        { key: "no-mobile", label: `No Mobile (${noMobileCount})`, warn: true },
                                        { key: "no-group", label: `No Group (${noGroupCount})` },
                                    ].map(({ key, label, danger, warn }) => (
                                        <button key={key} onClick={() => { setTeamDirFilter(key); setTeamDirPage(1); }}
                                            className={`px-2.5 py-1 rounded-md font-medium transition whitespace-nowrap ${
                                                teamDirFilter === key
                                                    ? danger ? "bg-red-600 text-white"
                                                      : warn ? "bg-yellow-500 text-white"
                                                      : "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                                                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                                            }`}
                                        >{label}</button>
                                    ))}
                                </div>
                                <button onClick={fetchTeamDir} disabled={teamDirLoading}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition disabled:opacity-40"
                                >
                                    <RefreshCw className={`size-3.5 ${teamDirLoading ? "animate-spin" : ""}`} />
                                    Refresh
                                </button>

                                {/* Bulk login reminder — shown when Never Logged In filter is active */}
                                {teamDirFilter === "never-logged" && neverLoggedCount > 0 && (
                                    <button
                                        onClick={sendLoginReminderBulk}
                                        disabled={loginReminderLoading}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition disabled:opacity-50 shadow-sm"
                                    >
                                        {loginReminderLoading ? (
                                            <RefreshCw className="size-3.5 animate-spin" />
                                        ) : (
                                            <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                        )}
                                        Send Reminder to All ({neverLoggedCount})
                                    </button>
                                )}
                            </div>

                            {/* Loading */}
                            {teamDirLoading && (
                                <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-500">
                                    <RefreshCw className="size-4 animate-spin" /> Loading user data…
                                </div>
                            )}

                            {/* Empty state */}
                            {!teamDirLoading && teamDir.length === 0 && (
                                <div className="text-center py-12 text-sm text-zinc-400">
                                    Click Refresh to load user directory
                                </div>
                            )}

                            {/* Table */}
                            {!teamDirLoading && tdFiltered.length === 0 && teamDir.length > 0 && (
                                <div className="text-center py-8 text-sm text-zinc-400">No users match your search / filter.</div>
                            )}

                            {!teamDirLoading && tdPaged.length > 0 && (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                                                <th className="text-left py-3 px-4 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">#</th>
                                                {[
                                                    { col: "name", label: "Member" },
                                                    { col: "mobile", label: "Mobile" },
                                                    { col: "groups", label: "Groups" },
                                                    { col: "login", label: "Login" },
                                                ].map(({ col, label }) => (
                                                    <th key={col}
                                                        onClick={() => toggleSort(col)}
                                                        className="text-left py-3 px-4 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide cursor-pointer select-none hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors group">
                                                        <span className="flex items-center gap-1">
                                                            {label}
                                                            <span className={`transition-opacity ${teamDirSort.col === col ? "opacity-100" : "opacity-0 group-hover:opacity-50"}`}>
                                                                {teamDirSort.col === col
                                                                    ? teamDirSort.dir === "asc" ? "↑" : "↓"
                                                                    : "↕"}
                                                            </span>
                                                        </span>
                                                    </th>
                                                ))}
                                                <th className="text-left py-3 px-4 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                                            {tdPaged.map((member, idx) => {
                                                const initials = member.name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "??";
                                                const rowNum = (teamDirPage - 1) * TEAM_DIR_PAGE_SIZE + idx + 1;
                                                return (
                                                    <tr key={member.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                                                        {/* # */}
                                                        <td className="py-3 px-4 text-xs text-zinc-400 w-8">{rowNum}</td>
                                                        {/* Member */}
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-2.5">
                                                                {member.image ? (
                                                                    <img src={thumb(member.image, 64, 64)} className="size-8 rounded-full object-cover shrink-0" alt="" />
                                                                ) : (
                                                                    <div className="size-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                                                                        {initials}
                                                                    </div>
                                                                )}
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate max-w-[160px]">{member.name}</p>
                                                                    <p className="text-[10px] text-zinc-400 truncate max-w-[160px]">{member.email}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        {/* Mobile */}
                                                        <td className="py-3 px-4">
                                                            {member.hasMobile ? (
                                                                <div className="flex items-center gap-1.5">
                                                                    <Phone className="size-3 text-green-500 shrink-0" />
                                                                    <span className="text-xs text-zinc-700 dark:text-zinc-300 font-mono">{member.mobile}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 text-[11px] text-yellow-600 dark:text-yellow-400">
                                                                    <AlertTriangle className="size-3" /> Not set
                                                                </span>
                                                            )}
                                                        </td>
                                                        {/* Groups */}
                                                        <td className="py-3 px-4">
                                                            <div className="flex flex-wrap gap-1 max-w-[180px]">
                                                                {(member.groups || []).length === 0 ? (
                                                                    <span className="text-[11px] text-zinc-400">No group</span>
                                                                ) : (member.groups).map((g) => (
                                                                    <span key={g.id} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">{g.name}</span>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        {/* Login status */}
                                                        <td className="py-3 px-4">
                                                            {member.hasLoggedIn ? (
                                                                <div>
                                                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 dark:text-green-400">
                                                                        <CheckCircle2 className="size-3" /> Active
                                                                    </span>
                                                                    {member.lastLoginAt && (
                                                                        <p className="text-[10px] text-zinc-400 mt-0.5">
                                                                            {new Date(member.lastLoginAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
                                                                    <XCircle className="size-3" /> Never
                                                                </span>
                                                            )}
                                                        </td>
                                                        {/* Actions */}
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                {/* WhatsApp */}
                                                                {member.whatsappLink ? (
                                                                    <a href={member.whatsappLink} target="_blank" rel="noreferrer"
                                                                        title="Open WhatsApp chat"
                                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-[11px] font-medium transition shadow-sm"
                                                                    >
                                                                        <MessageCircle className="size-3.5" />
                                                                        WhatsApp
                                                                    </a>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-400 text-[11px]">
                                                                        <MessageCircle className="size-3.5" />
                                                                        No mobile
                                                                    </span>
                                                                )}
                                                                {/* Login reminder — only for never-logged-in users */}
                                                                {!member.hasLoggedIn && (
                                                                    <button
                                                                        onClick={() => sendLoginReminderOne(member.id, member.name || member.email)}
                                                                        disabled={loginReminderRowId === member.id}
                                                                        title="Send login reminder email"
                                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/60 text-red-700 dark:text-red-400 text-[11px] font-medium transition disabled:opacity-50"
                                                                    >
                                                                        {loginReminderRowId === member.id ? (
                                                                            <RefreshCw className="size-3 animate-spin" />
                                                                        ) : (
                                                                            <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                                            </svg>
                                                                        )}
                                                                        Send Login Mail
                                                                    </button>
                                                                )}
                                                                {/* Reset password */}
                                                                <ResetPasswordButton memberId={member.id} memberName={member.name} memberEmail={member.email} workspaceId={currentWorkspace?.id} getToken={getToken} />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Pagination */}
                            {!teamDirLoading && tdTotalPages > 1 && (
                                <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 dark:border-zinc-800">
                                    <p className="text-xs text-zinc-500">
                                        Showing {(teamDirPage - 1) * TEAM_DIR_PAGE_SIZE + 1}–{Math.min(teamDirPage * TEAM_DIR_PAGE_SIZE, tdFiltered.length)} of {tdFiltered.length}
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <button disabled={teamDirPage === 1} onClick={() => setTeamDirPage(1)}
                                            className="px-2 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800">«</button>
                                        <button disabled={teamDirPage === 1} onClick={() => setTeamDirPage((p) => p - 1)}
                                            className="px-2 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800">‹</button>
                                        {Array.from({ length: Math.min(5, tdTotalPages) }, (_, i) => {
                                            const start = Math.max(1, Math.min(teamDirPage - 2, tdTotalPages - 4));
                                            const page = start + i;
                                            return page <= tdTotalPages ? (
                                                <button key={page} onClick={() => setTeamDirPage(page)}
                                                    className={`px-2.5 py-1 text-xs rounded border transition ${page === teamDirPage ? "bg-blue-600 border-blue-600 text-white" : "border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
                                                    {page}
                                                </button>
                                            ) : null;
                                        })}
                                        <button disabled={teamDirPage === tdTotalPages} onClick={() => setTeamDirPage((p) => p + 1)}
                                            className="px-2 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800">›</button>
                                        <button disabled={teamDirPage === tdTotalPages} onClick={() => setTeamDirPage(tdTotalPages)}
                                            className="px-2 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800">»</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                );
            })()}


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
