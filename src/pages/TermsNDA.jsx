import { useState, useEffect, useRef } from "react";
import { useAuth } from "../auth/AuthContext";
import { useSelector } from "react-redux";
import { format } from "date-fns";
import {
    ShieldCheck, FileText, ScrollText, CheckCircle2,
    Loader2, ChevronDown, AlertTriangle, Users, Clock,
    Building2, Lock, Pen,
} from "lucide-react";
import toast from "react-hot-toast";

const API = import.meta.env.VITE_BASEURL;

// ── Section component ─────────────────────────────────────────────────────────
function Section({ num, title, children }) {
    return (
        <div className="space-y-3">
            <h3 className="flex items-center gap-2 font-bold text-zinc-800 dark:text-zinc-100 text-base">
                <span className="w-7 h-7 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{num}</span>
                {title}
            </h3>
            <div className="ml-9 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed space-y-2">{children}</div>
        </div>
    );
}

function Clause({ letter, children }) {
    return (
        <div className="flex gap-2">
            <span className="font-semibold text-zinc-500 dark:text-zinc-400 shrink-0">({letter})</span>
            <p>{children}</p>
        </div>
    );
}

export default function TermsNDA() {
    const { user, getToken } = useAuth();
    const workspace = useSelector(s => s.workspace?.currentWorkspace);
    const companyName = workspace?.name || "the Company";
    const workspaceId  = workspace?.id;

    const [status,   setStatus]   = useState(null);   // null | { signed, signature }
    const [loading,  setLoading]  = useState(true);
    const [signing,  setSigning]  = useState(false);
    const [agreed,   setAgreed]   = useState(false);
    const [scrolled, setScrolled] = useState(false);

    const scrollRef = useRef(null);
    const signedAt  = status?.signature?.signedAt;

    // ── fetch status ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!workspaceId) return;
        (async () => {
            setLoading(true);
            try {
                const token = await getToken();
                const res   = await fetch(`${API}/api/nda/status?workspaceId=${workspaceId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                setStatus(data);
            } catch {
                toast.error("Failed to load NDA status");
            } finally {
                setLoading(false);
            }
        })();
    }, [workspaceId]);

    // ── detect scroll-to-bottom ───────────────────────────────────────────────
    const handleScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) setScrolled(true);
    };

    // ── sign ──────────────────────────────────────────────────────────────────
    const handleSign = async () => {
        if (!agreed) return toast.error("Please check the agreement checkbox first.");
        setSigning(true);
        try {
            const token = await getToken();
            const res   = await fetch(`${API}/api/nda/sign`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ workspaceId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setStatus({ signed: true, signature: data.signature });
            toast.success("NDA signed successfully!");
        } catch (err) {
            toast.error(err.message || "Failed to sign");
        } finally {
            setSigning(false);
        }
    };

    const isSigned = status?.signed;

    if (loading) return (
        <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-10">

            {/* ── Page header ── */}
            <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-none shrink-0">
                    <ScrollText className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">Internship Agreement & NDA</h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Please read the full document carefully before signing — <strong>{companyName}</strong>
                    </p>
                </div>
                {isSigned && (
                    <div className="ml-auto shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                        <CheckCircle2 className="w-4 h-4" /> Signed
                    </div>
                )}
            </div>

            {/* ── Signed certificate ── */}
            {isSigned && signedAt && (
                <div className="rounded-2xl border-2 border-emerald-300 dark:border-emerald-700 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-200 dark:shadow-none shrink-0">
                        <ShieldCheck className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-emerald-800 dark:text-emerald-200 text-base">Agreement Digitally Signed</p>
                        <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-0.5">
                            You have read, understood, and agreed to all terms of the Internship Agreement &amp; NDA with <strong>{companyName}</strong>.
                        </p>
                        <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-xs text-emerald-700 dark:text-emerald-400">
                            <span className="flex items-center gap-1.5"><Pen className="w-3 h-3" /> <strong>Signed by:</strong> {user?.name || user?.email}</span>
                            <span className="flex items-center gap-1.5"><Building2 className="w-3 h-3" /> <strong>Company:</strong> {companyName}</span>
                            <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {format(new Date(signedAt), "dd MMM yyyy, hh:mm a")}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Document card ── */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">

                {/* Document header banner */}
                <div className="bg-gradient-to-r from-zinc-800 to-zinc-900 dark:from-zinc-950 dark:to-zinc-900 px-8 py-6 text-center">
                    <p className="text-xs text-zinc-400 uppercase tracking-widest mb-1">Confidential Document</p>
                    <h2 className="text-xl font-bold text-white">INTERNSHIP AGREEMENT &amp; NON-DISCLOSURE AGREEMENT</h2>
                    <p className="text-zinc-400 text-sm mt-1">{companyName} · Effective upon digital acceptance</p>
                </div>

                {/* Scroll-to-read document */}
                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="px-6 sm:px-10 py-8 space-y-8 overflow-y-auto"
                    style={{ maxHeight: isSigned ? "none" : 520 }}
                >
                    {/* Parties */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 p-4">
                            <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Company</p>
                            <p className="font-bold text-zinc-800 dark:text-zinc-100">{companyName}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Hereinafter referred to as "the Company"</p>
                        </div>
                        <div className="flex-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 p-4">
                            <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-1 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Intern</p>
                            <p className="font-bold text-zinc-800 dark:text-zinc-100">{user?.name || "Intern"}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{user?.email} · Hereinafter "the Intern"</p>
                        </div>
                    </div>

                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        This Internship Agreement and Non-Disclosure Agreement (<strong>"Agreement"</strong>) is entered into between <strong>{companyName}</strong> (<strong>"Company"</strong>) and the above-named Intern, effective upon the Intern's digital acceptance on this platform. Both parties agree to the following terms and conditions:
                    </p>

                    {/* ── Section 1 ── */}
                    <Section num="1" title="Internship Terms & Engagement">
                        <Clause letter="a">The Intern is engaged on a <strong>voluntary / stipend-based internship</strong> basis and is not considered an employee of the Company. This Agreement does not create an employment relationship.</Clause>
                        <Clause letter="b">The internship duration, project scope, and deliverables shall be communicated by the Company through this platform and may be updated from time to time.</Clause>
                        <Clause letter="c">The Intern agrees to perform all assigned tasks diligently, professionally, and to the best of their ability, meeting deadlines and quality standards set by the Company.</Clause>
                        <Clause letter="d">The Intern must maintain professional conduct at all times while representing the Company, including in communications, presentations, and public platforms.</Clause>
                        <Clause letter="e">The Company reserves the right to terminate this internship at any time if the Intern violates the terms of this Agreement, fails to meet performance expectations, or engages in conduct detrimental to the Company.</Clause>
                    </Section>

                    {/* ── Section 2 ── */}
                    <Section num="2" title="Attendance Policy — Minimum 35 Days Required">
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 mb-2">
                            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                            <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                                A minimum of <strong>35 days of attendance</strong> is mandatory to successfully complete this internship and be eligible for a certificate of completion.
                            </p>
                        </div>
                        <Clause letter="a">The Intern is required to mark attendance daily through the Company's platform using the facial recognition / photo-based check-in system.</Clause>
                        <Clause letter="b">Attendance must be marked between <strong>9:00 AM and 11:59 PM IST</strong> on the respective day. Late marking will be recorded as absent for that day.</Clause>
                        <Clause letter="c">Interns who fall below the <strong>35-day attendance threshold</strong> will not be eligible for an internship completion certificate, recommendation letter, or final stipend (if applicable).</Clause>
                        <Clause letter="d">Approved leaves (medical, emergency) applied and granted through the platform's Leave / WFH module will not be counted as absent days towards the minimum requirement, subject to Company approval.</Clause>
                        <Clause letter="e">The Company may waive the minimum attendance requirement only in exceptional circumstances at its sole discretion, communicated in writing.</Clause>
                        <Clause letter="f">The Intern acknowledges that attendance records on this platform are the official and binding record of their presence during the internship.</Clause>
                    </Section>

                    {/* ── Section 3 ── */}
                    <Section num="3" title="Daily Standup Policy — Minimum 30 Standups Required">
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 mb-2">
                            <ClipboardIcon />
                            <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
                                A minimum of <strong>30 daily standup submissions</strong> is mandatory for internship completion and certificate eligibility.
                            </p>
                        </div>
                        <Clause letter="a">The Intern must submit a daily standup report through the platform's Standup module, describing work completed, work planned, and any blockers.</Clause>
                        <Clause letter="b">Standups must be submitted by <strong>11:59 PM IST</strong> on the respective working day. Submissions after midnight will be counted for the following day.</Clause>
                        <Clause letter="c">Standup quality will be evaluated by the Company. Generic, copy-pasted, or blank submissions will not be counted towards the 30-standup requirement.</Clause>
                        <Clause letter="d">Interns who do not meet the <strong>30-standup requirement</strong> will be deemed non-compliant and ineligible for completion benefits regardless of other performance metrics.</Clause>
                        <Clause letter="e">The standup history recorded on this platform constitutes the official record of the Intern's daily progress and engagement.</Clause>
                    </Section>

                    {/* ── Section 4 ── */}
                    <Section num="4" title="Non-Disclosure & Confidentiality">
                        <Clause letter="a"><strong>"Confidential Information"</strong> means all non-public information disclosed by the Company to the Intern in any form — oral, written, digital, or electronic — including but not limited to: source code, databases, business strategies, financial data, customer lists, product roadmaps, internal processes, API keys, credentials, and any other proprietary information.</Clause>
                        <Clause letter="b">The Intern shall hold all Confidential Information in strict confidence and shall not disclose it to any third party during or after the internship period without the prior written consent of the Company.</Clause>
                        <Clause letter="c">The Intern shall not use any Confidential Information for any purpose other than the performance of their internship duties.</Clause>
                        <Clause letter="d">These confidentiality obligations shall survive the termination of this Agreement and remain in force for a period of <strong>3 (three) years</strong> from the date of termination.</Clause>
                        <Clause letter="e">The Intern shall immediately notify the Company in writing upon becoming aware of any actual or suspected unauthorised use or disclosure of Confidential Information.</Clause>
                    </Section>

                    {/* ── Section 5 ── */}
                    <Section num="5" title="Intellectual Property">
                        <Clause letter="a">All work product, code, designs, reports, analyses, dashboards, documentation, and other deliverables created by the Intern in the course of this internship shall be the exclusive property of the Company.</Clause>
                        <Clause letter="b">The Intern irrevocably assigns to the Company all intellectual property rights, including copyright, in any work product created during the internship.</Clause>
                        <Clause letter="c">The Intern may include internship work in their personal portfolio <strong>only in general terms</strong> (e.g., "built a data analytics platform") without disclosing proprietary code, data, or system architecture.</Clause>
                        <Clause letter="d">The Intern shall not copy, reproduce, or distribute any Company code, data, or materials to personal accounts, repositories, cloud storage, or third-party platforms without explicit written permission.</Clause>
                    </Section>

                    {/* ── Section 6 ── */}
                    <Section num="6" title="Code of Conduct & Professional Standards">
                        <Clause letter="a">The Intern shall behave professionally and respectfully towards all Company staff, fellow interns, and stakeholders at all times.</Clause>
                        <Clause letter="b">Harassment, discrimination, dishonesty, plagiarism, or any form of misconduct will result in immediate termination of the internship without notice.</Clause>
                        <Clause letter="c">The Intern shall not engage in any activity that damages the Company's reputation, business interests, or client relationships, including on social media.</Clause>
                        <Clause letter="d">The Intern must promptly respond to communications from Company supervisors and mentors within reasonable working hours.</Clause>
                    </Section>

                    {/* ── Section 7 ── */}
                    <Section num="7" title="Data Privacy & Platform Usage">
                        <Clause letter="a">The Intern consents to the Company collecting and storing their attendance photos, standup records, task data, and activity logs on this platform for the purpose of internship management and evaluation.</Clause>
                        <Clause letter="b">This data will not be shared with third parties and will be retained for a maximum of 2 years after the internship ends.</Clause>
                        <Clause letter="c">The Intern shall not attempt to access, modify, or delete other users' data, system configurations, or backend infrastructure.</Clause>
                    </Section>

                    {/* ── Section 8 ── */}
                    <Section num="8" title="Completion & Certification">
                        <Clause letter="a">To be eligible for an internship <strong>Completion Certificate</strong>, the Intern must: (i) complete at least 35 days of attendance, (ii) submit at least 30 standups, (iii) complete all assigned project tasks to the satisfaction of their supervisor, and (iv) not have any unresolved disciplinary matters.</Clause>
                        <Clause letter="b">A <strong>Letter of Recommendation</strong> may be issued at the Company's discretion to Interns who demonstrate outstanding performance beyond the minimum requirements.</Clause>
                        <Clause letter="c">Final project submissions must be submitted through the platform's Submission module by the deadline communicated by the Company.</Clause>
                    </Section>

                    {/* ── Section 9 ── */}
                    <Section num="9" title="Governing Law & Dispute Resolution">
                        <Clause letter="a">This Agreement shall be governed by and construed in accordance with applicable laws. Any dispute arising out of this Agreement shall be subject to the exclusive jurisdiction of the competent courts in the Company's registered jurisdiction.</Clause>
                        <Clause letter="b">Before initiating legal proceedings, both parties agree to attempt good-faith resolution of any dispute for a period of 30 days.</Clause>
                    </Section>

                    {/* ── Section 10 ── */}
                    <Section num="10" title="Amendments & Entire Agreement">
                        <Clause letter="a">This Agreement constitutes the entire agreement between the parties with respect to its subject matter and supersedes all prior agreements, representations, and understandings.</Clause>
                        <Clause letter="b">The Company may update these terms by publishing a revised version on this platform. Continued use of the platform after such updates constitutes acceptance of the revised terms.</Clause>
                        <Clause letter="c">If any provision of this Agreement is found to be unenforceable, the remaining provisions shall continue in full force and effect.</Clause>
                    </Section>

                    {/* ── Signature block ── */}
                    <div className="rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 p-6 space-y-4">
                        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Digital Signature Block</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-zinc-400 text-xs mb-1">Intern's Name</p>
                                <p className="font-bold text-zinc-800 dark:text-zinc-100 border-b border-zinc-300 dark:border-zinc-700 pb-1">{user?.name || "—"}</p>
                            </div>
                            <div>
                                <p className="text-zinc-400 text-xs mb-1">Email</p>
                                <p className="font-medium text-zinc-700 dark:text-zinc-300 border-b border-zinc-300 dark:border-zinc-700 pb-1">{user?.email || "—"}</p>
                            </div>
                            <div>
                                <p className="text-zinc-400 text-xs mb-1">Company</p>
                                <p className="font-bold text-zinc-800 dark:text-zinc-100 border-b border-zinc-300 dark:border-zinc-700 pb-1">{companyName}</p>
                            </div>
                            <div>
                                <p className="text-zinc-400 text-xs mb-1">Date & Time Signed</p>
                                <p className="font-medium text-zinc-700 dark:text-zinc-300 border-b border-zinc-300 dark:border-zinc-700 pb-1">
                                    {isSigned && signedAt
                                        ? format(new Date(signedAt), "dd MMM yyyy, hh:mm:ss a")
                                        : <span className="italic text-zinc-400">Not yet signed</span>
                                    }
                                </p>
                            </div>
                        </div>
                        {isSigned && (
                            <div className="flex items-center gap-2 pt-2">
                                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                                <span className="text-xs text-zinc-400 flex items-center gap-1">
                                    <Lock className="w-3 h-3" /> Digitally signed &amp; locked
                                </span>
                                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Scroll hint ── */}
                {!isSigned && !scrolled && (
                    <div className="flex items-center justify-center gap-2 py-2 text-xs text-zinc-400 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60">
                        <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
                        Scroll down to read the full agreement before signing
                    </div>
                )}

                {/* ── Sign section ── */}
                {!isSigned && (
                    <div className="px-6 sm:px-10 py-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 space-y-4">
                        <label className="flex items-start gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={agreed}
                                onChange={e => setAgreed(e.target.checked)}
                                className="mt-0.5 w-4 h-4 rounded accent-blue-600 shrink-0"
                            />
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors leading-relaxed">
                                I, <strong className="text-zinc-800 dark:text-zinc-100">{user?.name || user?.email}</strong>, have read and fully understand the entire Internship Agreement and Non-Disclosure Agreement above. I agree to all terms including the <strong>35-day attendance</strong> requirement and <strong>30-standup</strong> requirement. I acknowledge this constitutes a legally binding digital signature with <strong>{companyName}</strong>.
                            </p>
                        </label>

                        <button
                            onClick={handleSign}
                            disabled={!agreed || signing}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-lg shadow-blue-200 dark:shadow-none disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            {signing
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing…</>
                                : <><ShieldCheck className="w-4 h-4" /> I Agree &amp; Sign Digitally</>
                            }
                        </button>
                        <p className="text-xs text-zinc-400">
                            Your name, email, timestamp, and IP address will be recorded as proof of digital acceptance.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

// small inline icon for section 3
function ClipboardIcon() {
    return (
        <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
    );
}
