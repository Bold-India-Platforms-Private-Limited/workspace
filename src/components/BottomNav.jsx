import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, FolderOpen, CalendarIcon, UsersIcon, UserRound, LayoutGrid, X, LogOut, MoonIcon, SunIcon } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '../auth/AuthContext';
import { toggleTheme } from '../features/themeSlice';
import { getNavItems, BOTTOM_NAV_HREFS } from '../configs/navItems';

// Native-app-style bottom navigation. Mobile only (`sm:hidden`); the desktop
// Sidebar is untouched and still available on mobile via the Navbar hamburger.
export default function BottomNav() {
    const { user, logout } = useAuth();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { theme } = useSelector((state) => state.theme);
    const [sheetOpen, setSheetOpen] = useState(false);

    const allItems = getNavItems(user?.role);
    const groupsItem = allItems.find((i) => i.href === '/groups');

    // Fixed order for the bar; "Team Group" / "Groups" label follows the role.
    const barItems = [
        { name: 'Home', href: '/', icon: Home },
        { name: 'Projects', href: '/projects', icon: FolderOpen },
        { name: 'Attendance', href: '/attendance', icon: CalendarIcon },
        { name: groupsItem?.name || 'Team Group', href: '/groups', icon: UsersIcon },
        { name: 'Profile', href: '/settings', icon: UserRound },
    ];

    const moreItems = allItems.filter((i) => !BOTTOM_NAV_HREFS.includes(i.href));

    // Lock body scroll while the sheet is open
    useEffect(() => {
        if (!sheetOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [sheetOpen]);

    // Close the sheet on route change
    useEffect(() => { setSheetOpen(false); }, [pathname]);

    const linkClass = ({ isActive }) =>
        `flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1.5 text-[10px] transition-colors ${
            isActive
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-zinc-400'
        }`;

    // "More" counts as active whenever the current route lives inside the sheet
    const moreActive = moreItems.some((i) => i.href === pathname);

    return (
        <>
            <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur border-t border-gray-200 dark:border-zinc-800 pb-[env(safe-area-inset-bottom)]">
                <div className="flex items-stretch px-0.5">
                    {barItems.map((item) => (
                        <NavLink key={item.href} to={item.href} end={item.href === '/'} className={linkClass}>
                            <item.icon size={19} strokeWidth={2} />
                            <span className="truncate max-w-full">{item.name}</span>
                        </NavLink>
                    ))}
                    <button
                        type="button"
                        onClick={() => setSheetOpen(true)}
                        className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1.5 text-[10px] transition-colors ${
                            moreActive || sheetOpen ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-zinc-400'
                        }`}
                    >
                        <LayoutGrid size={19} strokeWidth={2} />
                        <span>More</span>
                    </button>
                </div>
            </nav>

            {sheetOpen && (
                <div className="sm:hidden fixed inset-0 z-50" role="dialog" aria-modal="true">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setSheetOpen(false)}
                    />
                    <div className="animate-slide-up absolute bottom-0 inset-x-0 bg-white dark:bg-zinc-900 rounded-t-2xl border-t border-gray-200 dark:border-zinc-800 shadow-2xl max-h-[80vh] flex flex-col">
                        <div className="pt-2.5 pb-1 flex justify-center shrink-0">
                            <span className="h-1 w-10 rounded-full bg-gray-300 dark:bg-zinc-700" />
                        </div>
                        <div className="flex items-center justify-between px-4 pb-2 shrink-0">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">More</h3>
                            <button
                                onClick={() => setSheetOpen(false)}
                                className="p-1.5 -mr-1.5 rounded-lg text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="px-3 pb-3 min-h-0 overflow-y-auto overscroll-contain no-scrollbar grid grid-cols-2 gap-2">
                            {moreItems.map((item) => {
                                const active = item.href === pathname;
                                return (
                                    <NavLink
                                        key={item.href}
                                        to={item.href}
                                        end={item.href === '/'}
                                        className={`flex flex-col items-center justify-center gap-2 rounded-xl border px-3 py-4 text-center transition-colors ${
                                            active
                                                ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-500/60'
                                                : 'border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800/60'
                                        }`}
                                    >
                                        <item.icon size={22} strokeWidth={1.8} />
                                        <span className="text-xs font-medium leading-tight">{item.name}</span>
                                    </NavLink>
                                );
                            })}
                        </div>

                        <div className="grid grid-cols-2 gap-2 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 border-t border-gray-200 dark:border-zinc-800 shrink-0">
                            <button
                                onClick={() => dispatch(toggleTheme())}
                                className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-zinc-800 px-3 py-3 text-xs font-medium text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800/60"
                            >
                                {theme === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} className="text-yellow-400" />}
                                {theme === 'light' ? 'Dark mode' : 'Light mode'}
                            </button>
                            <button
                                onClick={() => { setSheetOpen(false); logout(); navigate('/'); }}
                                className="flex items-center justify-center gap-2 rounded-xl border border-red-200 dark:border-red-900/50 px-3 py-3 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                            >
                                <LogOut size={18} />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
