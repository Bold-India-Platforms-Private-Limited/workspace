import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useSelector } from "react-redux";
import api from "../configs/api";
import { CalendarIcon, Camera, Image as ImageIcon, Clock, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
    addMonths,
    subMonths,
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameDay,
    setMonth,
    setYear,
    getYear,
} from "date-fns";
import { nowIST, toIST, todayKeyIST, dateKeyIST, TIMEZONE } from "../configs/timezone";

const Attendance = () => {
    const { user, getToken } = useAuth();
    const currentWorkspace = useSelector((state) => state.workspace?.currentWorkspace || null);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [captured, setCaptured] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [attendances, setAttendances] = useState([]);
    const [selectedDate, setSelectedDate] = useState(todayKeyIST());
    const [adminRecords, setAdminRecords] = useState([]);
    const [cameraError, setCameraError] = useState("");
    const [adminQuery, setAdminQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("marked");
    const [adminPage, setAdminPage] = useState(1);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [deleteStartDate, setDeleteStartDate] = useState(todayKeyIST());
    const [deleteEndDate, setDeleteEndDate] = useState(todayKeyIST());
    const [calendarMonth, setCalendarMonth] = useState(nowIST());
    const [currentTime, setCurrentTime] = useState(nowIST());
    const [selectedCalendarDay, setSelectedCalendarDay] = useState(todayKeyIST());

    useEffect(() => {
        const tick = setInterval(() => setCurrentTime(nowIST()), 1000);
        return () => clearInterval(tick);
    }, []);

    const ADMIN_PAGE_SIZE = 100;

    const monthDays = useMemo(() => {
        const start = startOfMonth(calendarMonth);
        const end = endOfMonth(calendarMonth);
        return eachDayOfInterval({ start, end });
    }, [calendarMonth]);

    const currentYear = getYear(nowIST());
    const yearOptions = useMemo(() => {
        const years = [];
        for (let y = currentYear - 5; y <= currentYear + 1; y += 1) {
            years.push(y);
        }
        return years;
    }, [currentYear]);

    const attendanceMap = useMemo(() => {
        const map = new Map();
        attendances.forEach((a) => {
            // Use createdAt (actual timestamp) converted to IST for correct day mapping
            // Falls back to date field if createdAt is missing
            const key = a.createdAt ? dateKeyIST(a.createdAt) : dateKeyIST(a.date);
            map.set(key, a);
        });
        return map;
    }, [attendances]);

    const todayKey = todayKeyIST();
    const todayAttendance = attendanceMap.get(todayKey);

    const startCamera = async () => {
        try {
            setCameraError("");
            const media = await navigator.mediaDevices.getUserMedia({ video: true });
            setStream(media);
            setPermissionGranted(true);
            if (videoRef.current) {
                videoRef.current.srcObject = media;
            }
        } catch (error) {
            console.log(error);
            setPermissionGranted(false);
            if (error?.name === "NotFoundError") {
                setCameraError("No camera device found.");
            } else if (error?.name === "NotAllowedError") {
                setCameraError("Camera permission denied.");
            } else {
                setCameraError("Unable to access camera.");
            }
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach((t) => t.stop());
        }
        setStream(null);
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const targetWidth = 480;
        const scale = targetWidth / video.videoWidth;
        canvas.width = targetWidth;
        canvas.height = video.videoHeight * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.5);
        setCaptured(dataUrl);
        stopCamera();
    };

    const submitAttendance = async () => {
        if (!captured || !currentWorkspace) return;
        try {
            setUploading(true);
            await api.post(
                "/api/attendance",
                { workspaceId: currentWorkspace.id, imageBase64: captured },
                { headers: { Authorization: `Bearer ${await getToken()}` } }
            );
            await fetchMyAttendance();
            setCaptured(null);
        } finally {
            setUploading(false);
        }
    };

    const fetchMyAttendance = async () => {
        if (!currentWorkspace) return;
        const { data } = await api.get(`/api/attendance/me?workspaceId=${currentWorkspace.id}`, {
            headers: { Authorization: `Bearer ${await getToken()}` },
        });
        setAttendances(data.attendances || []);
    };

    const fetchAdminRecords = async () => {
        if (!currentWorkspace) return;
        const { data } = await api.get(
            `/api/attendance/date?workspaceId=${currentWorkspace.id}&date=${selectedDate}`,
            { headers: { Authorization: `Bearer ${await getToken()}` } }
        );
        setAdminRecords(data.records || []);
        setAdminPage(1);
    };

    const handleDeleteAttendanceDates = async () => {
        if (!currentWorkspace || !deleteStartDate || !deleteEndDate) return;
        const confirm = window.confirm("Delete attendance for the selected date range? This will remove photos too.");
        if (!confirm) return;
        await api.delete("/api/attendance/batch", {
            data: { workspaceId: currentWorkspace.id, startDate: deleteStartDate, endDate: deleteEndDate },
            headers: { Authorization: `Bearer ${await getToken()}` },
        });
        fetchAdminRecords();
    };

    useEffect(() => {
        if (user?.role === "ADMIN") {
            fetchAdminRecords();
        } else {
            fetchMyAttendance();
        }
        return () => stopCamera();
    }, [currentWorkspace, user]);

    useEffect(() => {
        if (user?.role === "ADMIN") fetchAdminRecords();
    }, [selectedDate]);

    const handleAdminDateClick = (day) => {
        const ist = nowIST();
        const today = new Date(ist.getFullYear(), ist.getMonth(), ist.getDate());
        const target = new Date(day.getFullYear(), day.getMonth(), day.getDate());
        if (target > today) return;

        const start = deleteStartDate ? new Date(deleteStartDate) : null;
        const end = deleteEndDate ? new Date(deleteEndDate) : null;

        if (!start || (start && end)) {
            const key = format(target, "yyyy-MM-dd");
            setDeleteStartDate(key);
            setDeleteEndDate("");
            setSelectedDate(key);
            return;
        }

        if (target < start) {
            const key = format(target, "yyyy-MM-dd");
            setDeleteStartDate(key);
            setSelectedDate(key);
            return;
        }

        const endKey = format(target, "yyyy-MM-dd");
        setDeleteEndDate(endKey);
    };

    const filteredAdminRecords = useMemo(() => {
        const term = adminQuery.trim().toLowerCase();
        const filtered = (adminRecords || []).filter((record) => {
            const name = record.user?.name?.toLowerCase() || "";
            const email = record.user?.email?.toLowerCase() || "";
            const matchesSearch = !term || name.includes(term) || email.includes(term);
            const isMarked = Boolean(record.attendance);
            const matchesStatus = statusFilter === "all" || (statusFilter === "marked" && isMarked) || (statusFilter === "missing" && !isMarked);
            return matchesSearch && matchesStatus;
        });
        
        return filtered.sort((a, b) => {
            const dateA = a.attendance?.createdAt ? toIST(a.attendance.createdAt).getTime() : 0;
            const dateB = b.attendance?.createdAt ? toIST(b.attendance.createdAt).getTime() : 0;
            return dateB - dateA; // Latest first
        });
    }, [adminRecords, adminQuery, statusFilter]);

    const adminTotalPages = Math.max(1, Math.ceil(filteredAdminRecords.length / ADMIN_PAGE_SIZE));
    const pagedAdminRecords = useMemo(() => {
        const start = (adminPage - 1) * ADMIN_PAGE_SIZE;
        return filteredAdminRecords.slice(start, start + ADMIN_PAGE_SIZE);
    }, [filteredAdminRecords, adminPage]);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    if (!currentWorkspace) return null;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center gap-2">
                <CalendarIcon className="size-4" />
                <h1 className="text-xl font-semibold">Attendance</h1>
            </div>

            {user?.role === "ADMIN" ? (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-zinc-950 dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <div className="text-sm text-zinc-600 dark:text-zinc-400">Select date range</div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                {deleteStartDate && !deleteEndDate && `Selected: ${deleteStartDate}`}
                                {deleteStartDate && deleteEndDate && `Range: ${deleteStartDate} → ${deleteEndDate}`}
                            </div>
                            <div className="sm:ml-auto flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                <input
                                    value={adminQuery}
                                    onChange={(e) => { setAdminQuery(e.target.value); setAdminPage(1); }}
                                    placeholder="Search name or email"
                                    className="rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 px-3 py-2 text-sm w-full sm:w-56"
                                />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => { setStatusFilter(e.target.value); setAdminPage(1); }}
                                    className="rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 px-3 py-2 text-sm"
                                >
                                    <option value="all">All</option>
                                    <option value="marked">Marked</option>
                                    <option value="missing">Missing</option>
                                </select>
                            </div>
                        </div>

                        <div className="rounded border border-zinc-200 dark:border-zinc-800 p-3 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCalendarMonth((prev) => subMonths(prev, 1))}
                                    className="px-2 py-1 text-xs rounded border"
                                >
                                    Prev
                                </button>
                                <div className="flex items-center gap-2 text-xs">
                                    <select
                                        value={calendarMonth.getMonth()}
                                        onChange={(e) => setCalendarMonth((prev) => setMonth(prev, Number(e.target.value)))}
                                        className="rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 px-2 py-1"
                                    >
                                        {Array.from({ length: 12 }).map((_, idx) => (
                                            <option key={`m-${idx}`} value={idx}>
                                                {format(new Date(2024, idx, 1), "MMMM")}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={calendarMonth.getFullYear()}
                                        onChange={(e) => setCalendarMonth((prev) => setYear(prev, Number(e.target.value)))}
                                        className="rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 px-2 py-1"
                                    >
                                        {yearOptions.map((year) => (
                                            <option key={`y-${year}`} value={year}>{year}</option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setCalendarMonth((prev) => addMonths(prev, 1))}
                                    className="px-2 py-1 text-xs rounded border"
                                >
                                    Next
                                </button>
                            </div>
                            <div className="grid grid-cols-7 gap-2 text-center text-xs">
                                {["S", "M", "T", "W", "T", "F", "S"].map((d, idx) => (
                                    <div key={`${d}-${idx}`} className="text-zinc-500">{d}</div>
                                ))}
                                {(() => {
                                    const firstDay = startOfMonth(calendarMonth);
                                    const leading = firstDay.getDay();
                                    return Array.from({ length: leading }).map((_, idx) => (
                                        <div key={`admin-empty-${idx}`} />
                                    ));
                                })()}
                                {monthDays.map((day) => {
                                    const key = format(day, "yyyy-MM-dd");
                                    const ist = nowIST();
                                    const today = new Date(ist.getFullYear(), ist.getMonth(), ist.getDate());
                                    const isFuture = day > today;
                                    const isStart = deleteStartDate === key;
                                    const isEnd = deleteEndDate === key;
                                    const inRange = deleteStartDate && deleteEndDate
                                        ? day >= new Date(deleteStartDate) && day <= new Date(deleteEndDate)
                                        : false;

                                    const baseClass = "w-9 h-9 rounded flex items-center justify-center";
                                    const colorClass = isFuture
                                        ? "bg-zinc-100 text-zinc-400 dark:bg-zinc-900/50 dark:text-zinc-500 cursor-not-allowed"
                                        : isStart || isEnd
                                            ? "bg-blue-600 text-white"
                                            : inRange
                                                ? "bg-blue-200 text-blue-900 dark:bg-blue-500/20 dark:text-blue-200"
                                                : "bg-zinc-200 dark:bg-zinc-800";

                                    return (
                                        <button
                                            key={`admin-${key}`}
                                            type="button"
                                            disabled={isFuture}
                                            onClick={() => handleAdminDateClick(day)}
                                            className={`${baseClass} ${colorClass}`}
                                        >
                                            {day.getDate()}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => {
                                    const tk = todayKeyIST();
                                    setDeleteStartDate(tk);
                                    setDeleteEndDate(tk);
                                    setSelectedDate(tk);
                                }}
                                className="px-3 py-2 rounded border text-sm"
                            >
                                Today only
                            </button>
                            <button
                                onClick={handleDeleteAttendanceDates}
                                disabled={!deleteStartDate || !deleteEndDate}
                                className="px-3 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm disabled:opacity-50"
                            >
                                Delete Range
                            </button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-950 dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-medium">Attendance Records</span>
                            <div className="flex items-center gap-3 text-xs">
                                <span className="px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                                    Marked: {adminRecords.filter((r) => r.attendance).length}
                                </span>
                                <span className="px-2 py-1 rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
                                    Missing: {adminRecords.filter((r) => !r.attendance).length}
                                </span>
                                <span className="px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                                    Total: {adminRecords.length}
                                </span>
                            </div>
                        </div>
                        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                            {pagedAdminRecords.length === 0 ? (
                                <div className="p-6 text-sm text-zinc-500">No records found.</div>
                            ) : (
                                pagedAdminRecords.map((record, index) => (
                                    <div key={record.user.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                                        <div className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 w-8 shrink-0">
                                            {(adminPage - 1) * ADMIN_PAGE_SIZE + index + 1}.
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                                                {record.user.name || record.user.email}
                                            </div>
                                            <div className="text-xs text-zinc-500 dark:text-zinc-400">{record.user.email}</div>
                                        </div>
                                        <div className="text-xs">
                                            {record.attendance ? (
                                                <span className="px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">Marked</span>
                                            ) : (
                                                <span className="px-2 py-1 rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">Missing</span>
                                            )}
                                        </div>
                                        <div className="w-full sm:w-40">
                                            {record.attendance?.imageUrl ? (
                                                <div className="cursor-pointer group">
                                                    <img
                                                        src={record.attendance.imageUrl}
                                                        alt="attendance"
                                                        className="w-full h-32 object-cover rounded border border-zinc-200 dark:border-zinc-800 group-hover:opacity-75 transition-opacity"
                                                        onClick={() => setSelectedPhoto(record.attendance)}
                                                    />
                                                    {record.attendance.createdAt && (
                                                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 truncate">
                                                            {format(toIST(record.attendance.createdAt), "MMM dd, yyyy hh:mm a")}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="w-full h-32 flex items-center justify-center rounded border border-dashed border-zinc-300 dark:border-zinc-700 text-xs text-zinc-500">
                                                    No photo
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        {adminTotalPages > 1 && (
                            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2 text-sm">
                                <button
                                    disabled={adminPage === 1}
                                    onClick={() => setAdminPage((p) => p - 1)}
                                    className="px-3 py-1 rounded border disabled:opacity-50"
                                >
                                    Prev
                                </button>
                                <span>{adminPage} / {adminTotalPages}</span>
                                <button
                                    disabled={adminPage === adminTotalPages}
                                    onClick={() => setAdminPage((p) => p + 1)}
                                    className="px-3 py-1 rounded border disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Live DateTime + Status Banner */}
                    <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 dark:from-blue-700 dark:via-indigo-700 dark:to-violet-800 rounded-2xl p-5 sm:p-6 text-white shadow-lg shadow-blue-500/20 dark:shadow-blue-900/30">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.1),transparent_60%)]" />
                        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <p className="text-blue-100 dark:text-blue-200 text-xs font-medium tracking-wider uppercase">
                                    {format(currentTime, "EEEE, MMMM dd, yyyy")}
                                </p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl sm:text-4xl font-bold tracking-tight font-mono tabular-nums">
                                        {format(currentTime, "hh:mm:ss")}
                                    </span>
                                    <span className="text-lg font-semibold text-blue-200 dark:text-blue-300">
                                        {format(currentTime, "a")}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {todayAttendance ? (
                                    <div className="flex items-center gap-2.5 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/20">
                                        <div className="w-8 h-8 rounded-full bg-emerald-400/20 flex items-center justify-center">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-white">Checked In</p>
                                            <p className="text-[11px] text-blue-200">
                                                {todayAttendance.createdAt ? format(toIST(todayAttendance.createdAt), "hh:mm a") : "Today"}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2.5 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/20">
                                        <div className="w-8 h-8 rounded-full bg-red-400/20 flex items-center justify-center">
                                            <XCircle className="w-5 h-5 text-red-300" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-white">Not Checked In</p>
                                            <p className="text-[11px] text-blue-200">Pending</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-[6fr_4fr] gap-6">
                        {/* Mark Attendance Card */}
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
                            {/* Card header */}
                            <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                                        <Camera className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Mark Attendance</h3>
                                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Capture your photo to check in</p>
                                    </div>
                                </div>
                                {todayAttendance && (
                                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 uppercase tracking-wider">
                                        Done
                                    </span>
                                )}
                            </div>

                            {/* Card body */}
                            <div className="p-5 space-y-4">
                                {!permissionGranted ? (
                                    <div className="space-y-4">
                                        {/* Camera placeholder */}
                                        <div className="relative aspect-video rounded-xl bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-800/50 border-2 border-dashed border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center gap-3">
                                            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                                                <Camera className="w-7 h-7 text-blue-500 dark:text-blue-400" />
                                            </div>
                                            <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center px-4">Enable your camera to take a selfie for attendance verification</p>
                                        </div>
                                        <button
                                            onClick={startCamera}
                                            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-indigo-600 text-white text-sm font-semibold shadow-md shadow-blue-500/20 dark:shadow-blue-700/30 hover:shadow-lg hover:shadow-blue-500/30 transition-all active:scale-[0.98]"
                                        >
                                            <Camera className="w-4 h-4" />
                                            Enable Camera
                                        </button>
                                        {cameraError && (
                                            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                                                <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                                <span className="text-xs text-red-600 dark:text-red-400">{cameraError}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : captured ? (
                                    <div className="space-y-4">
                                        {/* Preview */}
                                        <div className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-sm">
                                            <img src={captured} alt="preview" className="w-full" />
                                            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-[10px] text-white font-medium flex items-center gap-1.5">
                                                <Clock className="w-3 h-3" />
                                                {format(currentTime, "hh:mm a")}
                                            </div>
                                            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-[10px] text-white font-medium">
                                                Preview
                                            </div>
                                        </div>
                                        {/* Action buttons */}
                                        <div className="flex gap-3">
                                            <button
                                                onClick={submitAttendance}
                                                disabled={uploading}
                                                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-teal-600 text-white text-sm font-semibold shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                                            >
                                                {uploading ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Submitting...
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        Submit Attendance
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => { setCaptured(null); startCamera(); }}
                                                className="px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                            >
                                                Retake
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {/* Live camera feed */}
                                        <div className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-sm bg-black">
                                            <video ref={videoRef} autoPlay playsInline className="w-full" />
                                            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-sm">
                                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                                <span className="text-[10px] text-white font-medium">LIVE</span>
                                            </div>
                                            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-[10px] text-white font-medium flex items-center gap-1.5">
                                                <Clock className="w-3 h-3" />
                                                {format(currentTime, "hh:mm:ss a")}
                                            </div>
                                        </div>
                                        {/* Camera controls */}
                                        <div className="flex gap-3">
                                            <button
                                                onClick={capturePhoto}
                                                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-indigo-600 text-white text-sm font-semibold shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all active:scale-[0.98]"
                                            >
                                                <Camera className="w-4 h-4" />
                                                Capture Photo
                                            </button>
                                            <button
                                                onClick={() => { stopCamera(); setPermissionGranted(false); }}
                                                className="px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <canvas ref={canvasRef} className="hidden" />
                        </div>

                        {/* Right Column — Calendar + Photo */}
                        <div className="space-y-6">
                            {/* Calendar card */}
                            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                                            <CalendarIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Attendance History</h3>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setCalendarMonth((prev) => subMonths(prev, 1))} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                                            <ChevronLeft className="w-4 h-4 text-zinc-500" />
                                        </button>
                                        <div className="flex items-center gap-1.5">
                                            <select
                                                value={calendarMonth.getMonth()}
                                                onChange={(e) => setCalendarMonth((prev) => setMonth(prev, Number(e.target.value)))}
                                                className="rounded-lg border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            >
                                                {Array.from({ length: 12 }).map((_, idx) => (
                                                    <option key={`m2-${idx}`} value={idx}>
                                                        {format(new Date(2024, idx, 1), "MMM")}
                                                    </option>
                                                ))}
                                            </select>
                                            <select
                                                value={calendarMonth.getFullYear()}
                                                onChange={(e) => setCalendarMonth((prev) => setYear(prev, Number(e.target.value)))}
                                                className="rounded-lg border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            >
                                                {yearOptions.map((year) => (
                                                    <option key={`y2-${year}`} value={year}>{year}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <button onClick={() => setCalendarMonth((prev) => addMonths(prev, 1))} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                                            <ChevronRight className="w-4 h-4 text-zinc-500" />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-4">
                                    <div className="grid grid-cols-7 gap-1.5 text-center">
                                        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d, idx) => (
                                            <div key={`${d}-${idx}`} className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider py-1">{d}</div>
                                        ))}
                                        {(() => {
                                            const firstDay = startOfMonth(calendarMonth);
                                            const leading = firstDay.getDay();
                                            return Array.from({ length: leading }).map((_, idx) => (
                                                <div key={`empty-${idx}`} />
                                            ));
                                        })()}
                                        {monthDays.map((day) => {
                                            const key = format(day, "yyyy-MM-dd");
                                            const ist = nowIST();
                                            const isToday = isSameDay(day, ist);
                                            const todayStart = new Date(ist.getFullYear(), ist.getMonth(), ist.getDate());
                                            const isPast = day < todayStart;
                                            const attendance = attendanceMap.get(key);

                                            let cls = "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 dark:text-zinc-500";
                                            if (isToday && attendance) {
                                                cls = "bg-emerald-500 dark:bg-emerald-600 text-white font-bold ring-2 ring-emerald-300 dark:ring-emerald-400 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900";
                                            } else if (isToday && !attendance) {
                                                cls = "bg-red-500 dark:bg-red-600 text-white font-bold ring-2 ring-red-300 dark:ring-red-400 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900";
                                            } else if (isPast && attendance) {
                                                cls = "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-medium";
                                            } else if (isPast) {
                                                cls = "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500";
                                            }

                                            return (
                                                <div
                                                    key={key}
                                                    className={`w-full aspect-square rounded-lg flex items-center justify-center text-xs ${cls}`}
                                                >
                                                    {day.getDate()}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {/* Legend */}
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Present</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-sm bg-red-500" />
                                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Absent</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-sm bg-zinc-200 dark:bg-zinc-700" />
                                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Upcoming</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Today's small preview (non-clickable) */}
                            {todayAttendance?.imageUrl && (
                                <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
                                    <div className="p-3 flex items-center gap-3">
                                        <div className="w-14 h-14 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 flex-shrink-0">
                                            <img
                                                src={todayAttendance.imageUrl}
                                                alt="today"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                                                <span className="text-xs font-semibold text-zinc-900 dark:text-white">Attendance Submitted</span>
                                            </div>
                                            {todayAttendance.createdAt && (
                                                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                                                    {format(toIST(todayAttendance.createdAt), "hh:mm a")} · {format(currentTime, "MMM dd")}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Fullscreen Photo Modal */}
            {selectedPhoto && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedPhoto(null)}
                >
                    <div 
                        className="relative max-w-4xl max-h-[90vh] w-full h-full flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-4 border-b border-gray-700">
                            <div>
                                {selectedPhoto.createdAt && (
                                    <div className="text-white text-sm">
                                        {format(toIST(selectedPhoto.createdAt), "EEEE, MMMM dd, yyyy hh:mm:ss a")}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => setSelectedPhoto(null)}
                                className="text-white text-2xl hover:text-gray-300 transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="flex-1 flex items-center justify-center overflow-auto">
                            <img 
                                src={selectedPhoto.imageUrl} 
                                alt="fullscreen attendance"
                                className="max-w-full max-h-full object-contain"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Attendance;
