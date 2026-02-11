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

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const { user, login, getToken, isAuthenticated } = useAuth()
    const { workspaces, loading } = useSelector((state) => state.workspace)
    const dispatch = useDispatch()
    const [formData, setFormData] = useState({ email: "", password: "" })
    const [isLoggingIn, setIsLoggingIn] = useState(false)
    const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false)
    const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0)

    const quotes = [
        { text: "Take a long breath... you've got this! 💪", emoji: "❤️" },
        { text: "Every great project starts here ✨", emoji: "⭐" },
        { text: "Stay focused, you're doing amazing!", emoji: "🎯" },
        { text: "Your success is just a moment away ⏳", emoji: "✨" },
        { text: "Breathe in... exhale... relax 🧘", emoji: "🌿" },
        { text: "You're stronger than you think 💪", emoji: "🔥" },
        { text: "Keep pushing, the best is coming!", emoji: "🚀" },
        { text: "Believe in yourself, you've got it! 💫", emoji: "🌟" },
        { text: "Take a deep breath and smile 😊", emoji: "🎉" },
        { text: "Loading greatness... just for you!", emoji: "👑" },
        { text: "Your workspace is almost ready 🎪", emoji: "🎨" },
        { text: "Motivation: ON ✓ Confidence: HIGH 📈", emoji: "💯" },
        { text: "Embrace the moment - you've got this!", emoji: "🦾" },
        { text: "Every second counts - stay patient 🏆", emoji: "⏱️" },
        { text: "Dream big, work smart, stay humble 🌈", emoji: "💎" },
        { text: "Power up! Your projects await ⚡", emoji: "🔋" },
    ]

    // Initial load of theme
    useEffect(() => {
        dispatch(loadTheme())
    }, [])

    // Quote rotation
    useEffect(() => {
        const quoteInterval = setInterval(() => {
            setCurrentQuoteIndex((prev) => (prev + 1) % quotes.length)
        }, 3000)
        return () => clearInterval(quoteInterval)
    }, [quotes.length])

    // Initial load of workspaces
    useEffect(() => {
        if (isAuthenticated && user && workspaces.length === 0) {
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

    // Global Loading Screen
    if (loading) {
        return (
            <div className="relative flex items-center justify-center min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
                {/* Mesh gradient blobs */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-30 dark:opacity-20" style={{ background: 'radial-gradient(circle, #3b82f6, transparent 70%)', top: '-15%', left: '-10%', animation: 'mesh-drift 8s ease-in-out infinite' }} />
                    <div className="absolute w-[500px] h-[500px] rounded-full blur-[100px] opacity-20 dark:opacity-15" style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)', bottom: '-10%', right: '-5%', animation: 'mesh-drift 10s ease-in-out infinite reverse' }} />
                    <div className="absolute w-[300px] h-[300px] rounded-full blur-[80px] opacity-15 dark:opacity-10" style={{ background: 'radial-gradient(circle, #8b5cf6, transparent 70%)', top: '40%', right: '20%', animation: 'mesh-drift 12s ease-in-out infinite 2s' }} />
                </div>

                <div className="relative z-10 flex flex-col items-center justify-center gap-10 sm:gap-12 max-w-sm sm:max-w-md px-6">
                    {/* Orbital loader */}
                    <div className="relative w-28 h-28 sm:w-32 sm:h-32">
                        {/* Orbit rings */}
                        <div className="absolute inset-0 rounded-full border border-blue-200/60 dark:border-blue-500/20" style={{ animation: 'orbit-spin 3s linear infinite' }} >
                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-blue-500 dark:bg-blue-400 shadow-lg shadow-blue-500/50" />
                        </div>
                        <div className="absolute inset-3 rounded-full border border-indigo-200/50 dark:border-indigo-500/15" style={{ animation: 'orbit-spin 4s linear infinite reverse' }} >
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-indigo-400 dark:bg-indigo-400 shadow-lg shadow-indigo-400/50" />
                        </div>
                        <div className="absolute inset-6 rounded-full border border-violet-200/40 dark:border-violet-500/15" style={{ animation: 'orbit-spin 5s linear infinite' }} >
                            <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-violet-400 dark:bg-violet-400 shadow-lg shadow-violet-400/50" />
                        </div>
                        {/* Center icon */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-500 dark:to-purple-600 shadow-xl shadow-blue-500/25 dark:shadow-blue-500/30 flex items-center justify-center" style={{ animation: 'center-breathe 2.5s ease-in-out infinite' }}>
                                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Quote card */}
                    <div className="w-full bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-white/80 dark:border-zinc-700/40 rounded-3xl p-6 sm:p-8 shadow-lg shadow-blue-500/[0.03] dark:shadow-black/20 text-center space-y-3">
                        <div className="text-3xl sm:text-4xl transition-all duration-500" style={{ animation: 'fade-swap 3s ease-in-out infinite' }}>
                            {quotes[currentQuoteIndex].emoji}
                        </div>
                        <p className="text-sm sm:text-base font-medium text-gray-700 dark:text-zinc-300 leading-relaxed transition-all duration-500">
                            {quotes[currentQuoteIndex].text}
                        </p>
                    </div>

                    {/* Wave progress */}
                    <div className="w-full max-w-xs space-y-4">
                        <div className="relative h-1 bg-gray-200/80 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div className="absolute h-full w-1/3 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400" style={{ animation: 'wave-slide 1.8s ease-in-out infinite' }} />
                        </div>
                        <p className="text-center text-xs text-gray-400 dark:text-zinc-500 font-medium tracking-widest uppercase">
                            Loading workspace
                        </p>
                    </div>
                </div>

                <style>{`
                    @keyframes mesh-drift {
                        0%, 100% { transform: translate(0, 0) scale(1); }
                        33% { transform: translate(30px, -20px) scale(1.05); }
                        66% { transform: translate(-20px, 15px) scale(0.95); }
                    }
                    @keyframes orbit-spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                    @keyframes center-breathe {
                        0%, 100% { transform: scale(1); opacity: 1; }
                        50% { transform: scale(0.92); opacity: 0.85; }
                    }
                    @keyframes fade-swap {
                        0%, 100% { opacity: 1; transform: translateY(0); }
                        45% { opacity: 1; }
                        50% { opacity: 0.4; transform: translateY(-2px); }
                        55% { opacity: 1; }
                    }
                    @keyframes wave-slide {
                        0% { left: -33%; }
                        100% { left: 100%; }
                    }
                `}</style>
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

    // Main Layout (unchanged)
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