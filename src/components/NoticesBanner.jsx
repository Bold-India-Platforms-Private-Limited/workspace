import { useEffect, useState } from "react";
import { X, Info, AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react";
import { useSelector } from "react-redux";
import { useAuth } from "../auth/AuthContext";
import api from "../configs/api";

const TYPE_CONFIG = {
    INFO:    { icon: Info,          bg: "bg-blue-50 dark:bg-blue-950/50",    border: "border-blue-200 dark:border-blue-800",    text: "text-blue-800 dark:text-blue-200",    iconColor: "text-blue-500" },
    WARNING: { icon: AlertTriangle, bg: "bg-yellow-50 dark:bg-yellow-950/50", border: "border-yellow-200 dark:border-yellow-800", text: "text-yellow-800 dark:text-yellow-200", iconColor: "text-yellow-500" },
    SUCCESS: { icon: CheckCircle2,  bg: "bg-green-50 dark:bg-green-950/50",   border: "border-green-200 dark:border-green-800",   text: "text-green-800 dark:text-green-200",  iconColor: "text-green-500" },
    DANGER:  { icon: AlertCircle,   bg: "bg-red-50 dark:bg-red-950/50",       border: "border-red-200 dark:border-red-800",       text: "text-red-800 dark:text-red-200",      iconColor: "text-red-500" },
};

export default function NoticesBanner() {
    const { getToken } = useAuth();
    const currentWorkspace = useSelector((s) => s.workspace?.currentWorkspace);
    const [notices, setNotices] = useState([]);
    const [dismissed, setDismissed] = useState(() => {
        try { return new Set(JSON.parse(sessionStorage.getItem("dismissedNotices") || "[]")); }
        catch { return new Set(); }
    });

    useEffect(() => {
        if (!currentWorkspace?.id) { setNotices([]); return; }
        let cancelled = false;
        (async () => {
            try {
                const { data } = await api.get(`/api/notices?workspaceId=${currentWorkspace.id}`, {
                    headers: { Authorization: `Bearer ${await getToken()}` },
                });
                if (!cancelled) setNotices(data.notices || []);
            } catch {
                // Silent — don't break the app if notices fail
            }
        })();
        return () => { cancelled = true; };
    }, [currentWorkspace?.id]);

    const dismiss = (id) => {
        setDismissed((prev) => {
            const next = new Set(prev);
            next.add(id);
            try { sessionStorage.setItem("dismissedNotices", JSON.stringify([...next])); } catch {}
            return next;
        });
    };

    const visible = notices.filter((n) => !dismissed.has(n.id));
    if (visible.length === 0) return null;

    return (
        <div className="space-y-2 px-4 pt-3">
            {visible.map((notice) => {
                const cfg = TYPE_CONFIG[notice.type] || TYPE_CONFIG.INFO;
                const Icon = cfg.icon;
                return (
                    <div
                        key={notice.id}
                        className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${cfg.bg} ${cfg.border} ${cfg.text}`}
                    >
                        <Icon className={`size-4 mt-0.5 shrink-0 ${cfg.iconColor}`} />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold leading-tight">{notice.title}</p>
                            {notice.content && (
                                <p className="text-xs mt-0.5 opacity-80 whitespace-pre-wrap">{notice.content}</p>
                            )}
                        </div>
                        <button
                            onClick={() => dismiss(notice.id)}
                            className="shrink-0 opacity-50 hover:opacity-100 transition"
                            aria-label="Dismiss"
                        >
                            <X className="size-3.5" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
