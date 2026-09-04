import {
    LayoutDashboardIcon, FolderOpenIcon, UsersIcon, CalendarIcon, CalendarRange,
    ClipboardList, CalendarDays, FolderUp, Mail, ImageIcon, MessageSquare,
    FileText, ScrollText, SettingsIcon, Database,
} from 'lucide-react';

// Single source of truth for the app's primary navigation. Consumed by both
// the desktop Sidebar and the mobile BottomNav so the two never drift apart.
export function getNavItems(role) {
    const isAdmin = role === 'ADMIN';
    return [
        { name: 'Dashboard', href: '/', icon: LayoutDashboardIcon },
        { name: 'Projects', href: '/projects', icon: FolderOpenIcon },
        ...(isAdmin ? [{ name: 'Team', href: '/team', icon: UsersIcon }] : []),
        { name: isAdmin ? 'Groups' : 'Team Group', href: '/groups', icon: UsersIcon },
        { name: 'Attendance', href: '/attendance', icon: CalendarIcon },
        { name: 'Calendar', href: '/calendar', icon: CalendarRange },
        { name: 'Standup', href: '/standup', icon: ClipboardList },
        { name: 'Leave / WFH', href: '/leave', icon: CalendarDays },
        { name: 'Submission', href: '/submission', icon: FolderUp },
        ...(isAdmin ? [{ name: 'Email Monitor', href: '/email-monitor', icon: Mail }] : []),
        ...(isAdmin ? [{ name: 'Image Manager', href: '/attendance-images', icon: ImageIcon }] : []),
        ...(isAdmin ? [{ name: 'Dataset Storage', href: '/dataset-storage', icon: Database }] : []),
        ...(isAdmin ? [{ name: 'Candidate Teams', href: '/candidate-teams', icon: MessageSquare }] : []),
        { name: 'Terms & Conditions', href: '/terms', icon: FileText },
        { name: 'NDA Agreement', href: '/terms-nda', icon: ScrollText },
        { name: 'Settings', href: '/settings', icon: SettingsIcon },
    ];
}

// The routes pinned to the mobile bottom bar (plus a "More" button).
// Everything else in getNavItems() spills into the "More" bottom sheet.
export const BOTTOM_NAV_HREFS = ['/', '/projects', '/attendance', '/groups', '/settings'];
