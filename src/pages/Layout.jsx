import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { Outlet } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { fetchWorkspaces } from '../features/workspaceSlice'
import { loadTheme } from '../features/themeSlice'
import { Loader2Icon } from 'lucide-react'
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

    // Initial load of theme
    useEffect(() => {
        dispatch(loadTheme())
    }, [])

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
        <div className='flex items-center justify-center h-screen bg-white dark:bg-zinc-950'>
            <Loader2Icon className="size-7 text-blue-500 animate-spin" />
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
