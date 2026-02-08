import { useEffect, useMemo, useState } from "react";
import { UsersIcon, Search, UserPlus, Shield, Activity, XIcon, Plus } from "lucide-react";
import InviteMemberDialog from "../components/InviteMemberDialog";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../auth/AuthContext";
import api from "../configs/api";
import toast from "react-hot-toast";
import { fetchWorkspaces } from "../features/workspaceSlice";
import { useNavigate } from "react-router-dom";

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
    const { user, getToken } = useAuth();
    const currentWorkspace = useSelector((state) => state?.workspace?.currentWorkspace || null);
    const projects = currentWorkspace?.projects || [];
    const groups = currentWorkspace?.groups || [];
    const PAGE_SIZE = 20;
    const dispatch = useDispatch();
    const navigate = useNavigate();

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
        // Skip first member (admin)
        const membersWithoutAdmin = allMembers.slice(1);
        if (groupFilter === "not-in-group") {
            return membersWithoutAdmin.filter((member) => getUserGroups(member.userId).length === 0);
        } else if (groupFilter === "in-group") {
            return membersWithoutAdmin.filter((member) => getUserGroups(member.userId).length > 0);
        }
        return membersWithoutAdmin;
    };

    const filteredUsers = users.filter(
        (user) =>
            user?.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user?.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
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
        // Auto-generate name when members are selected
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

            // Create full groups
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

            // Create remaining group if there are leftover members
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

            // Create all groups
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
                {/* Total Members */}
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

                {/* Active Projects */}
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

                {/* Total Tasks */}
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
            </div>

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

                    {/* Filter Tabs */}
                    <div className="px-4 sm:px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                        <div className="flex flex-col gap-4">
                            {/* Tab Buttons */}
                            <div className="flex gap-3 flex-wrap">
                                <button
                                    onClick={() => {
                                        setGroupFilter("not-in-group");
                                        setPage(1);
                                        setSelectedMembers(new Set());
                                        setGroupName("");
                                    }}
                                    className={`px-4 py-2 rounded text-sm font-medium transition ${
                                        groupFilter === "not-in-group"
                                            ? "bg-blue-500 text-white"
                                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                    }`}
                                >
                                    Not in Any Group
                                </button>
                                <button
                                    onClick={() => {
                                        setGroupFilter("in-group");
                                        setPage(1);
                                        setSelectedMembers(new Set());
                                        setGroupName("");
                                    }}
                                    className={`px-4 py-2 rounded text-sm font-medium transition ${
                                        groupFilter === "in-group"
                                            ? "bg-blue-500 text-white"
                                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                    }`}
                                >
                                    Already in Group
                                </button>
                                <button
                                    onClick={() => {
                                        setGroupFilter("all");
                                        setPage(1);
                                        setSelectedMembers(new Set());
                                        setGroupName("");
                                    }}
                                    className={`px-4 py-2 rounded text-sm font-medium transition ${
                                        groupFilter === "all"
                                            ? "bg-blue-500 text-white"
                                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                    }`}
                                >
                                    All Members
                                </button>
                            </div>

                            {/* Quick Select Buttons - Only show on "not-in-group" tab */}
                            {groupFilter === "not-in-group" && (
                                <div className="flex gap-2 flex-wrap">
                                    <span className="text-sm text-zinc-600 dark:text-zinc-400 py-2">Quick Select:</span>
                                    {[5, 10, 15, 20].map((count) => {
                                        const notInGroupCount = getFilteredMembersForModal().length;
                                        const selectCount = Math.min(count, notInGroupCount);
                                        const isDisabled = selectCount === 0;
                                        return (
                                            <button
                                                key={count}
                                                disabled={isDisabled}
                                                onClick={() => handleQuickSelect(selectCount)}
                                                className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                                                    isDisabled
                                                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                                                        : "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/30"
                                                }`}
                                            >
                                                Select {selectCount}/{selectCount}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
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
                                                <input type="checkbox" onChange={toggleSelectPage} checked={pagedMembers.length > 0 && pagedMembers.every((m) => selectedMembers.has(m.userId))} />
                                            </th>
                                            <th className="px-3 sm:px-6 py-2.5 text-left font-medium text-xs sm:text-sm">Name</th>
                                            <th className="px-3 sm:px-6 py-2.5 text-left font-medium text-xs sm:text-sm">Email</th>
                                            <th className="px-3 sm:px-6 py-2.5 text-left font-medium text-xs sm:text-sm">Group Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                                        {pagedMembers.map((member, index) => {
                                            const memberGroups = getUserGroups(member.userId);
                                            const srNo = (page - 1) * PAGE_SIZE + index + 1;
                                            return (
                                                <tr key={member.id}>
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
                                                    <td className="px-3 sm:px-6 py-2.5 text-xs sm:text-sm">
                                                        {memberGroups.length === 0 ? (
                                                            <span className="text-gray-500 dark:text-zinc-400">Not in any group</span>
                                                        ) : (
                                                            <div className="flex flex-wrap gap-1">
                                                                {memberGroups.map((group) => (
                                                                    <span
                                                                        key={group.id}
                                                                        className="px-2 py-1 rounded text-[10px] sm:text-xs bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 whitespace-nowrap"
                                                                    >
                                                                        {group.name}
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

            {/* Search */}
            <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-zinc-400 size-3" />
                <input placeholder="Search team members..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 w-full text-sm rounded-md border border-gray-300 dark:border-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-400 py-2 focus:outline-none focus:border-blue-500" />
            </div>

            {/* Team Members */}
            <div className="w-full">
                {filteredUsers.length === 0 ? (
                    <div className="col-span-full text-center py-16">
                        <div className="w-24 h-24 mx-auto mb-6 bg-gray-200 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                            <UsersIcon className="w-12 h-12 text-gray-400 dark:text-zinc-500" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            {users.length === 0
                                ? "No team members yet"
                                : "No members match your search"}
                        </h3>
                        <p className="text-gray-500 dark:text-zinc-400 mb-6">
                            {users.length === 0
                                ? "Invite team members to start collaborating"
                                : "Try adjusting your search term"}
                        </p>
                    </div>
                ) : (
                    <div className="max-w-4xl w-full">
                        {/* Desktop Table */}
                        <div className="hidden sm:block overflow-x-auto rounded-md border border-gray-200 dark:border-zinc-800">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
                                <thead className="bg-gray-50 dark:bg-zinc-900/50">
                                    <tr>
                                        <th className="px-6 py-2.5 text-left font-medium text-sm">
                                            Name
                                        </th>
                                        <th className="px-6 py-2.5 text-left font-medium text-sm">
                                            Email
                                        </th>
                                        <th className="px-6 py-2.5 text-left font-medium text-sm">
                                            Role
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                                    {filteredUsers.map((user) => (
                                        <tr
                                            key={user.id}
                                            className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
                                        >
                                            <td className="px-6 py-2.5 whitespace-nowrap flex items-center gap-3">
                                                {user.user?.image ? (
                                                    <img
                                                        src={user.user.image}
                                                        alt={user.user.name}
                                                        className="size-7 rounded-full bg-gray-200 dark:bg-zinc-800 object-cover"
                                                    />
                                                ) : (
                                                    <div className="size-7 rounded-full bg-zinc-200 dark:bg-zinc-800 text-[10px] font-semibold text-zinc-700 dark:text-zinc-200 flex items-center justify-center">
                                                        {getInitials(user.user?.name || user.user?.email)}
                                                    </div>
                                                )}
                                                <span className="text-sm text-zinc-800 dark:text-white truncate">
                                                    {user.user?.name || "Unknown User"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-500 dark:text-zinc-400">
                                                {user.user.email}
                                            </td>
                                            <td className="px-6 py-2.5 whitespace-nowrap">
                                                <span
                                                    className={`px-2 py-1 text-xs rounded-md ${user.role === "ADMIN"
                                                            ? "bg-purple-100 dark:bg-purple-500/20 text-purple-500 dark:text-purple-400"
                                                            : "bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300"
                                                        }`}
                                                >
                                                    {user.role || "User"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="sm:hidden space-y-3">
                            {filteredUsers.map((user) => (
                                <div
                                    key={user.id}
                                    className="p-4 border border-gray-200 dark:border-zinc-800 rounded-md bg-white dark:bg-zinc-900"
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        {user.user?.image ? (
                                            <img
                                                src={user.user.image}
                                                alt={user.user.name}
                                                className="size-9 rounded-full bg-gray-200 dark:bg-zinc-800 object-cover"
                                            />
                                        ) : (
                                            <div className="size-9 rounded-full bg-zinc-200 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 flex items-center justify-center">
                                                {getInitials(user.user?.name || user.user?.email)}
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {shortText(user.user?.name || "Unknown User")}
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-zinc-400">
                                                {shortText(user.user.email)}
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <span
                                            className={`px-2 py-1 text-xs rounded-md ${user.role === "ADMIN"
                                                    ? "bg-purple-100 dark:bg-purple-500/20 text-purple-500 dark:text-purple-400"
                                                    : "bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300"
                                                }`}
                                        >
                                            {user.role || "User"}
                                        </span>
                                    </div>
                                </div>
                            ))}
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
