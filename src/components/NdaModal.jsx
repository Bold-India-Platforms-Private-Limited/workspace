import { useState, useRef } from "react";
import { useAuth } from "../auth/AuthContext";
import { useSelector } from "react-redux";
import { format } from "date-fns";
import {
    ShieldCheck, ScrollText, AlertTriangle,
    Loader2, ChevronDown, CheckCircle2, ExternalLink, X,
} from "lucide-react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";

const API = import.meta.env.VITE_BASEURL;

// localStorage key — one per user per workspace
export const ndaCacheKey = (userId, workspaceId) =>
    `nda_signed_${userId}_${workspaceId}`;

export default function NdaModal({ onSigned }) {
    const { user, getToken } = useAuth();
    const workspace    = useSelector(s => s.workspace?.currentWorkspace);
    const companyName  = workspace?.name || "the Company";
    const workspaceId  = workspace?.id;

    const [agreed,   setAgreed]   = useState(false);
    const [signing,  setSigning]  = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const scrollRef = useRef(null);

    const handleScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 30) setScrolled(true);
    };

    const handleSign = async () => {
        if (!agreed) { toast.error("Please check the agreement checkbox first."); return; }
        setSigning(true);
        try {
            const token = await getToken();
            const res   = await fetch(`${API}/api/nda/sign`, {
                method:  "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body:    JSON.stringify({ workspaceId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to sign");

            // Cache so we never show this again for this user+workspace
            localStorage.setItem(ndaCacheKey(user.id, workspaceId), "true");
            toast.success("NDA signed! Welcome aboard 🎉");
            onSigned();
        } catch (err) {
            toast.error(err.message || "Failed to sign");
        } finally {
            setSigning(false);
        }
    };

    const now = format(new Date(), "dd MMM yyyy, hh:mm a");

    return (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
            <div
                className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden"
                style={{ maxWidth: 640, maxHeight: "92vh" }}
            >
                {/* ── Header ── */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm">
                        <ScrollText className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="font-bold text-zinc-800 dark:text-zinc-100 text-base leading-tight">
                            Internship Agreement &amp; NDA
                        </h2>
                        <p className="text-xs text-zinc-400 mt-0.5">
                            Please read and sign before accessing the platform — <span className="font-medium text-zinc-500">{companyName}</span>
                        </p>
                    </div>
                    <Link
                        to="/terms-nda"
                        target="_blank"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition shrink-0"
                        title="View full NDA page"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </Link>
                </div>

                {/* ── Scrollable body ── */}
                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-sm text-zinc-600 dark:text-zinc-400"
                >
                    {/* Parties */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 p-3">
                            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wide mb-0.5">Company</p>
                            <p className="font-bold text-zinc-800 dark:text-zinc-100 text-sm">{companyName}</p>
                        </div>
                        <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 p-3">
                            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide mb-0.5">Intern</p>
                            <p className="font-bold text-zinc-800 dark:text-zinc-100 text-sm truncate">{user?.name || user?.email}</p>
                        </div>
                    </div>

                    <p className="leading-relaxed">
                        This Internship Agreement and Non-Disclosure Agreement is entered into between <strong>{companyName}</strong> ("Company") and you ("Intern"), effective upon your digital acceptance below.
                    </p>

                    {/* Key obligations */}
                    <div className="space-y-2.5">
                        <p className="font-semibold text-zinc-700 dark:text-zinc-200">Key Terms You Are Agreeing To:</p>

                        {/* Attendance */}
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-amber-800 dark:text-amber-300 text-xs">Attendance — Minimum 35 Days</p>
                                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                                    You must mark attendance daily via photo check-in. At least 35 days of attendance is required for internship completion and certificate eligibility.
                                </p>
                            </div>
                        </div>

                        {/* Standup */}
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                            <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-blue-800 dark:text-blue-300 text-xs">Daily Standup — Minimum 30 Submissions</p>
                                <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                                    You must submit meaningful daily standup reports. At least 30 quality standups are required for internship completion.
                                </p>
                            </div>
                        </div>

                        {/* NDA */}
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                            <ShieldCheck className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-red-800 dark:text-red-300 text-xs">Non-Disclosure Agreement (3 Years)</p>
                                <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                                    All confidential information — code, data, strategies, credentials, client details — must be kept strictly confidential during and for 3 years after the internship.
                                </p>
                            </div>
                        </div>

                        {/* IP */}
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800">
                            <ShieldCheck className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-violet-800 dark:text-violet-300 text-xs">Intellectual Property Ownership</p>
                                <p className="text-xs text-violet-700 dark:text-violet-400 mt-0.5">
                                    All work products, code, and deliverables created during the internship are the exclusive property of {companyName}.
                                </p>
                            </div>
                        </div>

                        {/* Conduct */}
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
                            <CheckCircle2 className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-zinc-700 dark:text-zinc-200 text-xs">Professional Conduct & Data Privacy</p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                    You agree to maintain professional conduct, not to misuse the platform, and consent to the collection of attendance photos, activity logs, and device data for internship management.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Signature preview */}
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 space-y-2.5">
                        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Digital Signature Preview</p>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                                <p className="text-zinc-400 mb-0.5">Intern</p>
                                <p className="font-bold text-zinc-800 dark:text-zinc-100">{user?.name || "—"}</p>
                            </div>
                            <div>
                                <p className="text-zinc-400 mb-0.5">Company</p>
                                <p className="font-bold text-zinc-800 dark:text-zinc-100">{companyName}</p>
                            </div>
                            <div>
                                <p className="text-zinc-400 mb-0.5">Email</p>
                                <p className="text-zinc-600 dark:text-zinc-300 truncate">{user?.email}</p>
                            </div>
                            <div>
                                <p className="text-zinc-400 mb-0.5">Timestamp</p>
                                <p className="text-zinc-600 dark:text-zinc-300">{now}</p>
                            </div>
                        </div>
                    </div>

                    <p className="text-xs text-zinc-400 text-center pb-1">
                        For the full agreement,{" "}
                        <Link to="/terms-nda" className="text-blue-500 hover:underline">
                            view the complete NDA page →
                        </Link>
                    </p>
                </div>

                {/* ── Scroll hint ── */}
                {!scrolled && (
                    <div className="flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-zinc-400 bg-zinc-50 dark:bg-zinc-800/60 border-t border-zinc-100 dark:border-zinc-800 shrink-0">
                        <ChevronDown className="w-3 h-3 animate-bounce" />
                        Scroll down to read all terms
                    </div>
                )}

                {/* ── Footer — agree & sign ── */}
                <div className="px-5 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 shrink-0 space-y-3">
                    <label className="flex items-start gap-2.5 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={agreed}
                            onChange={e => setAgreed(e.target.checked)}
                            className="mt-0.5 w-4 h-4 rounded accent-blue-600 shrink-0"
                        />
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors leading-relaxed">
                            I, <strong className="text-zinc-800 dark:text-zinc-100">{user?.name || user?.email}</strong>, have read and understand this Internship Agreement &amp; NDA and agree to all terms including the 35-day attendance and 30-standup requirements, forming a binding agreement with <strong className="text-zinc-800 dark:text-zinc-100">{companyName}</strong>.
                        </p>
                    </label>

                    <button
                        onClick={handleSign}
                        disabled={!agreed || signing}
                        className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-md shadow-blue-200 dark:shadow-none disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                        {signing
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing…</>
                            : <><ShieldCheck className="w-4 h-4" /> I Agree &amp; Sign Digitally</>
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}
