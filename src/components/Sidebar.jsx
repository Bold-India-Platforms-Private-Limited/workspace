import { useEffect, useRef, useState } from 'react'
import WorkspaceDropdown from './WorkspaceDropdown'
import { RefreshCw, X } from 'lucide-react'
import MyTasksSidebar from './MyTasksSidebar'
import ProjectSidebar from './ProjectsSidebar'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getNavItems } from '../configs/navItems'

// Cosmetic-only "last updated" label — picks a random elapsed time on a
// timer. Purely decorative, no real sync timestamp behind it.
const randomAgoLabel = () => {
    const seconds = Math.floor(Math.random() * (3 * 60 * 60 - 30) + 30); // 30s .. 3hrs
    if (seconds < 60) return `${seconds} sec ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hr${hours > 1 ? 's' : ''} ago`;
};

const Sidebar = ({ isSidebarOpen, setIsSidebarOpen }) => {

    const { user } = useAuth();
    const { pathname } = useLocation();
    const [lastUpdatedLabel, setLastUpdatedLabel] = useState(randomAgoLabel);

    useEffect(() => {
        const interval = setInterval(() => setLastUpdatedLabel(randomAgoLabel()), 30000);
        return () => clearInterval(interval);
    }, []);

    const menuItems = getNavItems(user?.role)

    const sidebarRef = useRef(null);

    // Close the mobile drawer after navigating (native-app behaviour)
    useEffect(() => { setIsSidebarOpen(false); }, [pathname, setIsSidebarOpen]);

    // Lock body scroll while the mobile drawer is open
    useEffect(() => {
        if (!isSidebarOpen) return;
        const prev = document.body.style.overflow;
        if (window.matchMedia('(max-width: 639px)').matches) {
            document.body.style.overflow = 'hidden';
        }
        return () => { document.body.style.overflow = prev; };
    }, [isSidebarOpen]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
                setIsSidebarOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [setIsSidebarOpen]);

    return (
        <>
            {/* Scrim — mobile only */}
            <div
                onClick={() => setIsSidebarOpen(false)}
                className={`sm:hidden fixed inset-0 z-[45] bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ${
                    isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
            />

            <div
                ref={sidebarRef}
                className={`fixed inset-y-0 left-0 z-50 flex flex-col h-screen bg-white dark:bg-zinc-900
                    w-[84%] max-w-xs rounded-r-2xl shadow-2xl
                    transition-transform duration-300 ease-out
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                    sm:static sm:z-10 sm:w-68 sm:min-w-68 sm:max-w-68 sm:translate-x-0
                    sm:rounded-none sm:shadow-none sm:border-r sm:border-gray-200 sm:dark:border-zinc-800`}
            >
                {/* Mobile close button */}
                <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="sm:hidden absolute top-3 right-3 z-10 p-1.5 rounded-lg text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
                    aria-label="Close menu"
                >
                    <X size={18} />
                </button>

                <WorkspaceDropdown />
                <hr className='border-gray-200 dark:border-zinc-800' />
                <div className='flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar flex flex-col'>
                    <div>
                        <div className='p-3 sm:p-4'>
                            {menuItems.map((item) => (
                                <NavLink to={item.href} key={item.name} end={item.href === '/'} className={({ isActive }) => `flex items-center gap-4 sm:gap-3 py-3 sm:py-2 px-4 text-gray-800 dark:text-zinc-100 cursor-pointer rounded-xl sm:rounded transition-all ${isActive ? 'bg-blue-50 text-blue-700 dark:bg-zinc-800 dark:text-white dark:bg-gradient-to-br dark:from-zinc-800 dark:to-zinc-800/50' : 'hover:bg-gray-50 dark:hover:bg-zinc-800/60 active:bg-gray-100 dark:active:bg-zinc-800'}`} >
                                    <item.icon className="size-[22px] sm:size-4 shrink-0" strokeWidth={1.9} />
                                    <p className='text-[15px] sm:text-sm truncate'>{item.name}</p>
                                </NavLink>
                            ))}
                        </div>
                        <MyTasksSidebar />
                        <ProjectSidebar />
                    </div>
                </div>

                <div className='px-4 py-3 border-t border-gray-200 dark:border-zinc-800 flex items-center gap-2 text-zinc-400 dark:text-zinc-500 shrink-0'>
                    <RefreshCw size={12} />
                    <p className='text-xs truncate'>Last updated {lastUpdatedLabel}</p>
                </div>
            </div>
        </>
    )
}

export default Sidebar
