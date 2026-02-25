import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './pages/Layout'
import { Toaster } from 'react-hot-toast'
import Dashboard from './pages/Dashboard'

// Lazy-load non-critical routes to reduce initial bundle
const Projects = lazy(() => import('./pages/Projects'))
const Team = lazy(() => import('./pages/Team'))
const ProjectDetails = lazy(() => import('./pages/ProjectDetails'))
const TaskDetails = lazy(() => import('./pages/TaskDetails'))
const Settings = lazy(() => import('./pages/Settings'))
const Groups = lazy(() => import('./pages/Groups'))
const Attendance = lazy(() => import('./pages/Attendance'))
const EmailMonitor = lazy(() => import('./pages/EmailMonitor'))

const PageFallback = () => (
    <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-72 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            ))}
        </div>
    </div>
)

const App = () => {
    return (
        <>
            <Toaster />
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="team" element={<Suspense fallback={<PageFallback />}><Team /></Suspense>} />
                    <Route path="projects" element={<Suspense fallback={<PageFallback />}><Projects /></Suspense>} />
                    <Route path="groups" element={<Suspense fallback={<PageFallback />}><Groups /></Suspense>} />
                    <Route path="attendance" element={<Suspense fallback={<PageFallback />}><Attendance /></Suspense>} />
                    <Route path="email-monitor" element={<Suspense fallback={<PageFallback />}><EmailMonitor /></Suspense>} />
                    <Route path="projectsDetail" element={<Suspense fallback={<PageFallback />}><ProjectDetails /></Suspense>} />
                    <Route path='taskDetails' element={<Suspense fallback={<PageFallback />}><TaskDetails /></Suspense>} />
                    <Route path='settings' element={<Suspense fallback={<PageFallback />}><Settings /></Suspense>} />
                </Route>
            </Routes>
        </>
    )
}

export default App
