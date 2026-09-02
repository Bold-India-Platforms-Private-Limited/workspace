import { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { fetchWorkspaces, fetchWorkspaceDetail, resetState } from '../features/workspaceSlice'
import { loadTheme } from '../features/themeSlice'
import { useAuth } from '../auth/AuthContext'
import { toast } from 'react-hot-toast'
import CreateWorkspaceDialog from '../components/CreateWorkspaceDialog'
import NoticesBanner from '../components/NoticesBanner'
import MobileModal from '../components/MobileModal'
import NdaModal, { ndaCacheKey, ndaDismissKey } from '../components/NdaModal'
import CaptchaWidget from '../components/CaptchaWidget'

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
    const { user, login, getToken, isAuthenticated, logout } = useAuth()
    const navigate = useNavigate()
    const { pathname } = useLocation()
    const { workspaces, loading, fetchError } = useSelector((state) => state.workspace)
    const dispatch = useDispatch()
    const [formData, setFormData] = useState({ email: "", password: "" })
    const [isLoggingIn, setIsLoggingIn] = useState(false)
    const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false)
    const [showMobileModal, setShowMobileModal] = useState(false)
    const [showNdaModal,    setShowNdaModal]    = useState(false)
    const [showForgot, setShowForgot] = useState(false)
    const [forgotEmail, setForgotEmail] = useState("")
    const [forgotState, setForgotState] = useState("idle") // idle | loading | success | error
    const [forgotMsg, setForgotMsg] = useState("")

    // Custom CAPTCHA refs and state
    const loginCaptchaRef  = useRef(null)
    const forgotCaptchaRef = useRef(null)
    const [loginCaptcha,  setLoginCaptcha]  = useState({ token: "", answer: "" })
    const [forgotCaptcha, setForgotCaptcha] = useState({ token: "", answer: "" })

    // Initial load of theme
    useEffect(() => {
        dispatch(loadTheme())
    }, [])

    // Initial load of workspaces — cache provides instant UI, this keeps data fresh
    useEffect(() => {
        if (isAuthenticated && user) {
            dispatch(fetchWorkspaces({ getToken }))
        }
    }, [user, isAuthenticated])

    // Check if user has set a mobile number; show modal if not
    useEffect(() => {
        if (!isAuthenticated || !user) return
        let cancelled = false;
        getToken().then(async (token) => {
            try {
                const res = await fetch(`${import.meta.env.VITE_BASEURL}/api/users/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                if (!res.ok) return
                const data = await res.json()
                if (!cancelled && !data?.user?.mobile) setShowMobileModal(true)
            } catch { /* silently ignore */ }
        })
        return () => { cancelled = true }
    }, [isAuthenticated, user])

    // Check NDA status — localStorage-first: zero API cost if already signed
    // Runs once when both user and workspaceId are available
    const currentWorkspaceId = useSelector((state) => state.workspace?.currentWorkspace?.id)

    // Load the heavy project/task/group graph for the SELECTED workspace only.
    // Fires on first load and on every workspace switch (the id changes).
    useEffect(() => {
        if (!isAuthenticated || !user || !currentWorkspaceId) return
        dispatch(fetchWorkspaceDetail({ getToken, workspaceId: currentWorkspaceId }))
    }, [isAuthenticated, user, currentWorkspaceId])

    useEffect(() => {
        if (!isAuthenticated || !user || !currentWorkspaceId) return
        // Skip admin — NDA is for interns only
        if (user.role === 'ADMIN') return

        // 1. Already signed permanently — never show
        const cacheKey   = ndaCacheKey(user.id, currentWorkspaceId)
        if (localStorage.getItem(cacheKey) === 'true') return

        // 2. Dismissed this session — don't show until next session
        const dismissKey = ndaDismissKey(user.id, currentWorkspaceId)
        if (sessionStorage.getItem(dismissKey) === 'true') return

        // 3. One API call to check server-side status
        let cancelled = false
        getToken().then(async (token) => {
            try {
                const res = await fetch(
                    `${import.meta.env.VITE_BASEURL}/api/nda/status?workspaceId=${currentWorkspaceId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                )
                if (!res.ok || cancelled) return
                const data = await res.json()
                if (data.signed) {
                    localStorage.setItem(cacheKey, 'true')  // cache — never ask again
                } else {
                    setShowNdaModal(true)
                }
            } catch { /* silently ignore network errors */ }
        })
        return () => { cancelled = true }
    }, [isAuthenticated, user, currentWorkspaceId])

    // Auto-retry when the user returns to the tab after a backend hiccup.
    // Only fires if there's nothing to show — avoids spamming the backend
    // when cached workspaces are already displayed fine.
    useEffect(() => {
        if (!isAuthenticated || !user) return
        const handleFocus = () => {
            if (workspaces.length === 0 || fetchError) {
                dispatch(fetchWorkspaces({ getToken }))
            }
        }
        window.addEventListener('focus', handleFocus)
        return () => window.removeEventListener('focus', handleFocus)
    }, [user, isAuthenticated, workspaces.length, fetchError])

    const handleForgot = async (e) => {
        e.preventDefault()
        if (!forgotCaptcha.answer || forgotCaptcha.answer.length < 6) {
            setForgotState("error")
            setForgotMsg("Please type all 6 CAPTCHA characters.")
            return
        }
        setForgotState("loading")
        setForgotMsg("")
        try {
            const res = await fetch(`${import.meta.env.VITE_BASEURL}/api/auth/request-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: forgotEmail, captchaToken: forgotCaptcha.token, captchaAnswer: forgotCaptcha.answer }),
            })
            const data = await res.json()
            if (!res.ok) {
                setForgotState("error")
                setForgotMsg(data.message || "Something went wrong")
                forgotCaptchaRef.current?.reset()
                setForgotCaptcha({ token: "", answer: "" })
            } else {
                setForgotState("success")
                setForgotMsg(data.message)
            }
        } catch {
            setForgotState("error")
            setForgotMsg("Unable to reach the server. Please try again.")
            forgotCaptchaRef.current?.reset()
            setForgotCaptcha({ token: "", answer: "" })
        }
    }

    const closeForgot = () => {
        setShowForgot(false)
        setForgotEmail("")
        setForgotState("idle")
        setForgotMsg("")
        forgotCaptchaRef.current?.reset()
        setForgotCaptcha({ token: "", answer: "" })
    }

    const handleLogin = async (e) => {
        e.preventDefault()
        if (!loginCaptcha.answer || loginCaptcha.answer.length < 6) {
            toast.error("Please complete the CAPTCHA.")
            return
        }
        setIsLoggingIn(true)
        try {
            await login(formData.email, formData.password, loginCaptcha.token, loginCaptcha.answer)
            toast.success("Logged in successfully")
            dispatch(fetchWorkspaces({ getToken }))
        } catch (error) {
            console.log(error)
            toast.error(error.response?.data?.message || error.message)
            loginCaptchaRef.current?.reset()
            setLoginCaptcha({ token: "", answer: "" })
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

                            {/* Custom CAPTCHA for login */}
                            <CaptchaWidget
                                ref={loginCaptchaRef}
                                onChange={setLoginCaptcha}
                            />

                            {/* Sign In Button */}
                            <button
                                type="submit"
                                disabled={isLoggingIn || loginCaptcha.answer.length < 6}
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
                        <div className="flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-zinc-400 mt-6">
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-blue-600 dark:text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>Secure & Encrypted</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowForgot(true)}
                                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                            >
                                Forgot password?
                            </button>
                        </div>
                    </form>
                </div>

                {/* ── Forgot password modal ── */}
                {showForgot && (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeForgot}>
                        <div
                            className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm p-7 relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close */}
                            <button onClick={closeForgot} className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            {forgotState === "success" ? (
                                /* Success state */
                                <div className="text-center py-2">
                                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                                        <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Password sent!</h3>
                                    <p className="text-sm text-gray-700 dark:text-zinc-300 mb-4 font-medium">
                                        We've sent your new password to your email address.
                                    </p>
                                    {/* Spam notice */}
                                    <div className="text-left mb-5 flex items-start gap-2.5 px-3 py-3 rounded-lg bg-amber-50 border border-amber-200">
                                        <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                                        </svg>
                                        <div>
                                            <p className="text-xs font-semibold text-amber-800">Can't find the email?</p>
                                            <p className="text-xs text-amber-700 mt-0.5">
                                                Check your <strong>Spam</strong> or <strong>Promotions</strong> folder. If found there, mark it as <em>"Not Spam"</em> so future emails reach your inbox.
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={closeForgot} className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition">
                                        Back to login
                                    </button>
                                </div>
                            ) : (
                                /* Request form */
                                <>
                                    <div className="mb-5">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Request new password</h3>
                                        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                                            Enter your registered email. We'll send a new password instantly.
                                        </p>
                                    </div>

                                    <form onSubmit={handleForgot} className="space-y-4">
                                        <div>
                                            <label className="text-sm font-semibold text-gray-700 dark:text-zinc-300 block mb-1.5">Email address</label>
                                            <input
                                                type="email"
                                                value={forgotEmail}
                                                onChange={(e) => { setForgotEmail(e.target.value); setForgotMsg(""); setForgotState("idle"); }}
                                                placeholder="you@example.com"
                                                required
                                                autoFocus
                                                style={{ backgroundColor: "white", border: "2px solid #e5e7eb", color: "#111827" }}
                                                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition placeholder-gray-400"
                                            />
                                        </div>

                                        {/* Always-visible notice */}
                                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
                                            <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            <p className="text-xs text-amber-800 font-medium leading-relaxed">
                                                Only use your registered email.<br />
                                                <span className="font-normal text-amber-700">Unregistered emails will not be accepted.</span>
                                            </p>
                                        </div>

                                        {/* Email-not-found error */}
                                        {forgotState === "error" && (
                                            <div className="flex items-start gap-2.5 px-3 py-3 rounded-lg bg-red-50 border-l-4 border-red-500">
                                                <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                                <div>
                                                    <p className="text-xs font-semibold text-red-700">{forgotMsg}</p>
                                                    <p className="text-xs text-red-500 mt-0.5">Please use only the email registered with us.</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Custom CAPTCHA for forgot password */}
                                        <CaptchaWidget
                                            ref={forgotCaptchaRef}
                                            onChange={setForgotCaptcha}
                                        />

                                        <button
                                            type="submit"
                                            disabled={forgotState === "loading" || forgotCaptcha.answer.length < 6}
                                            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-lg shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                                        >
                                            {forgotState === "loading" ? (
                                                <>
                                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                    </svg>
                                                    Sending…
                                                </>
                                            ) : "Send new password"}
                                        </button>
                                    </form>
                                </>
                            )}
                        </div>
                    </div>
                )}

                <style>{`
                    @keyframes float {
                        0%, 100% { transform: translateY(0px) translateX(0px); }
                        50% { transform: translateY(-20px) translateX(10px); }
                    }
                `}</style>
            </div>
        )
    }

    // ── Render decision tree ─────────────────────────────────────────────────
    //
    //  1. loading=true  AND  no data yet   → skeleton (first load / empty cache)
    //  2. fetchError    AND  no data        → connection error + retry button
    //  3. loaded OK     AND  no workspaces  → create-workspace (admin) / contact-admin (member)
    //  4. has workspaces                    → main layout
    //     (background refresh errors while data is showing are silently ignored —
    //      the user keeps seeing their cached workspaces without disruption)
    // ─────────────────────────────────────────────────────────────────────────

    // Case 1 — Loading state: show skeleton inside the real layout shell
    if (loading && workspaces.length === 0) {
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

    // Case 2 — Connection error with no cached data to fall back on
    const handleLogout = () => {
        dispatch(resetState())   // wipe Redux state so stale data doesn't persist
        logout()
        navigate('/')            // '/' re-renders Layout which shows login form when user=null
    }

    if (fetchError && workspaces.length === 0) {
        return (
            <div className="min-h-screen flex flex-col justify-center items-center gap-5 px-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                </div>
                <div>
                    <p className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                        Unable to connect
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">
                        The server could not be reached. Your internet connection or the server may be temporarily unavailable.
                    </p>
                </div>
                <div className="flex gap-3 flex-wrap justify-center">
                    <button
                        onClick={() => dispatch(fetchWorkspaces({ getToken }))}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition font-medium"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Try again
                    </button>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm rounded-lg bg-zinc-600 hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white transition font-medium"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout Workspace
                    </button>
                </div>
                <div className="space-y-2 max-w-sm">
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">
                        The page will also retry automatically when you return to this tab.
                    </p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 border-t border-zinc-300 dark:border-zinc-700 pt-2">
                        <span className="font-medium text-zinc-600 dark:text-zinc-400">Troubleshooting:</span> If this issue persists, you can try clearing your browser cache or re-logging in using incognito mode.
                    </p>
                </div>
            </div>
        )
    }

    // Case 3 — Loaded successfully but the user has no workspaces yet
    if (!loading && !fetchError && workspaces.length === 0) {
        return (
            <div className="min-h-screen flex flex-col justify-center items-center text-zinc-600 dark:text-zinc-300 gap-4">
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                    {user?.role === "ADMIN"
                        ? "No workspaces yet. Create one to get started."
                        : "You have not been added to any workspace. Please contact your admin."}
                </p>
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
            {showMobileModal && <MobileModal onSaved={() => setShowMobileModal(false)} />}
            {showNdaModal && pathname === '/' && (
                <NdaModal
                    onSigned={() => setShowNdaModal(false)}
                    onDismiss={() => setShowNdaModal(false)}
                />
            )}
            <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            <div className="flex-1 flex flex-col h-screen">
                <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
                <div className="flex-1 flex flex-col h-full overflow-y-scroll">
                    <NoticesBanner />
                    <div className="flex-1 p-4 sm:p-6 xl:p-10 xl:px-16">
                        <Outlet />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Layout
