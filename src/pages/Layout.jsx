import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { Outlet } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { fetchWorkspaces } from '../features/workspaceSlice'
import { loadTheme } from '../features/themeSlice'
import { useAuth } from '../auth/AuthContext'
import { toast } from 'react-hot-toast'
import CreateWorkspaceDialog from '../components/CreateWorkspaceDialog'

const SkeletonPulse = ({ className = "" }) => (
    <div className={`animate-pulse rounded bg-zinc-200 dark:bg-zinc-800 ${className}`} />
)

const DashboardSkeleton = () => (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="space-y-2">
                <SkeletonPulse className="h-7 w-56" />
                <SkeletonPulse className="h-4 w-72" />
            </div>
            <SkeletonPulse className="h-10 w-36 rounded" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 my-9">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md p-6 py-4">
                    <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                            <SkeletonPulse className="h-4 w-24" />
                            <SkeletonPulse className="h-9 w-12" />
                            <SkeletonPulse className="h-3 w-20" />
                        </div>
                        <SkeletonPulse className="h-11 w-11 rounded-xl" />
                    </div>
                </div>
            ))}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="lg:col-span-2 space-y-6 sm:space-y-8">
                {/* Project Overview Skeleton */}
                <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                    <div className="border-b border-zinc-200 dark:border-zinc-800 p-4 flex justify-between">
                        <SkeletonPulse className="h-5 w-32" />
                        <SkeletonPulse className="h-5 w-16" />
                    </div>
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="p-6 border-b border-zinc-200 dark:border-zinc-800 last:border-0">
                            <div className="flex justify-between mb-3">
                                <div className="space-y-2 flex-1">
                                    <SkeletonPulse className="h-5 w-48" />
                                    <SkeletonPulse className="h-4 w-64" />
                                </div>
                                <SkeletonPulse className="h-6 w-16 rounded" />
                            </div>
                            <SkeletonPulse className="h-1.5 w-full rounded mt-4" />
                        </div>
                    ))}
                </div>

                {/* Recent Activity Skeleton */}
                <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                    <div className="border-b border-zinc-200 dark:border-zinc-800 p-4">
                        <SkeletonPulse className="h-5 w-32" />
                    </div>
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="p-6 border-b border-zinc-200 dark:border-zinc-800 last:border-0">
                            <div className="flex items-start gap-4">
                                <SkeletonPulse className="h-8 w-8 rounded-lg shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <SkeletonPulse className="h-5 w-44" />
                                    <SkeletonPulse className="h-3 w-32" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                        <div className="border-b border-zinc-200 dark:border-zinc-800 p-4 pb-3">
                            <div className="flex items-center gap-3">
                                <SkeletonPulse className="h-8 w-8 rounded-lg" />
                                <div className="flex-1 flex justify-between items-center">
                                    <SkeletonPulse className="h-4 w-20" />
                                    <SkeletonPulse className="h-6 w-8 rounded" />
                                </div>
                            </div>
                        </div>
                        <div className="p-4 space-y-3">
                            {[...Array(2)].map((_, j) => (
                                <div key={j} className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900">
                                    <SkeletonPulse className="h-4 w-36 mb-2" />
                                    <SkeletonPulse className="h-3 w-28" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
)

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const { user, login, getToken, isAuthenticated } = useAuth()
    const { workspaces, loading } = useSelector((state) => state.workspace)
    const dispatch = useDispatch()
    const [formData, setFormData] = useState({ email: "", password: "" })
    const [isLoggingIn, setIsLoggingIn] = useState(false)
    const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false)

    // Initial load of theme
    useEffect(() => {
        dispatch(loadTheme())
    }, [])

    // Initial load of workspaces — always fetch fresh data (cache provides instant UI)
    useEffect(() => {
        if (isAuthenticated && user) {
            dispatch(fetchWorkspaces({ getToken }))
        }
    }, [user, isAuthenticated])

    const handleLogin = async (e) => {
        e.preventDefault()
        setIsLoggingIn(true)
        try {
            await login(formData.email, formData.password)
            toast.success("Logged in successfully")
            dispatch(fetchWorkspaces({ getToken }))
        } catch (error) {
            console.log(error)
            toast.error(error.response?.data?.message || error.message)
        } finally {
            setIsLoggingIn(false)
        }
    }

    // Modern Light Blue Login Screen
    if (!user) {
        return (
            <div className="relative flex justify-center items-center min-h-screen overflow-hidden bg-white dark:from-zinc-950 dark:via-blue-950/20 dark:to-purple-950/10">
                {/* Subtle animated shapes - light blue theme */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {/* Top right circle */}
                    <div
                        className="absolute w-96 h-96 bg-blue-500/5 dark:from-blue-500/20 dark:to-purple-500/20 rounded-full blur-3xl"
                        style={{
                            top: '-10%',
                            right: '-10%',
                            animation: 'float 15s ease-in-out infinite',
                        }}
                    />
                    {/* Bottom left circle */}
                    <div
                        className="absolute w-80 h-80 bg-blue-400/5 dark:from-purple-500/20 dark:to-pink-500/20 rounded-full blur-3xl"
                        style={{
                            bottom: '-10%',
                            left: '-5%',
                            animation: 'float 12s ease-in-out infinite reverse',
                        }}
                    />
                    {/* Grid pattern */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(59_130_246/0.05)_1px,transparent_1px)] dark:bg-[radial-gradient(circle_at_1px_1px,rgb(59_130_246/0.1)_1px,transparent_1px)] [background-size:32px_32px]" />
                </div>

                {/* Clean Login Card */}
                <div className="relative z-10 w-full max-w-md mx-4 sm:mx-auto">
                    {/* Logo Section */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 sm:w-18 sm:h-18 mb-5 rounded-2xl bg-blue-600 dark:bg-gradient-to-br dark:from-blue-500 dark:to-purple-600 shadow-lg shadow-blue-600/20 dark:shadow-blue-500/30 transition-transform hover:scale-105">
                            <svg className="w-8 h-8 sm:w-9 sm:h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                            Welcome Back
                        </h1>
                        <p className="text-sm text-gray-600 dark:text-zinc-400">Sign in to continue</p>
                    </div>

                    {/* Clean White Card */}
                    <form
                        onSubmit={handleLogin}
                        className="bg-white dark:bg-zinc-900/70 dark:border dark:border-zinc-700/50 rounded-3xl p-6 sm:p-8 shadow-xl shadow-blue-600/5 dark:shadow-black/30 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-600/10"
                    >
                        <div className="space-y-5">
                            {/* Email Input */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 dark:text-zinc-300 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                    </svg>
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full rounded-xl border-2 border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/50 dark:backdrop-blur-sm text-gray-900 dark:text-zinc-100 text-sm py-3 px-4 focus:outline-none focus:border-blue-600 dark:focus:ring-2 dark:focus:ring-blue-500/50 dark:focus:border-transparent transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-500 hover:border-gray-300"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>

                            {/* Password Input */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 dark:text-zinc-300 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    Password
                                </label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full rounded-xl border-2 border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/50 dark:backdrop-blur-sm text-gray-900 dark:text-zinc-100 text-sm py-3 px-4 focus:outline-none focus:border-blue-600 dark:focus:ring-2 dark:focus:ring-blue-500/50 dark:focus:border-transparent transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-500 hover:border-gray-300"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>

                            {/* Sign In Button */}
                            <button
                                type="submit"
                                disabled={isLoggingIn}
                                className="group relative w-full py-3.5 rounded-xl bg-blue-600 dark:bg-gradient-to-r dark:from-blue-500 dark:via-purple-500 dark:to-pink-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/30 dark:shadow-blue-500/30 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/40 dark:hover:shadow-blue-500/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                            >
                                <span className="flex items-center justify-center gap-2">
                                    {isLoggingIn ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Signing in...
                                        </>
                                    ) : (
                                        <>
                                            Sign In
                                            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </>
                                    )}
                                </span>
                            </button>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-zinc-400 mt-6">
                            <svg className="w-4 h-4 text-blue-600 dark:text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span>Secure & Encrypted</span>
                        </div>
                    </form>
                </div>

                <style>{`
                    @keyframes float {
                        0%, 100% { transform: translateY(0px) translateX(0px); }
                        50% { transform: translateY(-20px) translateX(10px); }
                    }
                `}</style>
            </div>
        )
    }

    // Loading state — show skeleton inside the real layout shell
    if (loading) {
        return (
            <div className="flex bg-white dark:bg-zinc-950 text-gray-900 dark:text-slate-100">
                {/* Sidebar skeleton */}
                <div className="z-10 bg-white dark:bg-zinc-900 w-68 min-w-68 max-w-68 flex-col h-screen border-r border-gray-200 dark:border-zinc-800 max-sm:hidden flex">
                    <div className="p-4 space-y-3">
                        <SkeletonPulse className="h-10 w-full rounded-lg" />
                    </div>
                    <hr className="border-gray-200 dark:border-zinc-800" />
                    <div className="p-4 space-y-2">
                        {[...Array(6)].map((_, i) => (
                            <SkeletonPulse key={i} className="h-9 w-full rounded" />
                        ))}
                    </div>
                    <div className="p-4 space-y-2 mt-4">
                        <SkeletonPulse className="h-4 w-20 mb-3" />
                        {[...Array(3)].map((_, i) => (
                            <SkeletonPulse key={i} className="h-7 w-full rounded" />
                        ))}
                    </div>
                </div>
                {/* Main content */}
                <div className="flex-1 flex flex-col h-screen">
                    {/* Navbar skeleton */}
                    <div className="w-full bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-6 xl:px-16 py-3">
                        <div className="flex items-center justify-between max-w-6xl mx-auto">
                            <SkeletonPulse className="h-9 w-64 rounded-md" />
                            <div className="flex items-center gap-3">
                                <SkeletonPulse className="h-8 w-8 rounded-lg" />
                                <SkeletonPulse className="h-5 w-24" />
                                <SkeletonPulse className="h-8 w-16 rounded" />
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 h-full p-4 sm:p-6 xl:p-10 xl:px-16 overflow-y-scroll">
                        <DashboardSkeleton />
                    </div>
                </div>
            </div>
        )
    }

    if (user && workspaces.length === 0) {
        return (
            <div className="min-h-screen flex flex-col justify-center items-center text-zinc-600 dark:text-zinc-300 gap-4">
                <div>No workspaces available yet.</div>
                {user?.role === "ADMIN" && (
                    <button
                        onClick={() => setIsCreateWorkspaceOpen(true)}
                        className="px-5 py-2 text-sm rounded bg-gradient-to-br from-blue-500 to-blue-600 hover:opacity-90 text-white transition"
                    >
                        Create Workspace
                    </button>
                )}
                <CreateWorkspaceDialog isDialogOpen={isCreateWorkspaceOpen} setIsDialogOpen={setIsCreateWorkspaceOpen} />
            </div>
        )
    }

    // Main Layout
    return (
        <div className="flex bg-white dark:bg-zinc-950 text-gray-900 dark:text-slate-100">
            <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            <div className="flex-1 flex flex-col h-screen">
                <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
                <div className="flex-1 h-full p-4 sm:p-6 xl:p-10 xl:px-16 overflow-y-scroll">
                    <Outlet />
                </div>
            </div>
        </div>
    )
}

export default Layout
