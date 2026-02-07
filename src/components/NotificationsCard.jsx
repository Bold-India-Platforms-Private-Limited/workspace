import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useAuth } from "../auth/AuthContext";
import api from "../configs/api";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

const NotificationsCard = () => {
    const { getToken } = useAuth();
    const currentWorkspace = useSelector((state) => state.workspace?.currentWorkspace || null);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchNotifications = async () => {
            if (!currentWorkspace) return;
            try {
                setLoading(true);
                const { data } = await api.get(`/api/notifications?workspaceId=${currentWorkspace.id}`, {
                    headers: { Authorization: `Bearer ${await getToken()}` },
                });
                setNotifications(data.notifications || []);
            } finally {
                setLoading(false);
            }
        };
        fetchNotifications();
    }, [currentWorkspace, getToken]);

    const visibleNotifications = notifications.slice(0, 2);

    return (
        <div className="bg-white dark:bg-zinc-950 dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-lg transition-all overflow-hidden">
            <div className="border-b border-zinc-200 dark:border-zinc-800 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
                    <Bell className="size-4" />
                    <h2 className="text-sm font-medium">Notifications</h2>
                </div>
                <button
                    onClick={() => navigate("/settings?tab=notifications")}
                    className="text-xs text-blue-600 dark:text-blue-400"
                >
                    View all
                </button>
            </div>
            <div className="p-4 space-y-3">
                {loading ? (
                    <div className="text-sm text-zinc-500">Loading...</div>
                ) : visibleNotifications.length === 0 ? (
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">No notifications</div>
                ) : (
                    visibleNotifications.map((n) => (
                        <div key={n.id} className="p-3 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                            <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{n.title}</div>
                            {n.subtitle && (
                                <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">{n.subtitle}</div>
                            )}
                            {n.buttonName && n.buttonUrl && (
                                <a
                                    href={n.buttonUrl}
                                    target={n.openInNewTab ? "_blank" : "_self"}
                                    rel={n.openInNewTab ? "noreferrer" : undefined}
                                    className="inline-flex mt-2 text-xs text-blue-600 dark:text-blue-400"
                                >
                                    {n.buttonName}
                                </a>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default NotificationsCard;
