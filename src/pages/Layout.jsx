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
        }, 1500)
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

    if (!user) {
        return (
            <div className="flex justify-center items-center h-screen bg-white dark:bg-zinc-950">
                <form onSubmit={handleLogin} className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 shadow">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Sign in</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm text-zinc-600 dark:text-zinc-400">Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="mt-1 w-full rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-200 text-sm py-2 px-3 focus:outline-none focus:border-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm text-zinc-600 dark:text-zinc-400">Password</label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="mt-1 w-full rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-200 text-sm py-2 px-3 focus:outline-none focus:border-blue-500"
                                required
                            />
                        </div>
                        <button type="submit" disabled={isLoggingIn} className="w-full py-2 rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm hover:opacity-90 disabled:opacity-60">
                            {isLoggingIn ? "Signing in..." : "Sign in"}
                        </button>
                    </div>
                </form>
            </div>
        )
    }

    if (loading) return (
        <div className='flex items-center justify-center h-screen bg-gradient-to-br from-white dark:from-zinc-950 via-blue-50/50 dark:via-zinc-900/50 to-white dark:to-zinc-950'>
            <div className='flex flex-col items-center justify-center gap-8 max-w-md'>
                {/* Animated circles loader */}
                <div className='relative w-20 h-20'>
                    <div className='absolute inset-0 rounded-full border-4 border-blue-200 dark:border-zinc-800' />
                    <div className='absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 dark:border-t-blue-400 animate-spin' />
                    <div className='absolute inset-2 rounded-full border-2 border-blue-100 dark:border-zinc-800 animate-pulse' />
                </div>

                {/* Quote section */}
                <div className='text-center space-y-3'>
                    <div className='text-4xl'>{quotes[currentQuoteIndex].emoji}</div>
                    <p className='text-lg font-semibold text-zinc-800 dark:text-zinc-100 leading-relaxed'>
                        {quotes[currentQuoteIndex].text}
                    </p>
                </div>

                {/* Loading progress indicator */}
                <div className='w-full space-y-2'>
                    <div className='h-1 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden'>
                        <div className='h-full bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 rounded-full animate-pulse' />
                    </div>
                    <p className='text-xs text-zinc-500 dark:text-zinc-400 text-center'>
                        Loading your workspace...
                    </p>
                </div>
            </div>
        </div>
    )

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
