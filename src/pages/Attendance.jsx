import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useSelector } from "react-redux";
import api from "../configs/api";
import { CalendarIcon, Camera, Image as ImageIcon } from "lucide-react";
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
    const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [adminRecords, setAdminRecords] = useState([]);
    const [cameraError, setCameraError] = useState("");
    const [adminQuery, setAdminQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("marked");
    const [adminPage, setAdminPage] = useState(1);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [deleteStartDate, setDeleteStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [deleteEndDate, setDeleteEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [calendarMonth, setCalendarMonth] = useState(new Date());

    const ADMIN_PAGE_SIZE = 5;

    const monthDays = useMemo(() => {
        const start = startOfMonth(calendarMonth);
        const end = endOfMonth(calendarMonth);
        return eachDayOfInterval({ start, end });
    }, [calendarMonth]);

    const currentYear = getYear(new Date());
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
            map.set(format(new Date(a.date), "yyyy-MM-dd"), a);
        });
        return map;
    }, [attendances]);

    const todayKey = format(new Date(), "yyyy-MM-dd");
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
        const today = new Date(new Date().setHours(0, 0, 0, 0));
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
            const dateA = a.attendance?.createdAt ? new Date(a.attendance.createdAt).getTime() : 0;
            const dateB = b.attendance?.createdAt ? new Date(b.attendance.createdAt).getTime() : 0;
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
                                    const today = new Date(new Date().setHours(0, 0, 0, 0));
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
                                    const todayKey = format(new Date(), "yyyy-MM-dd");
                                    setDeleteStartDate(todayKey);
                                    setDeleteEndDate(todayKey);
                                    setSelectedDate(todayKey);
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
                        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 text-sm font-medium">Attendance Records</div>
                        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                            {pagedAdminRecords.length === 0 ? (
                                <div className="p-6 text-sm text-zinc-500">No records found.</div>
                            ) : (
                                pagedAdminRecords.map((record) => (
                                    <div key={record.user.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
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
                                        <div className="w-full sm:w-28">
                                            {record.attendance?.imageUrl ? (
                                                <div className="cursor-pointer group">
                                                    <img 
                                                        src={record.attendance.imageUrl} 
                                                        alt="attendance" 
                                                        className="w-full h-20 object-cover rounded border border-zinc-200 dark:border-zinc-800 group-hover:opacity-75 transition-opacity"
                                                        onClick={() => setSelectedPhoto(record.attendance)}
                                                    />
                                                    {record.attendance.createdAt && (
                                                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 truncate">
                                                            {format(new Date(record.attendance.createdAt), "MMM dd, yyyy HH:mm")}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="w-full h-20 flex items-center justify-center rounded border border-dashed border-zinc-300 dark:border-zinc-700 text-xs text-zinc-500">
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
                    <div className="grid grid-cols-1 lg:grid-cols-[6fr_4fr] gap-6">
                        <div className="bg-white dark:bg-zinc-950 dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="text-sm font-medium">Mark Attendance</div>
                                {todayAttendance ? (
                                    <span className="text-xs px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">Marked</span>
                                ) : (
                                    <span className="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">Not marked</span>
                                )}
                            </div>

                            {!permissionGranted ? (
                                <div className="space-y-2">
                                    <button
                                        onClick={startCamera}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm"
                                    >
                                        <Camera className="size-4" /> Enable Camera
                                    </button>
                                    {cameraError && (
                                        <div className="text-xs text-red-600 dark:text-red-400">{cameraError}</div>
                                    )}
                                </div>
                            ) : captured ? (
                                <div className="space-y-3">
                                    <div className="text-xs text-zinc-500">Preview (compressed)</div>
                                    <img src={captured} alt="preview" className="w-full rounded border border-zinc-200 dark:border-zinc-800" />
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={submitAttendance}
                                            disabled={uploading}
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-sm disabled:opacity-60"
                                        >
                                            <ImageIcon className="size-4" /> {uploading ? "Submitting..." : "Submit Attendance"}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setCaptured(null);
                                                startCamera();
                                            }}
                                            className="px-4 py-2 rounded border text-sm"
                                        >
                                            Retake
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <video ref={videoRef} autoPlay playsInline className="w-full rounded border border-zinc-200 dark:border-zinc-800" />
                                    <div className="flex flex-wrap gap-2">
                                        <button onClick={capturePhoto} className="px-4 py-2 rounded border text-sm">Capture</button>
                                        <button onClick={stopCamera} className="px-4 py-2 rounded border text-sm">Stop</button>
                                    </div>
                                </div>
                            )}

                            <canvas ref={canvasRef} className="hidden" />
                        </div>

                        <div className="bg-white dark:bg-zinc-950 dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                <div className="text-sm font-medium">Calendar</div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setCalendarMonth((prev) => subMonths(prev, 1))}
                                        className="px-2 py-1 text-xs rounded border"
                                    >
                                        Prev
                                    </button>
                                    <select
                                        value={calendarMonth.getMonth()}
                                        onChange={(e) => setCalendarMonth((prev) => setMonth(prev, Number(e.target.value)))}
                                        className="rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 px-2 py-1 text-xs"
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
                                        className="rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 px-2 py-1 text-xs"
                                    >
                                        {yearOptions.map((year) => (
                                            <option key={`y2-${year}`} value={year}>{year}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setCalendarMonth((prev) => addMonths(prev, 1))}
                                        className="px-2 py-1 text-xs rounded border"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-7 gap-2 text-center text-xs">
                                {["S", "M", "T", "W", "T", "F", "S"].map((d, idx) => (
                                    <div key={`${d}-${idx}`} className="text-zinc-500">{d}</div>
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
                                    const isToday = isSameDay(day, new Date());
                                    const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));
                                    const attendance = attendanceMap.get(key);

                                    let bg = "bg-zinc-200 dark:bg-zinc-800";
                                    if (isToday) {
                                        bg = attendance ? "bg-emerald-500 text-white" : "bg-red-500 text-white";
                                    } else if (isPast) {
                                        bg = "bg-zinc-300 dark:bg-zinc-700";
                                    }

                                    return (
                                        <div key={key} className={`w-9 h-9 rounded flex items-center justify-center ${bg}`}>
                                            {day.getDate()}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-4">
                                <div className="text-xs text-zinc-500 mb-2">Today’s Photo</div>
                                {todayAttendance?.imageUrl ? (
                                    <div className="cursor-pointer group">
                                        <img 
                                            src={todayAttendance.imageUrl} 
                                            alt="today" 
                                            className="w-full rounded border border-zinc-200 dark:border-zinc-800 group-hover:opacity-75 transition-opacity"
                                            onClick={() => setSelectedPhoto(todayAttendance)}
                                        />
                                        {todayAttendance.createdAt && (
                                            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                                                {format(new Date(todayAttendance.createdAt), "HH:mm:ss")}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="w-full h-32 rounded border border-dashed border-zinc-300 dark:border-zinc-700 text-xs text-zinc-500 flex items-center justify-center">
                                        No photo yet
                                    </div>
                                )}
                            </div>
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
                                        {format(new Date(selectedPhoto.createdAt), "EEEE, MMMM dd, yyyy HH:mm:ss")}
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
