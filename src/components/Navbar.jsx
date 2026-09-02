import { useEffect, useRef, useState } from 'react'
import { SearchIcon, PanelLeft, LogOut, ChevronDown, User as UserIcon, Shield, Bell, MoonIcon, SunIcon } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { toggleTheme } from '../features/themeSlice'
import { useAuth } from '../auth/AuthContext'
import { thumb } from '../utils/cloudinaryUrl'

const initials = (name = '', email = '') => {
    const src = (name || email || '').trim()
    if (!src) return 'U'
    const parts = src.split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return src.slice(0, 2).toUpperCase()
}

const Navbar = ({ setIsSidebarOpen }) => {

    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { theme } = useSelector(state => state.theme);
    const { user, logout } = useAuth();
    const displayName = user?.name || user?.email || "User";

    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        if (!menuOpen) return;
        const onClick = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
        };
        const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
        document.addEventListener('mousedown', onClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [menuOpen]);

    const go = (to) => { setMenuOpen(false); navigate(to); };

    const menuLinks = [
        { label: 'Profile', icon: UserIcon, to: '/settings' },
        { label: 'Account', icon: Shield, to: '/settings?tab=account' },
        { label: 'Notifications', icon: Bell, to: '/settings?tab=notifications' },
    ];

    return (
        <div className="w-full bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-6 xl:px-16 py-3 flex-shrink-0">
            <div className="flex items-center justify-between max-w-6xl mx-auto">
                {/* Left section */}
                <div className="flex items-center gap-4 min-w-0 flex-1">
                    {/* Sidebar Trigger */}
                    <button onClick={() => setIsSidebarOpen((prev) => !prev)} className="sm:hidden p-2 -ml-2 rounded-lg transition-colors text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-800" >
                        <PanelLeft size={20} />
                    </button>

                    {/* Search Input */}
                    <div className="relative flex-1 max-w-sm">
                        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-400 size-3.5" />
                        <input
                            type="text"
                            placeholder="Search projects, tasks..."
                            className="pl-8 pr-4 py-2 w-full bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                    </div>
                </div>

                {/* Right section */}
                <div className="flex items-center gap-3 ml-2 sm:ml-0">

                    {/* Theme Toggle */}
                    <button onClick={() => dispatch(toggleTheme())} className="size-8 flex items-center justify-center bg-white dark:bg-zinc-800 shadow rounded-lg transition hover:scale-105 active:scale-95" aria-label="Toggle theme">
                        {
                            theme === "light"
                                ? (<MoonIcon className="size-4 text-gray-800 dark:text-gray-200" />)
                                : (<SunIcon className="size-4 text-yellow-400" />)
                        }
                    </button>

                    {/* Profile menu */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setMenuOpen((o) => !o)}
                            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 transition"
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                        >
                            {user?.image
                                ? <img src={thumb(user.image, 64, 64)} alt="" className="size-7 rounded-full object-cover" />
                                : <span className="size-7 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center justify-center">{initials(user?.name, user?.email)}</span>
                            }
                            <span className="hidden sm:block max-w-32 truncate text-sm text-gray-700 dark:text-zinc-200">{displayName}</span>
                            <ChevronDown size={14} className={`text-gray-400 dark:text-zinc-500 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {menuOpen && (
                            <div role="menu" className="absolute right-0 top-full mt-2 w-60 z-50 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl overflow-hidden">
                                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-zinc-800">
                                    {user?.image
                                        ? <img src={thumb(user.image, 80, 80)} alt="" className="size-9 rounded-full object-cover" />
                                        : <span className="size-9 rounded-full bg-blue-600 text-white text-sm font-semibold flex items-center justify-center shrink-0">{initials(user?.name, user?.email)}</span>
                                    }
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{displayName}</p>
                                        {user?.email && <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">{user.email}</p>}
                                        {user?.role && <p className="text-[11px] mt-0.5 inline-block px-1.5 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400">{user.role}</p>}
                                    </div>
                                </div>

                                <div className="py-1">
                                    {menuLinks.map((item) => (
                                        <button
                                            key={item.label}
                                            role="menuitem"
                                            onClick={() => go(item.to)}
                                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800 transition"
                                        >
                                            <item.icon size={16} className="text-gray-400 dark:text-zinc-500" />
                                            {item.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="py-1 border-t border-gray-100 dark:border-zinc-800">
                                    <button
                                        role="menuitem"
                                        onClick={() => { setMenuOpen(false); logout(); navigate('/'); }}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                                    >
                                        <LogOut size={16} />
                                        Log out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Navbar
