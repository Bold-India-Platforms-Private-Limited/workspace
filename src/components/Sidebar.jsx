import { useEffect, useRef, useState } from 'react'
import WorkspaceDropdown from './WorkspaceDropdown'
import { FolderOpenIcon, LayoutDashboardIcon, MoonIcon, SettingsIcon, SunIcon, UsersIcon, CalendarIcon, Mail, ClipboardList, CalendarDays, CalendarRange, FolderUp, ImageIcon, ScrollText, FileText, RefreshCw, MessageSquare } from 'lucide-react'
import MyTasksSidebar from './MyTasksSidebar'
import ProjectSidebar from './ProjectsSidebar'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

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
    const [lastUpdatedLabel, setLastUpdatedLabel] = useState(randomAgoLabel);

    useEffect(() => {
        const interval = setInterval(() => setLastUpdatedLabel(randomAgoLabel()), 30000);
        return () => clearInterval(interval);
    }, []);

    const menuItems = [
        { name: 'Dashboard', href: '/', icon: LayoutDashboardIcon },
        { name: 'Projects', href: '/projects', icon: FolderOpenIcon },
        ...(user?.role === 'ADMIN' ? [{ name: 'Team', href: '/team', icon: UsersIcon }] : []),
        { name: user?.role === 'ADMIN' ? 'Groups' : 'Team Group', href: '/groups', icon: UsersIcon },
        { name: 'Attendance', href: '/attendance', icon: CalendarIcon },
        { name: 'Calendar', href: '/calendar', icon: CalendarRange },
        { name: 'Standup', href: '/standup', icon: ClipboardList },
        { name: 'Leave / WFH', href: '/leave', icon: CalendarDays },
        { name: 'Submission', href: '/submission', icon: FolderUp },
        ...(user?.role === 'ADMIN' ? [{ name: 'Email Monitor', href: '/email-monitor', icon: Mail }] : []),
        ...(user?.role === 'ADMIN' ? [{ name: 'Image Manager', href: '/attendance-images', icon: ImageIcon }] : []),
        ...(user?.role === 'ADMIN' ? [{ name: 'Candidate Teams', href: '/candidate-teams', icon: MessageSquare }] : []),
        { name: 'Terms & Conditions', href: '/terms', icon: FileText },
        { name: 'NDA Agreement', href: '/terms-nda', icon: ScrollText },
    ]

    const sidebarRef = useRef(null);

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
        <div ref={sidebarRef} className={`z-10 bg-white dark:bg-zinc-900 w-68 min-w-68 max-w-68 flex flex-col h-screen border-r border-gray-200 dark:border-zinc-800 max-sm:absolute transition-all ${isSidebarOpen ? 'left-0' : '-left-full'} `} >
            <WorkspaceDropdown />
            <hr className='border-gray-200 dark:border-zinc-800' />
            <div className='flex-1 overflow-y-scroll no-scrollbar flex flex-col'>
                <div>
                    <div className='p-4'>
                        {menuItems.map((item) => (
                            <NavLink to={item.href} key={item.name} className={({ isActive }) => `flex items-center gap-3 py-2 px-4 text-gray-800 dark:text-zinc-100 cursor-pointer rounded transition-all  ${isActive ? 'bg-gray-100 dark:bg-zinc-900 dark:bg-gradient-to-br dark:from-zinc-800 dark:to-zinc-800/50  dark:ring-zinc-800' : 'hover:bg-gray-50 dark:hover:bg-zinc-800/60'}`} >
                                <item.icon size={16} />
                                <p className='text-sm truncate'>{item.name}</p>
                            </NavLink>
                        ))}
                        <NavLink to="/settings" className='flex w-full items-center gap-3 py-2 px-4 text-gray-800 dark:text-zinc-100 cursor-pointer rounded hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition-all'>
                            <SettingsIcon size={16} />
                            <p className='text-sm truncate'>Settings</p>
                        </NavLink>
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
    )
}

export default Sidebar
