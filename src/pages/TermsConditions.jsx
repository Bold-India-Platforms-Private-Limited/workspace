import { useSelector } from "react-redux";
import {
    FileText, Shield, Users, AlertTriangle, Lock,
    Globe, Mail, CheckCircle2, XCircle,
    BookOpen, Gavel, RefreshCw, HeartHandshake,
} from "lucide-react";


function Section({ icon: Icon, color, title, children }) {
    return (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            {/* Section header */}
            <div className={`flex items-center gap-3 px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 ${color}`}>
                <div className="w-8 h-8 rounded-xl bg-white/30 dark:bg-white/10 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                </div>
                <h2 className="font-bold text-base">{title}</h2>
            </div>
            <div className="px-5 py-5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed space-y-3">
                {children}
            </div>
        </div>
    );
}

function Item({ icon: Icon = CheckCircle2, iconClass = "text-emerald-500", children }) {
    return (
        <div className="flex items-start gap-2.5">
            <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconClass}`} />
            <p>{children}</p>
        </div>
    );
}

function Highlight({ children }) {
    return (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-amber-800 dark:text-amber-300 text-sm">{children}</p>
        </div>
    );
}

export default function TermsConditions() {
    const workspace = useSelector(s => s.workspace?.currentWorkspace);
    const companyName = workspace?.name || "the Company";
    const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

    return (
        <div className="max-w-4xl mx-auto space-y-5 pb-12">

            {/* ── Hero header ── */}
            <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
                <div className="bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 dark:from-zinc-950 dark:to-zinc-900 px-8 py-10 text-center">
                    <div className="inline-flex w-16 h-16 rounded-2xl bg-white/10 items-center justify-center mb-4 shadow-lg">
                        <FileText className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-white mb-2">Terms &amp; Conditions</h1>
                    <p className="text-zinc-400 text-sm max-w-xl mx-auto">
                        Please read these terms carefully. By using the <strong className="text-white">{companyName}</strong> Internship Platform, you agree to be bound by these Terms &amp; Conditions.
                    </p>
                    <div className="flex items-center justify-center gap-4 mt-5 text-xs text-zinc-500">
                        <span>Last updated: {today}</span>
                        <span>·</span>
                        <span>Effective immediately</span>
                        <span>·</span>
                        <span>{companyName}</span>
                    </div>
                </div>

                {/* Quick nav pills */}
                <div className="bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 px-5 py-3 flex flex-wrap gap-2">
                    {["Acceptance","Platform Use","User Responsibilities","Prohibited Activities","Intellectual Property","Privacy","Confidentiality","Termination","Liability","Governing Law"].map(t => (
                        <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400">
                            {t}
                        </span>
                    ))}
                </div>
            </div>

            {/* ── 1. Acceptance ── */}
            <Section icon={CheckCircle2} color="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300" title="1. Acceptance of Terms">
                <p>By accessing or using the <strong>{companyName}</strong> internship management platform ("Platform"), you confirm that you have read, understood, and agree to be bound by these Terms &amp; Conditions ("Terms").</p>
                <Item>These Terms apply to all users including interns, administrators, and any other person accessing the Platform.</Item>
                <Item>If you do not agree with any part of these Terms, you must immediately stop using the Platform and notify your administrator.</Item>
                <Item>The Company reserves the right to modify these Terms at any time. Continued use of the Platform after changes are published constitutes your acceptance of the revised Terms.</Item>
                <Item>You must be at least 18 years of age, or have appropriate guardian consent, to use this Platform.</Item>
            </Section>

            {/* ── 2. About the Platform ── */}
            <Section icon={Globe} color="bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300" title="2. About the Platform">
                <p>The Platform is an internship management system operated by <strong>{companyName}</strong> that provides tools for:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2">
                    {[
                        "Daily attendance tracking via photo check-in",
                        "Project and task management",
                        "Daily standup submissions",
                        "Leave and Work-From-Home requests",
                        "Project document sharing",
                        "Standup and progress reporting",
                        "Team collaboration and group management",
                        "Final project submission",
                        "Digital NDA & agreement signing",
                        "Internship notices and announcements",
                    ].map(f => (
                        <div key={f} className="flex items-center gap-2 p-2 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span className="text-xs text-blue-800 dark:text-blue-300">{f}</span>
                        </div>
                    ))}
                </div>
                <p>The Platform is provided exclusively for use during your internship engagement with {companyName} and may not be used for any other purpose.</p>
            </Section>

            {/* ── 3. User Responsibilities ── */}
            <Section icon={Users} color="bg-violet-50 dark:bg-violet-950/30 text-violet-800 dark:text-violet-300" title="3. User Responsibilities">
                <p>As a Platform user, you are responsible for:</p>
                <Item iconClass="text-violet-500">Maintaining the confidentiality of your login credentials. Never share your password with anyone. The Company is not liable for any harm resulting from your failure to keep credentials secure.</Item>
                <Item iconClass="text-violet-500">Ensuring that all information you provide on the Platform — including attendance photos, standup reports, leave requests, and project submissions — is accurate, honest, and complete.</Item>
                <Item iconClass="text-violet-500">Promptly reporting any security breach, unauthorised access to your account, or suspicious activity to the Platform administrator.</Item>
                <Item iconClass="text-violet-500">Keeping your profile information up to date, including your mobile number and email address, to receive important notifications.</Item>
                <Item iconClass="text-violet-500">Complying with all attendance and standup requirements set out in the Internship Agreement and NDA. Refer to the NDA Agreement page for the minimum thresholds.</Item>
                <Item iconClass="text-violet-500">Using the Platform only on devices that are reasonably secure and free of malware. The Company is not responsible for data loss resulting from use on compromised devices.</Item>
            </Section>

            {/* ── 4. Prohibited Activities ── */}
            <Section icon={XCircle} color="bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300" title="4. Prohibited Activities">
                <Highlight>Violation of any of the following rules may result in immediate termination of your internship and, where applicable, legal action.</Highlight>
                <div className="space-y-2 mt-2">
                    {[
                        ["Impersonation", "You must not impersonate another user, mark attendance on behalf of another intern, or falsify any records on the Platform."],
                        ["Cheating & Plagiarism", "Submitting plagiarised code, copied standup entries, or AI-generated content passed off as original work without disclosure is strictly prohibited."],
                        ["Unauthorised Access", "You must not attempt to access accounts, data, or system areas beyond your authorised permissions, including admin dashboards or other users' profiles."],
                        ["Data Extraction", "Scraping, bulk-downloading, or exporting Platform data — including attendance records, project data, or user information — is strictly prohibited."],
                        ["Malicious Code", "Uploading, transmitting, or executing any virus, malware, ransomware, or other malicious code through the Platform is strictly prohibited."],
                        ["Harassment", "Using the Platform's communication or notification features to harass, threaten, bully, or send spam to any user is prohibited."],
                        ["False Records", "Creating false attendance entries, submitting inaccurate task progress, or misrepresenting your work output will result in immediate dismissal."],
                        ["Reverse Engineering", "Decompiling, reverse-engineering, or attempting to extract the Platform's source code, API endpoints, or infrastructure configuration is prohibited."],
                        ["Commercial Use", "Using the Platform or any data obtained from it for commercial purposes outside of your internship duties is strictly prohibited."],
                    ].map(([title, desc]) => (
                        <div key={title} className="flex items-start gap-2.5">
                            <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <p><strong className="text-zinc-800 dark:text-zinc-200">{title}:</strong> {desc}</p>
                        </div>
                    ))}
                </div>
            </Section>

            {/* ── 5. Attendance & Standup Policy ── */}
            <Section icon={BookOpen} color="bg-orange-50 dark:bg-orange-950/30 text-orange-800 dark:text-orange-300" title="5. Attendance & Standup Requirements">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/60 text-center">
                        <p className="text-4xl font-extrabold text-orange-600 dark:text-orange-400">35</p>
                        <p className="font-semibold text-orange-800 dark:text-orange-300 mt-1">Minimum Attendance Days</p>
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Required for certificate eligibility</p>
                    </div>
                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 text-center">
                        <p className="text-4xl font-extrabold text-blue-600 dark:text-blue-400">30</p>
                        <p className="font-semibold text-blue-800 dark:text-blue-300 mt-1">Minimum Daily Standups</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Required for certificate eligibility</p>
                    </div>
                </div>
                <Item iconClass="text-orange-500">Attendance must be marked daily via the photo check-in feature before <strong>11:59 PM IST</strong>.</Item>
                <Item iconClass="text-orange-500">Standup reports must be meaningful, accurate descriptions of your daily work. Blank, copy-pasted, or AI-generated standups without context will not be counted.</Item>
                <Item iconClass="text-orange-500">Leave approved through the Leave / WFH module will not count as an absent day towards the 35-day minimum.</Item>
                <Item iconClass="text-orange-500">Failure to meet either the attendance or standup requirement renders you ineligible for a completion certificate, regardless of project quality.</Item>
            </Section>

            {/* ── 6. Intellectual Property ── */}
            <Section icon={Shield} color="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300" title="6. Intellectual Property">
                <Item iconClass="text-indigo-500">All content on this Platform — including design, code, logos, text, and graphics — is the exclusive property of <strong>{companyName}</strong> and is protected by applicable intellectual property laws.</Item>
                <Item iconClass="text-indigo-500">Work products, code, analyses, and deliverables created by you during your internship are the sole property of the Company as described in the NDA Agreement.</Item>
                <Item iconClass="text-indigo-500">You are granted a limited, non-transferable, revocable licence to access and use the Platform solely for your internship duties. This licence does not include the right to reproduce, distribute, or create derivative works from Platform content.</Item>
                <Item iconClass="text-indigo-500">You may reference your internship in your CV/portfolio in general terms, but may not reproduce, share, or publish specific company data, code, or proprietary information.</Item>
            </Section>

            {/* ── 7. Privacy & Data ── */}
            <Section icon={Lock} color="bg-teal-50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-300" title="7. Privacy & Data Collection">
                <p>By using the Platform, you consent to the following data collection and processing:</p>
                <div className="space-y-2 mt-1">
                    {[
                        ["Profile Data", "Name, email, mobile number, and profile picture stored for account management."],
                        ["Attendance Photos", "Facial photos captured during check-in, stored on Cloudinary for attendance verification. Retained for up to 2 years post-internship."],
                        ["Activity Logs", "Task updates, standup submissions, leave requests, project actions, and login activity logged for performance evaluation."],
                        ["Device & Network Data", "IP address and User-Agent string collected during NDA signing and login for security and audit purposes."],
                        ["Communications", "Emails sent through the Platform (reminders, notifications) are logged for monitoring and delivery verification."],
                    ].map(([title, desc]) => (
                        <div key={title} className="flex gap-2.5">
                            <Lock className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                            <p><strong className="text-zinc-800 dark:text-zinc-200">{title}:</strong> {desc}</p>
                        </div>
                    ))}
                </div>
                <Item iconClass="text-teal-500">Your data will never be sold to third parties. It is used solely for internship management and evaluation by authorised Company staff.</Item>
                <Item iconClass="text-teal-500">You may request deletion of your personal data after the internship concludes by contacting your workspace administrator, subject to applicable legal retention requirements.</Item>
            </Section>

            {/* ── 8. Confidentiality Summary ── */}
            <Section icon={HeartHandshake} color="bg-pink-50 dark:bg-pink-950/30 text-pink-800 dark:text-pink-300" title="8. Confidentiality Summary">
                <p>These Terms incorporate the confidentiality obligations set out in the NDA Agreement. Key points:</p>
                <Item iconClass="text-pink-500">All non-public information about the Company's products, processes, clients, code, and strategies is confidential.</Item>
                <Item iconClass="text-pink-500">Confidentiality obligations survive the end of your internship for <strong>3 years</strong>.</Item>
                <Item iconClass="text-pink-500">Any breach of confidentiality may result in legal action and damages claims against you personally.</Item>
                <Item iconClass="text-pink-500">If you are unsure whether information is confidential, treat it as confidential and seek guidance from your supervisor.</Item>
            </Section>

            {/* ── 9. Termination ── */}
            <Section icon={AlertTriangle} color="bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300" title="9. Suspension & Termination">
                <p>The Company may suspend or terminate your Platform access at any time, with or without notice, for reasons including but not limited to:</p>
                <Item iconClass="text-amber-500">Breach of any provision of these Terms or the NDA Agreement.</Item>
                <Item iconClass="text-amber-500">Failure to meet minimum attendance or standup requirements despite warnings.</Item>
                <Item iconClass="text-amber-500">Engaging in prohibited activities listed in Section 4.</Item>
                <Item iconClass="text-amber-500">Gross misconduct, dishonesty, or behaviour harmful to the Company's reputation or interests.</Item>
                <Item iconClass="text-amber-500">End of the internship period.</Item>
                <p className="mt-2">Upon termination, your access to the Platform will be revoked and you must immediately cease any use of Platform data or materials in your possession.</p>
            </Section>

            {/* ── 10. Liability ── */}
            <Section icon={Gavel} color="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300" title="10. Limitation of Liability">
                <Item><strong>{companyName}</strong> provides the Platform on an "as-is" and "as-available" basis. We do not warrant that the Platform will be uninterrupted, error-free, or free of viruses.</Item>
                <Item>To the maximum extent permitted by law, the Company shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of or inability to use the Platform.</Item>
                <Item>The Company's total liability for any claim arising from these Terms shall not exceed the total stipend (if any) paid to you in the three months preceding the claim.</Item>
                <Item>You agree to indemnify and hold harmless the Company and its officers, employees, and agents from any claim or demand arising from your violation of these Terms.</Item>
            </Section>

            {/* ── 11. Governing Law ── */}
            <Section icon={Gavel} color="bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300" title="11. Governing Law & Disputes">
                <Item>These Terms are governed by and construed in accordance with applicable laws. Any dispute shall be subject to the exclusive jurisdiction of the competent courts in the Company's registered jurisdiction.</Item>
                <Item>Before initiating legal proceedings, both parties agree to attempt good-faith resolution for 30 days through written notice and discussion.</Item>
                <Item>If any provision of these Terms is found invalid or unenforceable, the remaining provisions continue in full force.</Item>
            </Section>

            {/* ── 12. Updates ── */}
            <Section icon={RefreshCw} color="bg-cyan-50 dark:bg-cyan-950/30 text-cyan-800 dark:text-cyan-300" title="12. Updates to These Terms">
                <Item iconClass="text-cyan-500">The Company may update these Terms at any time. The "Last updated" date at the top of this page will reflect the most recent revision.</Item>
                <Item iconClass="text-cyan-500">You will be notified of material changes via the Platform's notice/announcement system.</Item>
                <Item iconClass="text-cyan-500">Continued use of the Platform after changes are published constitutes your acceptance of the revised Terms.</Item>
                <Item iconClass="text-cyan-500">It is your responsibility to review these Terms periodically.</Item>
            </Section>

            {/* ── Contact ── */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-900 p-6 flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shrink-0">
                    <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                    <p className="font-bold text-zinc-800 dark:text-zinc-100">Questions about these Terms?</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                        If you have any questions or concerns about these Terms &amp; Conditions, please contact your workspace administrator or the {companyName} team directly through your official communication channel.
                    </p>
                </div>
            </div>

            {/* ── Footer ── */}
            <p className="text-center text-xs text-zinc-400 dark:text-zinc-600 pb-2">
                © {new Date().getFullYear()} {companyName} · All rights reserved ·{" "}
                These terms were last updated on {today}
            </p>
        </div>
    );
}
