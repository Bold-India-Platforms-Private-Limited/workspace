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
    const [groupName, setGroupName] = useState("");
    const [selectedMembers, setSelectedMembers] = useState(new Set());
    const [page, setPage] = useState(1);
    const [removePage, setRemovePage] = useState(1);
    const [removeSelected, setRemoveSelected] = useState(new Set());
    const [users, setUsers] = useState([]);
    const { user, getToken } = useAuth();
    const currentWorkspace = useSelector((state) => state?.workspace?.currentWorkspace || null);
    const projects = currentWorkspace?.projects || [];
    const PAGE_SIZE = 20;
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const shortText = (value, max = 5) => {
        const text = String(value || "");
        return text.length > max ? `${text.slice(0, max)}...` : text;
    };

    const getInitials = (nameOrEmail = "") => {
        const value = String(nameOrEmail).trim();
        if (!value) return "U";
        const parts = value.split(/\s+/).filter(Boolean);
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const filteredUsers = users.filter(
        (user) =>
            user?.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user?.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        setUsers(currentWorkspace?.members || []);
        setTasks(currentWorkspace?.projects?.reduce((acc, project) => [...acc, ...project.tasks], []) || []);
    }, [currentWorkspace]);

    const pagedMembers = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return (currentWorkspace?.members || []).slice(start, start + PAGE_SIZE);
    }, [currentWorkspace, page]);

    const totalPages = Math.ceil((currentWorkspace?.members?.length || 0) / PAGE_SIZE) || 1;
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
                        <button onClick={() => setIsGroupModalOpen(true)} className="flex items-center px-4 py-2 rounded text-sm border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition w-full sm:w-auto" >
                            <Plus className="w-4 h-4 mr-2" /> Create Group
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
                        <input
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="Group Name"
                            className="text-lg font-semibold bg-transparent outline-none w-full text-zinc-900 dark:text-white"
                        />
                        <div className="flex items-center gap-3">
                            <button onClick={handleCreateGroup} className="px-4 py-2 rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm">Create</button>
                            <button onClick={() => setIsGroupModalOpen(false)} className="p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800">
                                <XIcon className="size-4" />
                            </button>
                        </div>
                    </div>

                    <div className="p-4 sm:p-6">
                        <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-zinc-800">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
                                <thead className="bg-gray-50 dark:bg-zinc-900/50">
                                    <tr>
                                        <th className="px-3 sm:px-4 py-2.5 text-left text-xs sm:text-sm">
                                            <input type="checkbox" onChange={toggleSelectPage} checked={pagedMembers.length > 0 && pagedMembers.every((m) => selectedMembers.has(m.userId))} />
                                        </th>
                                        <th className="px-3 sm:px-6 py-2.5 text-left font-medium text-xs sm:text-sm">Name</th>
                                        <th className="px-3 sm:px-6 py-2.5 text-left font-medium text-xs sm:text-sm">Email</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                                    {pagedMembers.map((member) => (
                                        <tr key={member.id}>
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
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
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
                        <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-zinc-800">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
                                <thead className="bg-gray-50 dark:bg-zinc-900/50">
                                    <tr>
                                        <th className="px-3 sm:px-4 py-2.5 text-left text-xs sm:text-sm">
                                            <input type="checkbox" onChange={toggleRemoveSelectPage} checked={removePagedMembers.length > 0 && removePagedMembers.every((m) => removeSelected.has(m.userId))} />
                                        </th>
                                        <th className="px-3 sm:px-6 py-2.5 text-left font-medium text-xs sm:text-sm">Name</th>
                                        <th className="px-3 sm:px-6 py-2.5 text-left font-medium text-xs sm:text-sm">Email</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                                    {removePagedMembers.map((member) => (
                                        <tr key={member.id}>
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
                                    ))}
                                </tbody>
                            </table>
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


        </div>
    );
};

export default Team;
