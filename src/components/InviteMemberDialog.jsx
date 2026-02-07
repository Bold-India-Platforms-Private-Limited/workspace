import { useState } from "react";
import { Mail, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../auth/AuthContext";
import api from "../configs/api";
import { useSelector } from "react-redux";

const InviteMemberDialog = ({ isDialogOpen, setIsDialogOpen }) => {
    const { getToken } = useAuth();

    const currentWorkspace = useSelector((state) => state.workspace?.currentWorkspace || null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [role, setRole] = useState("MEMBER");
    const [rows, setRows] = useState([{ id: 1, email: "" }]);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

    const parseEmails = (value) => {
        if (!value) return [];
        return value
            .split(/[\n,]+/)
            .map((v) => v.trim())
            .filter((v) => v && emailRegex.test(v));
    };

    const addRow = () => {
        setRows((prev) => prev.concat({ id: Date.now(), email: "" }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const emails = rows
                .flatMap((r) => parseEmails(r.email))
                .filter(Boolean)
                .filter((v, i, arr) => arr.indexOf(v) === i);
            await api.post(
                `/api/workspaces/${currentWorkspace.id}/invite-bulk`,
                { emails, role },
                { headers: { Authorization: `Bearer ${await getToken()}` } }
            );
            toast.success("Invitations sent successfully");
            setIsDialogOpen(false);
        } catch (error) {
            console.log(error);
            toast.error(error.response?.data?.message || error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isDialogOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur flex items-center justify-center z-50">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl p-6 w-full max-w-3xl text-zinc-900 dark:text-zinc-200">
                {/* Header */}
                <div className="mb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <UserPlus className="size-5 text-zinc-900 dark:text-zinc-200" /> Invite Team Member
                    </h2>
                    {currentWorkspace && (
                        <p className="text-sm text-zinc-700 dark:text-zinc-400">
                            Inviting to workspace: <span className="text-blue-600 dark:text-blue-400">{currentWorkspace.name}</span>
                        </p>
                    )}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Role */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-900 dark:text-zinc-200">Role</label>
                        <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-200 py-2 px-3 mt-1 focus:outline-none focus:border-blue-500 text-sm" >
                            <option value="MEMBER">Member</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                    </div>

                    {/* Emails Table */}
                    <div className="overflow-x-auto rounded border border-zinc-300 dark:border-zinc-700">
                        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                            <thead className="bg-zinc-50 dark:bg-zinc-900/50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium">Email</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium">Remove</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                {rows.map((row) => (
                                    <tr key={row.id}>
                                        <td className="px-4 py-2">
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400 w-4 h-4" />
                                                <input
                                                    type="email"
                                                    value={row.email}
                                                    onChange={(e) => setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, email: e.target.value } : r))}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            e.preventDefault();
                                                            addRow();
                                                        }
                                                    }}
                                                    onPaste={(e) => {
                                                        const text = e.clipboardData.getData("text");
                                                        const parsed = parseEmails(text);
                                                        if (parsed.length > 1) {
                                                            e.preventDefault();
                                                            setRows((prev) => {
                                                                const next = prev.map((r) => r.id === row.id ? { ...r, email: parsed[0] } : r);
                                                                const extras = parsed.slice(1).map((email) => ({ id: Date.now() + Math.random(), email }));
                                                                return next.concat(extras);
                                                            });
                                                        }
                                                    }}
                                                    placeholder="Enter email address"
                                                    className="pl-10 w-full rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-200 text-sm placeholder-zinc-400 dark:placeholder-zinc-500 py-2 focus:outline-none focus:border-blue-500"
                                                    required
                                                />
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <button type="button" onClick={() => setRows((prev) => prev.filter((r) => r.id !== row.id))} className="text-xs text-red-500">Remove</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <button type="button" onClick={addRow} className="text-sm text-blue-600 dark:text-blue-400">
                        + Add another
                    </button>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setIsDialogOpen(false)} className="px-5 py-2 rounded text-sm border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition" >
                            Cancel
                        </button>
                        <button type="submit" disabled={isSubmitting || !currentWorkspace} className="px-5 py-2 rounded text-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white disabled:opacity-50 hover:opacity-90 transition" >
                            {isSubmitting ? "Sending..." : "Send Invitation"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InviteMemberDialog;
