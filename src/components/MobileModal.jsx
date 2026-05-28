import { useState } from "react";
import { Phone, X } from "lucide-react";
import api from "../configs/api";
import { useAuth } from "../auth/AuthContext";
import toast from "react-hot-toast";

export default function MobileModal({ onSaved }) {
    const { getToken } = useAuth();
    const [mobile, setMobile] = useState("");
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const cleaned = mobile.replace(/\D/g, "");
        if (cleaned.length < 10 || cleaned.length > 15) {
            toast.error("Enter a valid number with country code e.g. 919876543210");
            return;
        }
        try {
            setSaving(true);
            await api.put(
                "/api/users/me/mobile",
                { mobile: cleaned },
                { headers: { Authorization: `Bearer ${await getToken()}` } }
            );
            toast.success("WhatsApp number saved!");
            onSaved();
        } catch (err) {
            toast.error(err?.response?.data?.message || err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-full">
                            <Phone className="size-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Add WhatsApp Number</h2>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Required for workspace communication</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                            Mobile number with country code
                        </label>
                        <input
                            type="tel"
                            placeholder="e.g. 919876543210"
                            value={mobile}
                            onChange={(e) => setMobile(e.target.value)}
                            autoFocus
                            className="w-full px-3 py-2.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-zinc-400"
                        />
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1.5">
                            Include country code without + sign. India: 91, US: 1
                        </p>
                    </div>
                    <button
                        type="submit"
                        disabled={saving || !mobile.trim()}
                        className="w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition disabled:opacity-50"
                    >
                        {saving ? "Saving…" : "Save WhatsApp Number"}
                    </button>
                </form>
            </div>
        </div>
    );
}
