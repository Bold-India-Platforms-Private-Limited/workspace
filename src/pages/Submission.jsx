import { useEffect, useState } from 'react'
import axios from 'axios'
import { useSelector } from 'react-redux'
import { useAuth } from '../auth/AuthContext'
import toast from 'react-hot-toast'
import {
    FolderOpen, Link2, ExternalLink, CheckCircle2, Clock,
    Search, ChevronDown, ChevronUp, Pencil, X, Check,
    FileCode2, Database, FileText, Film, MonitorPlay,
    Info, Users, Copy, AlertCircle,
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL

// ── Folder structure ──────────────────────────────────────────────────────────
const FOLDERS = [
    {
        icon: FileCode2,
        color: 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400',
        label: 'Source Code',
        desc: 'Backend & Frontend code',
        example: 'e.g. /src, /api, /client',
    },
    {
        icon: Database,
        color: 'bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400',
        label: 'Datasets',
        desc: 'CSV, JSON, raw data files',
        example: 'e.g. dataset.csv, raw_data.json',
    },
    {
        icon: FileText,
        color: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-600 dark:text-yellow-400',
        label: 'Documentation',
        desc: 'Reports, README, API docs',
        example: 'e.g. README.md, API_docs.pdf',
    },
    {
        icon: MonitorPlay,
        color: 'bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400',
        label: 'PPT / Slides',
        desc: 'Final presentation deck',
        example: 'e.g. Final_Presentation.pptx',
    },
    {
        icon: Film,
        color: 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400',
        label: 'Demo Video',
        desc: 'Screen recording / walkthrough',
        example: 'e.g. demo_recording.mp4',
    },
]

// ── Instructions panel ────────────────────────────────────────────────────────
const STEPS = [
    {
        n: 1,
        title: 'Create a master folder',
        text: <>Go to <a href="https://drive.google.com" target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">drive.google.com</a> and create a new folder named like <span className="font-semibold text-zinc-700 dark:text-zinc-200">YourName_Submission</span> <span className="text-zinc-400">(e.g. Alex_ChatBot)</span></>,
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
            </svg>
        ),
    },
    {
        n: 2,
        title: 'Add the 5 required sub-folders',
        text: <>Inside your master folder, create all <span className="font-semibold text-zinc-700 dark:text-zinc-200">5 sub-folders</span> listed below and upload your files into each one</>,
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H7m0 0l4-4m-4 4l4 4M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
        ),
    },
    {
        n: 3,
        title: 'Make the folder public',
        text: <><span className="font-semibold text-zinc-700 dark:text-zinc-200">Right-click</span> your master folder → <span className="font-semibold text-zinc-700 dark:text-zinc-200">Share</span> → set access to <span className="font-semibold text-zinc-700 dark:text-zinc-200">"Anyone with the link"</span> → role: <span className="font-semibold text-zinc-700 dark:text-zinc-200">Viewer</span></>,
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
            </svg>
        ),
    },
    {
        n: 4,
        title: 'Paste the link & submit',
        text: <>Click <span className="font-semibold text-zinc-700 dark:text-zinc-200">Copy link</span> in Drive, paste it in the form above, then hit <span className="font-semibold text-zinc-700 dark:text-zinc-200">Submit</span></>,
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
            </svg>
        ),
    },
]

const Instructions = () => (
    <div className="space-y-4">
        {/* Header */}
        <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700/60">
            {/* Banner */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 px-6 py-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-base leading-tight">How to submit your project</h3>
                        <p className="text-blue-100 text-xs mt-0.5">4 simple steps — takes less than 2 minutes</p>
                    </div>
                </div>
            </div>

            {/* Steps */}
            <div className="bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
                {STEPS.map(({ n, title, text, icon }) => (
                    <div key={n} className="flex items-start gap-4 px-5 py-4">
                        {/* Step number + icon stack */}
                        <div className="shrink-0 flex flex-col items-center gap-1">
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shadow-sm shadow-blue-200 dark:shadow-none">
                                {n}
                            </div>
                            {n < 4 && <div className="w-px flex-1 min-h-[16px] bg-blue-100 dark:bg-zinc-700" />}
                        </div>
                        <div className="pt-1 pb-2">
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-blue-500 dark:text-blue-400">{icon}</span>
                                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{title}</p>
                            </div>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{text}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Required sub-folders */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700/60 overflow-hidden bg-white dark:bg-zinc-900">
            <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
                </svg>
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Required sub-folders inside your master folder</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-100 dark:bg-zinc-800">
                {FOLDERS.map(({ icon: Icon, color, label, desc, example }) => (
                    <div key={label} className="flex items-start gap-3 bg-white dark:bg-zinc-900 px-4 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                            <Icon size={16} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 leading-tight">{label}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{desc}</p>
                            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 italic mt-0.5 truncate">{example}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 px-4 py-3.5">
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                <AlertCircle size={15} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Make your folder public before submitting</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                    Set sharing to <strong>"Anyone with the link → Viewer"</strong> — otherwise reviewers will get an access denied error.
                </p>
            </div>
        </div>
    </div>
)

// ── Member View ───────────────────────────────────────────────────────────────
const MemberView = ({ workspaceId, getToken }) => {
    const [submission, setSubmission] = useState(null)
    const [driveLink, setDriveLink] = useState('')
    const [note, setNote] = useState('')
    const [fetching, setFetching] = useState(false)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!workspaceId) return
        setFetching(true)
        const load = async () => {
            try {
                const token = await getToken()
                const r = await axios.get(`${API}/api/submissions/me?workspaceId=${workspaceId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                if (r.data.submission) {
                    setSubmission(r.data.submission)
                    setDriveLink(r.data.submission.driveLink)
                    setNote(r.data.submission.note || '')
                }
            } catch {
                // no existing submission is fine
            } finally {
                setFetching(false)
            }
        }
        load()
    }, [workspaceId])

    const save = async () => {
        setError('')
        const link = driveLink.trim()
        if (!link) { setError('Please enter your Google Drive folder link.'); return }
        try { new URL(link) } catch { setError("That doesn't look like a valid URL. Copy the full link from Google Drive."); return }
        setSaving(true)
        try {
            const token = await getToken()
            const r = await axios.post(`${API}/api/submissions`,
                { workspaceId, driveLink: link, note: note.trim() },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            setSubmission(r.data.submission)
            toast.success(submission ? 'Submission updated!' : 'Submission saved! ✅')
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to save. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    const remove = async () => {
        if (!submission || !confirm('Remove your submission?')) return
        setDeleting(true)
        try {
            const token = await getToken()
            await axios.delete(`${API}/api/submissions/${submission.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            setSubmission(null); setDriveLink(''); setNote('')
            toast.success('Submission removed')
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to remove')
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="space-y-5">
            {/* ── Submission form — always visible at top ── */}
            <div className="rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-bold text-zinc-800 dark:text-zinc-100 text-base">Submit Your Google Drive Link</h2>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Create your own Google Drive folder, make it public, and paste the link below.
                        </p>
                    </div>
                    {fetching && (
                        <span className="text-xs text-zinc-400 animate-pulse">Loading…</span>
                    )}
                    {!fetching && submission && (
                        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-medium shrink-0">
                            <CheckCircle2 size={12} /> Submitted
                        </span>
                    )}
                </div>

                {/* Admin feedback */}
                {submission?.adminNote && (
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-3">
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">📝 Admin Feedback</p>
                        <p className="text-sm text-amber-800 dark:text-amber-300">{submission.adminNote}</p>
                    </div>
                )}

                {/* Drive link input */}
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Your Google Drive Folder Link <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Link2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                            <input
                                type="text"
                                value={driveLink}
                                onChange={e => { setDriveLink(e.target.value); setError('') }}
                                onKeyDown={e => e.key === 'Enter' && save()}
                                placeholder="https://drive.google.com/drive/folders/..."
                                style={{ backgroundColor: 'white', border: '1.5px solid #d1d5db', color: '#111827' }}
                                className="w-full pl-9 pr-3 py-3 text-sm rounded-lg placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <button
                            onClick={save}
                            disabled={saving || !driveLink.trim()}
                            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors shrink-0"
                        >
                            {saving ? 'Saving…' : submission ? 'Update' : 'Submit'}
                        </button>
                    </div>
                    {error && (
                        <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle size={12} /> {error}
                        </p>
                    )}
                </div>

                {/* Optional note */}
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Note to admin <span className="text-zinc-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        rows={2}
                        placeholder="e.g. 'Demo video is in the Demo Video folder. Backend is Node.js + Express.'"
                        style={{ backgroundColor: 'white', border: '1.5px solid #d1d5db', color: '#111827' }}
                        className="w-full text-sm px-3 py-2.5 rounded-lg placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                </div>

                {/* Submitted info row */}
                {submission && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100 dark:border-zinc-800">
                        <div className="flex items-center gap-2 flex-wrap">
                            <a href={submission.driveLink} target="_blank" rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
                                <ExternalLink size={14} /> Open my submitted link
                            </a>
                            <span className="text-zinc-300 dark:text-zinc-700">·</span>
                            <span className="text-xs text-zinc-400">{new Date(submission.submittedAt).toLocaleString()}</span>
                        </div>
                        <button onClick={remove} disabled={deleting}
                            className="text-xs text-red-500 hover:text-red-600 disabled:opacity-50 transition-colors">
                            {deleting ? 'Removing…' : 'Remove submission'}
                        </button>
                    </div>
                )}
            </div>

            {/* ── Instructions ── */}
            <Instructions />
        </div>
    )
}

// ── Admin Row ─────────────────────────────────────────────────────────────────
const AdminRow = ({ member, getToken, onNoteUpdated }) => {
    const [expanded, setExpanded] = useState(false)
    const [editingNote, setEditingNote] = useState(false)
    const [noteInput, setNoteInput] = useState(member.submission?.adminNote || '')
    const [savingNote, setSavingNote] = useState(false)

    const saveNote = async () => {
        if (!member.submission) return
        setSavingNote(true)
        try {
            const token = await getToken()
            const r = await axios.put(`${API}/api/submissions/${member.submission.id}/note`,
                { adminNote: noteInput },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            onNoteUpdated(member.userId, r.data.submission)
            setEditingNote(false)
            toast.success('Note saved')
        } catch {
            toast.error('Failed to save note')
        } finally {
            setSavingNote(false)
        }
    }

    const copyLink = () => { navigator.clipboard.writeText(member.submission.driveLink); toast.success('Link copied!') }
    const has = !!member.submission

    return (
        <div className={`rounded-xl border transition-all ${has
            ? 'border-green-200 dark:border-green-900/50 bg-white dark:bg-zinc-900'
            : 'border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50'}`}>

            <div
                className={`flex items-center gap-3 p-4 ${has ? 'cursor-pointer' : ''}`}
                onClick={() => has && setExpanded(e => !e)}
            >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0 overflow-hidden">
                    {member.image
                        ? <img src={member.image} alt="" className="w-full h-full object-cover" />
                        : member.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">{member.name}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{member.email}</p>
                </div>

                {has ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-medium shrink-0">
                        <CheckCircle2 size={11} /> Link Added
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium shrink-0">
                        <Clock size={11} /> Not Submitted
                    </span>
                )}

                {has && (
                    <>
                        <a href={member.submission.driveLink} target="_blank" rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-blue-500 shrink-0" title="Open Drive link">
                            <ExternalLink size={15} />
                        </a>
                        <button className="text-zinc-400 shrink-0" onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}>
                            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    </>
                )}
            </div>

            {has && expanded && (
                <div className="px-4 pb-4 border-t border-gray-100 dark:border-zinc-800 pt-3 space-y-3">
                    {/* Drive link */}
                    <div className="flex items-start gap-2">
                        <Link2 size={14} className="text-zinc-400 mt-0.5 shrink-0" />
                        <a href={member.submission.driveLink} target="_blank" rel="noreferrer"
                            className="flex-1 text-sm text-blue-600 dark:text-blue-400 underline break-all hover:opacity-80">
                            {member.submission.driveLink}
                        </a>
                        <button onClick={copyLink} className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 shrink-0" title="Copy link">
                            <Copy size={13} />
                        </button>
                    </div>

                    {/* Member note */}
                    {member.submission.note && (
                        <div className="flex items-start gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                            <FileText size={13} className="mt-0.5 shrink-0" />
                            <p>{member.submission.note}</p>
                        </div>
                    )}

                    <p className="text-xs text-zinc-400">Submitted {new Date(member.submission.submittedAt).toLocaleString()}</p>

                    {/* Admin note */}
                    <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-3">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Admin Note / Feedback</p>
                            {!editingNote && (
                                <button onClick={() => { setEditingNote(true); setNoteInput(member.submission?.adminNote || '') }}
                                    className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1">
                                    <Pencil size={11} /> {member.submission?.adminNote ? 'Edit' : 'Add note'}
                                </button>
                            )}
                        </div>
                        {editingNote ? (
                            <div className="space-y-2">
                                <textarea
                                    value={noteInput}
                                    onChange={e => setNoteInput(e.target.value)}
                                    rows={3}
                                    placeholder="Write feedback for this intern…"
                                    className="w-full text-sm px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-900 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <button onClick={saveNote} disabled={savingNote}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium disabled:opacity-50">
                                        <Check size={12} /> {savingNote ? 'Saving…' : 'Save'}
                                    </button>
                                    <button onClick={() => setEditingNote(false)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-300">
                                        <X size={12} /> Cancel
                                    </button>
                                </div>
                            </div>
                        ) : member.submission?.adminNote
                            ? <p className="text-sm text-amber-800 dark:text-amber-300">{member.submission.adminNote}</p>
                            : <p className="text-xs text-amber-600 dark:text-amber-500 italic">No note yet — click "Add note" to give feedback</p>
                        }
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Admin View ────────────────────────────────────────────────────────────────
const AdminView = ({ workspaceId, getToken }) => {
    const [members, setMembers] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState('all')
    const [total, setTotal] = useState(0)
    const [submittedCount, setSubmittedCount] = useState(0)

    useEffect(() => {
        if (!workspaceId) return
        setLoading(true)
        const fetch = async () => {
            try {
                const token = await getToken()
                const r = await axios.get(`${API}/api/submissions?workspaceId=${workspaceId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                setMembers(r.data.members)
                setTotal(r.data.total)
                setSubmittedCount(r.data.submittedCount)
            } catch {
                toast.error('Failed to load submissions')
            } finally {
                setLoading(false)
            }
        }
        fetch()
    }, [workspaceId])

    const handleNoteUpdated = (userId, updated) => {
        setMembers(prev => prev.map(m => m.userId === userId ? { ...m, submission: updated } : m))
    }

    const filtered = members.filter(m => {
        if (filter === 'submitted' && !m.submission) return false
        if (filter === 'pending' && m.submission) return false
        const q = search.toLowerCase()
        return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    })

    return (
        <div className="space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 text-center">
                    <p className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">{total}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Total Members</p>
                </div>
                <div className="rounded-xl border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-950/30 p-4 text-center">
                    <p className="text-2xl font-bold text-green-700 dark:text-green-400">{submittedCount}</p>
                    <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">Link Added</p>
                </div>
                <div className="rounded-xl border border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-950/30 p-4 text-center">
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{total - submittedCount}</p>
                    <p className="text-xs text-orange-500 mt-0.5">Not Submitted</p>
                </div>
            </div>

            {/* Progress bar */}
            {total > 0 && (
                <div>
                    <div className="flex justify-between text-xs text-zinc-500 mb-1">
                        <span>Submission progress</span>
                        <span>{Math.round((submittedCount / total) * 100)}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-zinc-800 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500"
                            style={{ width: `${(submittedCount / total) * 100}%` }} />
                    </div>
                </div>
            )}

            {/* Search + filter */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name or email…"
                        className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex rounded-lg border border-gray-200 dark:border-zinc-700 overflow-hidden text-sm shrink-0">
                    {[
                        { key: 'all',       label: 'All' },
                        { key: 'submitted', label: '✅ Link Added' },
                        { key: 'pending',   label: '⏳ Not Submitted' },
                    ].map(tab => (
                        <button key={tab.key} onClick={() => setFilter(tab.key)}
                            className={`px-4 py-2.5 transition-colors ${filter === tab.key
                                ? 'bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium'
                                : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-zinc-400">
                    <Users size={32} className="mx-auto mb-2 opacity-40" />
                    <p>No members found</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(m => (
                        <AdminRow key={m.userId} member={m} getToken={getToken} onNoteUpdated={handleNoteUpdated} />
                    ))}
                </div>
            )}
        </div>
    )
}

// ── Page ──────────────────────────────────────────────────────────────────────
const Submission = () => {
    const { getToken, user } = useAuth()
    const workspace = useSelector(state => state.workspace.workspace)
    const workspaceId = workspace?.id
    const isAdmin = user?.role === 'ADMIN'

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-10">
            <div>
                <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/50">
                        <FolderOpen size={20} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">Project Submission</h1>
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 ml-12">
                    {isAdmin
                        ? 'Review all intern project submissions. Click any row to open their Drive link and leave feedback.'
                        : 'Follow the steps below, then paste your Google Drive folder link to submit.'}
                </p>
            </div>

            {isAdmin
                ? <AdminView workspaceId={workspaceId} getToken={getToken} />
                : <MemberView workspaceId={workspaceId} getToken={getToken} />}
        </div>
    )
}

export default Submission
