import { useEffect, useState } from "react";
import { UserIcon, Shield, LogOut, Trash, Bell, Phone, Pencil, Check, X } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { nowIST, TIMEZONE } from "../configs/timezone";
import { fetchWorkspaces } from "../features/workspaceSlice";
import { useSearchParams } from "react-router-dom";
import api from "../configs/api";
import toast from "react-hot-toast";

export default function Settings() {
    const { user, logout, getToken } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState("profile");
    const { workspaces, currentWorkspace } = useSelector((state) => state.workspace);
    const [sourceWorkspaceId, setSourceWorkspaceId] = useState("");
    const [isImporting, setIsImporting] = useState(false);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [isSavingNotification, setIsSavingNotification] = useState(false);
    const [editingId, setEditingId] = useState(null);
    // Notices state
    const [notices, setNotices] = useState([]);
    const [noticeForm, setNoticeForm] = useState({ title: "", content: "", type: "INFO", published: false, priority: 0 });
    const [editingNoticeId, setEditingNoticeId] = useState(null);
    const [isSavingNotice, setIsSavingNotice] = useState(false);
    const [clientInfo, setClientInfo] = useState(null);
    const [clientInfoLoading, setClientInfoLoading] = useState(false);
    const [clientInfoError, setClientInfoError] = useState("");
    const [mobile, setMobile] = useState("");
    const [editingMobile, setEditingMobile] = useState(false);
    const [mobileInput, setMobileInput] = useState("");
    const [savingMobile, setSavingMobile] = useState(false);
    const [currentTime, setCurrentTime] = useState(nowIST());
    const [notificationForm, setNotificationForm] = useState({
        title: "",
        subtitle: "",
        buttonName: "",
        buttonUrl: "",
        openInNewTab: false,
    });

    const shortText = (value, max = 5) => {
        const text = String(value || "");
        return text.length > max ? `${text.slice(0, max)}...` : text;
    };
    const getBrowserName = () => {
        const ua = navigator.userAgent;
        if (ua.includes("Edg/")) return "Microsoft Edge";
        if (ua.includes("OPR/") || ua.includes("Opera")) return "Opera";
        if (ua.includes("Chrome")) return "Chrome";
        if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
        if (ua.includes("Firefox")) return "Firefox";
        return "Unknown";
    };

    const getOSName = () => {
        const ua = navigator.userAgent;
        if (ua.includes("Windows")) return "Windows";
        if (ua.includes("Mac OS X")) return "macOS";
        if (ua.includes("Android")) return "Android";
        if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
        if (ua.includes("Linux")) return "Linux";
        return "Unknown";
    };
    const displayName = user?.name || "User";
    const displayEmail = user?.email || "";

    const handleLogout = () => {
        if (window.confirm("Are you sure you want to log out?")) {
            logout();
        }
    };

    const handleImport = async () => {
        if (!currentWorkspace?.id || !sourceWorkspaceId) return;
        setIsImporting(true);
        try {
            await api.post(`/api/workspaces/${currentWorkspace.id}/import-projects`, { sourceWorkspaceId });
            toast.success("Projects imported successfully");
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        } finally {
            setIsImporting(false);
        }
    };

    useEffect(() => {
        const tab = searchParams.get("tab");
        if (tab) setActiveTab(tab);
    }, [searchParams]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(nowIST()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const shouldFetch = user?.role === "MEMBER" && activeTab === "profile";
        if (!shouldFetch || clientInfo || clientInfoLoading) return;
        const fetchInfo = async () => {
            try {
                setClientInfoLoading(true);
                setClientInfoError("");
                const res = await fetch("https://ipapi.co/json/");
                if (!res.ok) throw new Error("Failed to fetch IP info");
                const data = await res.json();
                setClientInfo({
                    ip: data.ip,
                    isp: data.org || data.asn || "Unknown",
                    location: [data.city, data.region, data.country_name].filter(Boolean).join(", ") || "Unknown",
                });
            } catch (error) {
                setClientInfoError("Unable to fetch IP details.");
            } finally {
                setClientInfoLoading(false);
            }
        };
        fetchInfo();
    }, [activeTab, user, clientInfo, clientInfoLoading]);

    // Load mobile from /api/users/me on mount
    useEffect(() => {
        if (!user) return;
        getToken().then(async (token) => {
            try {
                const res = await api.get("/api/users/me", { headers: { Authorization: `Bearer ${token}` } });
                setMobile(res.data?.user?.mobile || "");
            } catch { /* ignore */ }
        });
    }, [user]);

    const saveMobile = async () => {
        if (!mobileInput.trim()) { toast.error("Enter a mobile number"); return; }
        setSavingMobile(true);
        try {
            const token = await getToken();
            await api.put("/api/users/me/mobile", { mobile: mobileInput }, { headers: { Authorization: `Bearer ${token}` } });
            setMobile(mobileInput.replace(/\D/g, ""));
            setEditingMobile(false);
            toast.success("Mobile number updated");
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to update mobile");
        } finally {
            setSavingMobile(false);
        }
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setSearchParams(tab === "profile" ? {} : { tab });
    };

    const fetchNotifications = async () => {
        if (!currentWorkspace?.id) return;
        const { data } = await api.get(`/api/notifications?workspaceId=${currentWorkspace.id}`, {
            headers: { Authorization: `Bearer ${await getToken()}` },
        });
        setNotifications(data.notifications || []);
    };

    useEffect(() => {
        if (activeTab === "notifications") {
            fetchNotifications();
        }
    }, [activeTab, currentWorkspace]);

    const resetNotificationForm = () => {
        setEditingId(null);
        setNotificationForm({ title: "", subtitle: "", buttonName: "", buttonUrl: "", openInNewTab: false });
    };

    const handleSaveNotification = async () => {
        if (!currentWorkspace?.id || !notificationForm.title.trim()) return;
        try {
            setIsSavingNotification(true);
            if (editingId) {
                await api.put(
                    `/api/notifications/${editingId}`,
                    { ...notificationForm },
                    { headers: { Authorization: `Bearer ${await getToken()}` } }
                );
                toast.success("Notification updated");
            } else {
                await api.post(
                    "/api/notifications",
                    { workspaceId: currentWorkspace.id, ...notificationForm },
                    { headers: { Authorization: `Bearer ${await getToken()}` } }
                );
                toast.success("Notification created");
            }
            resetNotificationForm();
            fetchNotifications();
        } catch (error) {
            toast.error(error?.response?.data?.message || error.message);
        } finally {
            setIsSavingNotification(false);
        }
    };

    const handleEditNotification = (notification) => {
        setEditingId(notification.id);
        setNotificationForm({
            title: notification.title || "",
            subtitle: notification.subtitle || "",
            buttonName: notification.buttonName || "",
            buttonUrl: notification.buttonUrl || "",
            openInNewTab: Boolean(notification.openInNewTab),
        });
    };

    const handleDeleteNotification = async (id) => {
        const confirm = window.confirm("Delete this notification?");
        if (!confirm) return;
        await api.delete(`/api/notifications/${id}`, { headers: { Authorization: `Bearer ${await getToken()}` } });
        fetchNotifications();
    };

    const handleDeleteWorkspace = async () => {
        if (!currentWorkspace?.id) return;
        const confirm = window.confirm("Delete this workspace and all its projects, tasks, groups, and members?");
        if (!confirm) return;
        try {
            toast.loading("Deleting workspace...");
            await api.delete(`/api/workspaces/${currentWorkspace.id}`, { headers: { Authorization: `Bearer ${await getToken()}` } });
            toast.dismissAll();
            toast.success("Workspace deleted");
            dispatch(fetchWorkspaces({ getToken }));
            navigate("/");
        } catch (error) {
            toast.dismissAll();
            toast.error(error?.response?.data?.message || error.message);
        }
    };

    const fetchNotices = async () => {
        if (!currentWorkspace?.id) return;
        const { data } = await api.get(`/api/notices?workspaceId=${currentWorkspace.id}`, {
            headers: { Authorization: `Bearer ${await getToken()}` },
        });
        setNotices(data.notices || []);
    };

    useEffect(() => {
        if (activeTab === "notices") fetchNotices();
    }, [activeTab, currentWorkspace]);

    const resetNoticeForm = () => {
        setEditingNoticeId(null);
        setNoticeForm({ title: "", content: "", type: "INFO", published: false, priority: 0 });
    };

    const handleSaveNotice = async () => {
        if (!currentWorkspace?.id || !noticeForm.title.trim() || !noticeForm.content.trim()) return;
        try {
            setIsSavingNotice(true);
            if (editingNoticeId) {
                await api.patch(`/api/notices/${editingNoticeId}`, noticeForm, {
                    headers: { Authorization: `Bearer ${await getToken()}` },
                });
                toast.success("Notice updated");
            } else {
                await api.post("/api/notices", { workspaceId: currentWorkspace.id, ...noticeForm }, {
                    headers: { Authorization: `Bearer ${await getToken()}` },
                });
                toast.success("Notice created");
            }
            resetNoticeForm();
            fetchNotices();
        } catch (error) {
            toast.error(error?.response?.data?.message || error.message);
        } finally {
            setIsSavingNotice(false);
        }
    };

    const handleTogglePublish = async (notice) => {
        await api.patch(`/api/notices/${notice.id}`, { published: !notice.published }, {
            headers: { Authorization: `Bearer ${await getToken()}` },
        });
        fetchNotices();
    };

    const handleDeleteNotice = async (id) => {
        if (!window.confirm("Delete this notice?")) return;
        await api.delete(`/api/notices/${id}`, { headers: { Authorization: `Bearer ${await getToken()}` } });
        fetchNotices();
    };

    return user && (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
                <p className="text-gray-500 dark:text-zinc-400">
                    Manage your account settings and preferences
                </p>
            </div>

            {/* Tabs */}
            <div className="space-y-6">
                <div className="inline-flex gap-2 bg-gray-100 dark:bg-zinc-950 dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-gray-300 dark:border-zinc-800 rounded-lg p-1">
                    {[
                        { key: "profile", icon: <UserIcon className="w-4 h-4" />, label: "Profile" },
                        { key: "account", icon: <Shield className="w-4 h-4" />, label: "Account" },
                        { key: "notifications", icon: <Shield className="w-4 h-4" />, label: "Notifications" },
                        ...(user?.role === "ADMIN" ? [{ key: "notices", icon: <Bell className="w-4 h-4" />, label: "Notices" }] : []),
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => handleTabChange(tab.key)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${activeTab === tab.key
                                    ? "bg-gray-300 dark:bg-zinc-800 text-gray-900 dark:text-white"
                                    : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Profile Tab */}
                {activeTab === "profile" && (
                    <div className="space-y-6">
                        <div className="bg-gray-100 dark:bg-zinc-950 dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-gray-300 dark:border-zinc-800 rounded-lg p-4 sm:p-6 space-y-6">
                            <h2 className="text-gray-900 dark:text-white text-lg font-semibold mb-4">Profile Information</h2>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                                <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-zinc-800 flex items-center justify-center text-xl font-semibold text-gray-600 dark:text-zinc-300">
                                    {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                        <span className="sm:hidden">{shortText(displayName)}</span>
                                        <span className="hidden sm:inline">{displayName}</span>
                                    </h3>
                                    <p className="text-gray-500 dark:text-zinc-400">
                                        <span className="sm:hidden">{shortText(displayEmail)}</span>
                                        <span className="hidden sm:inline">{displayEmail}</span>
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-zinc-500 capitalize">{user?.role || "MEMBER"} Account</p>
                                </div>
                            </div>

                            {/* Mobile Number */}
                            <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                        <Phone className="size-4 text-zinc-400" />
                                        WhatsApp / Mobile Number
                                    </div>
                                    {!editingMobile && (
                                        <button
                                            onClick={() => { setMobileInput(mobile || ""); setEditingMobile(true); }}
                                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                                        >
                                            <Pencil className="size-3" />
                                            {mobile ? "Edit" : "Add"}
                                        </button>
                                    )}
                                </div>

                                {editingMobile ? (
                                    <div className="flex items-center gap-2 mt-2">
                                        <input
                                            type="tel"
                                            placeholder="e.g. 919876543210 (with country code)"
                                            value={mobileInput}
                                            onChange={(e) => setMobileInput(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && saveMobile()}
                                            autoFocus
                                            className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-500"
                                        />
                                        <button onClick={saveMobile} disabled={savingMobile}
                                            className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition">
                                            <Check className="size-4" />
                                        </button>
                                        <button onClick={() => setEditingMobile(false)}
                                            className="p-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
                                            <X className="size-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <p className="text-sm mt-1 text-zinc-600 dark:text-zinc-400">
                                        {mobile
                                            ? <span className="font-mono">+{mobile}</span>
                                            : <span className="text-zinc-400 italic">Not set — add your WhatsApp number so admin can reach you</span>
                                        }
                                    </p>
                                )}
                            </div>
                        </div>

                        {user?.role === "MEMBER" && (
                            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 sm:p-6">
                                <h3 className="text-gray-900 dark:text-white text-sm font-semibold mb-4">Device & Session Info</h3>
                                {clientInfoLoading ? (
                                    <div className="text-sm text-zinc-500">Loading details...</div>
                                ) : clientInfoError ? (
                                    <div className="text-sm text-red-500">{clientInfoError}</div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <div className="text-zinc-500">Your IP Address</div>
                                            <div className="text-zinc-900 dark:text-zinc-200">{clientInfo?.ip || "Unknown"}</div>
                                        </div>
                                        <div>
                                            <div className="text-zinc-500">Internet Service Provider - ISP</div>
                                            <div className="text-zinc-900 dark:text-zinc-200">{clientInfo?.isp || "Unknown"}</div>
                                        </div>
                                        <div>
                                            <div className="text-zinc-500">Location</div>
                                            <div className="text-zinc-900 dark:text-zinc-200">{clientInfo?.location || "Unknown"}</div>
                                        </div>
                                        <div>
                                            <div className="text-zinc-500">Date Time</div>
                                            <div className="text-zinc-900 dark:text-zinc-200">{currentTime.toLocaleString("en-IN", { timeZone: TIMEZONE })} IST</div>
                                        </div>
                                        <div>
                                            <div className="text-zinc-500">Browser</div>
                                            <div className="text-zinc-900 dark:text-zinc-200">{getBrowserName()}</div>
                                        </div>
                                        <div>
                                            <div className="text-zinc-500">Operating System</div>
                                            <div className="text-zinc-900 dark:text-zinc-200">{getOSName()}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Account Tab */}
                {activeTab === "account" && (
                    <div className="bg-gray-100 dark:bg-zinc-950 dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-gray-300 dark:border-zinc-800 rounded-lg p-4 sm:p-6 space-y-6">
                        <h2 className="text-gray-900 dark:text-white text-lg font-semibold mb-4">Account Settings</h2>
                        <div className="p-4 bg-white dark:bg-zinc-900 rounded-lg">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Account Type</h4>
                            <p className="text-gray-500 dark:text-zinc-400 text-sm mb-3">
                                Signed in as {" "}
                                <span className="sm:hidden">{shortText(displayEmail)}</span>
                                <span className="hidden sm:inline">{displayEmail}</span>
                            </p>
                        </div>

                        {user?.role === "ADMIN" && (
                            <div className="p-4 bg-white dark:bg-zinc-900 rounded-lg space-y-3">
                                <h4 className="font-semibold text-gray-900 dark:text-white">Import Projects</h4>
                                <p className="text-sm text-gray-500 dark:text-zinc-400">
                                    Import projects and tasks from another workspace into the current workspace.
                                </p>
                                <select
                                    value={sourceWorkspaceId}
                                    onChange={(e) => setSourceWorkspaceId(e.target.value)}
                                    className="w-full rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-200 py-2 px-3 text-sm"
                                >
                                    <option value="">Select source workspace</option>
                                    {workspaces
                                        .filter((w) => w.id !== currentWorkspace?.id)
                                        .map((w) => (
                                            <option key={w.id} value={w.id}>{w.name}</option>
                                        ))}
                                </select>
                                <button
                                    onClick={handleImport}
                                    disabled={!sourceWorkspaceId || isImporting}
                                    className="px-4 py-2 rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm disabled:opacity-50"
                                >
                                    {isImporting ? "Importing..." : "Import"}
                                </button>
                            </div>
                        )}

                        <div className="p-4 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg space-y-4">
                            <h4 className="font-semibold text-red-600 dark:text-red-400 mb-2">Danger Zone</h4>
                            <p className="text-gray-500 dark:text-zinc-400 text-sm mb-4">
                                Once you disable your account, you'll need to create a new one.
                            </p>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white"
                            >
                                <LogOut className="w-4 h-4" />
                                Disable Account
                            </button>

                            {user?.role === "ADMIN" && (
                                <div className="pt-2 border-t border-red-300/60 dark:border-red-800/60">
                                    <p className="text-sm text-gray-500 dark:text-zinc-400 mb-3">
                                        Deleting a workspace removes all projects, tasks, groups, and members.
                                    </p>
                                    <button
                                        onClick={handleDeleteWorkspace}
                                        className="flex items-center gap-2 px-4 py-2 rounded-md bg-red-700 hover:bg-red-800 text-white"
                                    >
                                        <Trash className="w-4 h-4" />
                                        Delete Workspace
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === "notifications" && (
                    <div className="bg-gray-100 dark:bg-zinc-950 dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-gray-300 dark:border-zinc-800 rounded-lg p-4 sm:p-6 space-y-6">
                        <h2 className="text-gray-900 dark:text-white text-lg font-semibold mb-4">Notifications</h2>

                        {user?.role === "ADMIN" && (
                            <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-zinc-500">Title</label>
                                        <input
                                            value={notificationForm.title}
                                            onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                                            className="w-full rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 px-3 py-2 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-zinc-500">Subtitle</label>
                                        <input
                                            value={notificationForm.subtitle}
                                            onChange={(e) => setNotificationForm({ ...notificationForm, subtitle: e.target.value })}
                                            className="w-full rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 px-3 py-2 text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-zinc-500">Button Name</label>
                                        <input
                                            value={notificationForm.buttonName}
                                            onChange={(e) => setNotificationForm({ ...notificationForm, buttonName: e.target.value })}
                                            className="w-full rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 px-3 py-2 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-zinc-500">Button URL</label>
                                        <input
                                            value={notificationForm.buttonUrl}
                                            onChange={(e) => setNotificationForm({ ...notificationForm, buttonUrl: e.target.value })}
                                            className="w-full rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 px-3 py-2 text-sm"
                                        />
                                    </div>
                                </div>
                                <label className="flex items-center gap-2 text-xs">
                                    <input
                                        type="checkbox"
                                        checked={notificationForm.openInNewTab}
                                        onChange={(e) => setNotificationForm({ ...notificationForm, openInNewTab: e.target.checked })}
                                    />
                                    Open in a new tab
                                </label>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleSaveNotification}
                                        disabled={isSavingNotification}
                                        className="px-4 py-2 rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm"
                                    >
                                        {editingId ? "Update" : "Create"}
                                    </button>
                                    {editingId && (
                                        <button onClick={resetNotificationForm} className="px-4 py-2 rounded border text-sm">
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            {notifications.length === 0 ? (
                                <div className="text-sm text-zinc-500">No notifications</div>
                            ) : (
                                notifications.map((notification) => (
                                    <div key={notification.id} className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{notification.title}</div>
                                                {notification.subtitle && (
                                                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{notification.subtitle}</div>
                                                )}
                                                {notification.buttonName && notification.buttonUrl && (
                                                    <a
                                                        className="text-xs text-blue-600 dark:text-blue-400 mt-2 inline-flex"
                                                        href={notification.buttonUrl}
                                                        target={notification.openInNewTab ? "_blank" : "_self"}
                                                        rel={notification.openInNewTab ? "noreferrer" : undefined}
                                                    >
                                                        {notification.buttonName}
                                                    </a>
                                                )}
                                            </div>
                                            {user?.role === "ADMIN" && notification.id !== "attendance_reminder" && (
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => handleEditNotification(notification)} className="text-xs text-blue-600">Edit</button>
                                                    <button onClick={() => handleDeleteNotification(notification.id)} className="text-xs text-red-600">Delete</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Notices Tab — admin only */}
                {activeTab === "notices" && user?.role === "ADMIN" && (
                    <div className="space-y-6">
                        {/* Create / Edit form */}
                        <div className="bg-gray-100 dark:bg-zinc-950 dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-gray-300 dark:border-zinc-800 rounded-lg p-4 sm:p-6 space-y-4">
                            <h2 className="text-gray-900 dark:text-white text-lg font-semibold">
                                {editingNoticeId ? "Edit Notice" : "Create Notice"}
                            </h2>
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    placeholder="Title *"
                                    value={noticeForm.title}
                                    onChange={(e) => setNoticeForm((f) => ({ ...f, title: e.target.value }))}
                                    className="w-full px-3 py-2 text-sm rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <textarea
                                    placeholder="Content *"
                                    rows={3}
                                    value={noticeForm.content}
                                    onChange={(e) => setNoticeForm((f) => ({ ...f, content: e.target.value }))}
                                    className="w-full px-3 py-2 text-sm rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                />
                                <div className="flex flex-wrap gap-3">
                                    <select
                                        value={noticeForm.type}
                                        onChange={(e) => setNoticeForm((f) => ({ ...f, type: e.target.value }))}
                                        className="px-3 py-2 text-sm rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                                    >
                                        <option value="INFO">Info</option>
                                        <option value="WARNING">Warning</option>
                                        <option value="SUCCESS">Success</option>
                                        <option value="DANGER">Danger</option>
                                    </select>
                                    <input
                                        type="number"
                                        placeholder="Priority (higher = first)"
                                        value={noticeForm.priority}
                                        onChange={(e) => setNoticeForm((f) => ({ ...f, priority: Number(e.target.value) }))}
                                        className="w-44 px-3 py-2 text-sm rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                                    />
                                    <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={noticeForm.published}
                                            onChange={(e) => setNoticeForm((f) => ({ ...f, published: e.target.checked }))}
                                            className="rounded"
                                        />
                                        Publish immediately
                                    </label>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSaveNotice}
                                        disabled={isSavingNotice || !noticeForm.title.trim() || !noticeForm.content.trim()}
                                        className="px-4 py-2 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition"
                                    >
                                        {isSavingNotice ? "Saving…" : editingNoticeId ? "Update Notice" : "Create Notice"}
                                    </button>
                                    {editingNoticeId && (
                                        <button
                                            onClick={resetNoticeForm}
                                            className="px-4 py-2 text-sm rounded border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Existing notices list */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">All Notices</h3>
                            {notices.length === 0 ? (
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">No notices yet.</p>
                            ) : (
                                notices.map((notice) => (
                                    <div key={notice.id} className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{notice.title}</span>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                                        notice.type === "INFO" ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" :
                                                        notice.type === "WARNING" ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300" :
                                                        notice.type === "SUCCESS" ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" :
                                                        "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                                                    }`}>{notice.type}</span>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${notice.published ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"}`}>
                                                        {notice.published ? "Published" : "Draft"}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">{notice.content}</p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    onClick={() => handleTogglePublish(notice)}
                                                    className={`text-xs px-2 py-1 rounded border transition ${notice.published ? "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800" : "border-green-400 dark:border-green-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30"}`}
                                                >
                                                    {notice.published ? "Unpublish" : "Publish"}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEditingNoticeId(notice.id);
                                                        setNoticeForm({ title: notice.title, content: notice.content, type: notice.type, published: notice.published, priority: notice.priority });
                                                    }}
                                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteNotice(notice.id)}
                                                    className="text-xs text-red-600 dark:text-red-400 hover:underline"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
