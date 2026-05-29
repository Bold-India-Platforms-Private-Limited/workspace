import { useEffect, useState } from 'react'
import { getSocket } from '../configs/socket'
import { Mail, CheckCircle2, X } from 'lucide-react'

/**
 * Global floating panel that shows real-time email sending progress.
 * Listens for `email_job_progress` socket events emitted by the backend.
 * Renders one card per active job; cards dismiss automatically on completion.
 */
export default function EmailProgressToast() {
    const [jobs, setJobs] = useState({}) // jobId → { label, total, sent, failed, rateLimit, done }

    useEffect(() => {
        const socket = getSocket()
        if (!socket) return

        const onProgress = (data) => {
            const { jobId, label, total, sent, failed, rateLimit, done } = data
            setJobs(prev => ({ ...prev, [jobId]: { label, total, sent, failed, rateLimit, done } }))

            // Auto-dismiss 4 seconds after completion
            if (done) {
                setTimeout(() => {
                    setJobs(prev => {
                        const next = { ...prev }
                        delete next[jobId]
                        return next
                    })
                }, 4000)
            }
        }

        socket.on('email_job_progress', onProgress)
        return () => socket.off('email_job_progress', onProgress)
    }, [])

    const activeJobs = Object.entries(jobs)
    if (activeJobs.length === 0) return null

    return (
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 w-80">
            {activeJobs.map(([jobId, job]) => {
                const progress = job.total > 0 ? Math.round(((job.sent + job.failed) / job.total) * 100) : 0
                const dismiss = () => setJobs(prev => { const n = { ...prev }; delete n[jobId]; return n })

                return (
                    <div key={jobId}
                        className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl p-4 space-y-3">

                        {/* Header */}
                        <div className="flex items-start gap-2">
                            <div className={`p-1.5 rounded-lg shrink-0 ${job.done ? 'bg-green-100 dark:bg-green-900/40' : 'bg-blue-100 dark:bg-blue-900/40'}`}>
                                {job.done
                                    ? <CheckCircle2 size={14} className="text-green-600 dark:text-green-400" />
                                    : <Mail size={14} className="text-blue-600 dark:text-blue-400 animate-pulse" />
                                }
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100 truncate">
                                    {job.done ? 'Emails sent!' : 'Sending emails…'}
                                </p>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{job.label}</p>
                            </div>
                            <button onClick={dismiss} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition shrink-0">
                                <X size={13} />
                            </button>
                        </div>

                        {/* Progress bar */}
                        <div>
                            <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-300 ${job.done ? 'bg-green-500' : 'bg-blue-500'}`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                            <span>
                                {job.sent + job.failed} / {job.total} sent
                                {job.failed > 0 && <span className="text-red-500 ml-1">({job.failed} failed)</span>}
                            </span>
                            <span className="tabular-nums">
                                {job.done
                                    ? '✅ Done'
                                    : `~${job.rateLimit}/min · ${progress}%`}
                            </span>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
