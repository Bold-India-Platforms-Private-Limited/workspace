import { Plus, AlertTriangle, Clock } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useAuth } from '../auth/AuthContext'
import StatsGrid from '../components/StatsGrid'
import ProjectOverview from '../components/ProjectOverview'
import RecentActivity from '../components/RecentActivity'
import TasksSummary from '../components/TasksSummary'
import CreateProjectDialog from '../components/CreateProjectDialog'
import NotificationsCard from '../components/NotificationsCard'
import api from '../configs/api'

const Dashboard = () => {

    const { user } = useAuth()
    const currentWorkspace = useSelector((state) => state.workspace?.currentWorkspace || null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [attendanceStatus, setAttendanceStatus] = useState(null)

    useEffect(() => {
        if (!currentWorkspace?.id || user?.role === 'ADMIN') return
        api.get('/api/attendance/my-status', { params: { workspaceId: currentWorkspace.id } })
            .then(res => setAttendanceStatus(res.data))
            .catch(() => {})
    }, [currentWorkspace?.id, user?.role])

    return (
        <div className='max-w-6xl mx-auto space-y-6 sm:space-y-8'>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-1"> Welcome back, {user?.name || 'User'} </h1>
                    <p className="text-gray-500 dark:text-zinc-400 text-sm"> Here's what's happening with your projects today </p>
                </div>

                {user?.role === "ADMIN" && (
                    <>
                        <button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-2 px-5 py-2 text-sm rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white space-x-2 hover:opacity-90 transition w-full sm:w-auto" >
                            <Plus size={16} /> New Project
                        </button>
                        <CreateProjectDialog isDialogOpen={isDialogOpen} setIsDialogOpen={setIsDialogOpen} />
                    </>
                )}
            </div>

            {attendanceStatus?.neverAttended && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <div>
                        <span className="font-semibold">No attendance on record.</span>{' '}
                        You haven't marked attendance yet. Head to the <a href="/attendance" className="underline underline-offset-2 hover:opacity-80">Attendance</a> page to get started.
                    </div>
                </div>
            )}

            {attendanceStatus && !attendanceStatus.neverAttended && !attendanceStatus.markedToday && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 text-sm">
                    <Clock size={16} className="mt-0.5 shrink-0" />
                    <div>
                        <span className="font-semibold">Attendance not marked today.</span>{' '}
                        Don't forget to mark your attendance for today on the <a href="/attendance" className="underline underline-offset-2 hover:opacity-80">Attendance</a> page.
                    </div>
                </div>
            )}

            <StatsGrid />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                <div className="lg:col-span-2 space-y-6 sm:space-y-8">
                    <ProjectOverview />
                    <RecentActivity />
                </div>
                <div className="space-y-6">
                    {user?.role !== "ADMIN" && <NotificationsCard />}
                    <TasksSummary />
                </div>
            </div>
         <div className="text-sm text-zinc-200 dark:text-zinc-400">Copyright 2026 | riseflake.com</div>
        </div>
    )
}

export default Dashboard
