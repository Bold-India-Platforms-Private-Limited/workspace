// Global timezone config — India Standard Time (Asia/Kolkata, UTC+5:30)
export const TIMEZONE = "Asia/Kolkata";

/**
 * Get current date/time in IST
 */
export const nowIST = () => {
    return new Date(new Date().toLocaleString("en-US", { timeZone: TIMEZONE }));
};

/**
 * Convert any date to IST
 */
export const toIST = (date) => {
    if (!date) return null;
    const d = typeof date === "string" ? new Date(date) : date;
    return new Date(d.toLocaleString("en-US", { timeZone: TIMEZONE }));
};

/**
 * Format time in IST  (e.g. "02:30 PM")
 */
export const formatTimeIST = (date, options = {}) => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleTimeString("en-IN", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit", ...options });
};

/**
 * Format date in IST  (e.g. "11 Feb 2026")
 */
export const formatDateIST = (date, options = {}) => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-IN", { timeZone: TIMEZONE, ...options });
};

/**
 * Format full datetime in IST
 */
export const formatDateTimeIST = (date, options = {}) => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleString("en-IN", { timeZone: TIMEZONE, ...options });
};

/**
 * Get today's date key in IST (yyyy-MM-dd)
 */
export const todayKeyIST = () => {
    const ist = nowIST();
    const y = ist.getFullYear();
    const m = String(ist.getMonth() + 1).padStart(2, "0");
    const d = String(ist.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};

/**
 * Get IST date key from any date (yyyy-MM-dd)
 */
export const dateKeyIST = (date) => {
    const ist = toIST(date);
    if (!ist) return "";
    const y = ist.getFullYear();
    const m = String(ist.getMonth() + 1).padStart(2, "0");
    const d = String(ist.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};
