import { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";

/**
 * Custom SVG CAPTCHA widget.
 *
 * Props:
 *   onChange({ token, answer })  – called whenever the answer changes
 *   onReset()                    – optional, called when the image is refreshed
 *
 * Ref methods:
 *   ref.current.reset()          – fetch a new CAPTCHA and clear the input
 */
const CaptchaWidget = forwardRef(function CaptchaWidget({ onChange, onReset }, ref) {
    const BASE = import.meta.env.VITE_BASEURL;

    const [image,   setImage]   = useState(null);
    const [token,   setToken]   = useState("");
    const [answer,  setAnswer]  = useState("");
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState(false);

    const fetchCaptcha = useCallback(async () => {
        setLoading(true);
        setError(false);
        setAnswer("");
        onChange?.({ token: "", answer: "" });
        try {
            const res  = await fetch(`${BASE}/api/auth/captcha`, { cache: "no-store" });
            const data = await res.json();
            setImage(data.image);
            setToken(data.token);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [BASE, onChange]);

    // expose reset() to parent
    useImperativeHandle(ref, () => ({
        reset: () => {
            fetchCaptcha();
            onReset?.();
        },
    }), [fetchCaptcha, onReset]);

    // load on mount
    useEffect(() => { fetchCaptcha(); }, [fetchCaptcha]);

    const handleInput = (e) => {
        const val = e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 6);
        setAnswer(val);
        onChange?.({ token, answer: val });
    };

    return (
        <div className="space-y-2">
            {/* CAPTCHA image row */}
            <div className="flex items-center gap-2">
                <div
                    className="flex-1 rounded-lg border-2 border-gray-200 dark:border-zinc-700 overflow-hidden bg-[#eef2ff]"
                    style={{ height: 64, minWidth: 0 }}
                >
                    {loading && (
                        <div className="w-full h-full flex items-center justify-center">
                            <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                        </div>
                    )}
                    {error && !loading && (
                        <div className="w-full h-full flex items-center justify-center text-xs text-red-500 px-2 text-center">
                            Failed to load. Click refresh.
                        </div>
                    )}
                    {image && !loading && !error && (
                        <img
                            src={image}
                            alt="CAPTCHA — type the characters shown"
                            draggable={false}
                            className="w-full h-full object-contain select-none pointer-events-none"
                            style={{ userSelect: "none" }}
                        />
                    )}
                </div>

                {/* Refresh button */}
                <button
                    type="button"
                    onClick={fetchCaptcha}
                    disabled={loading}
                    title="Get a new CAPTCHA"
                    className="shrink-0 p-2 rounded-lg border-2 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-40 transition"
                >
                    <svg className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M4 4v5h.582M20 20v-5h-.581M5.523 19A9 9 0 1118 6.5" />
                    </svg>
                </button>
            </div>

            {/* Answer input */}
            <input
                type="text"
                value={answer}
                onChange={handleInput}
                placeholder="Type the characters above"
                autoComplete="off"
                spellCheck={false}
                maxLength={6}
                style={{ backgroundColor: "white", border: "2px solid #e5e7eb", color: "#111827", letterSpacing: "0.2em" }}
                className="w-full rounded-xl px-4 py-2.5 text-sm font-mono font-semibold uppercase focus:outline-none focus:border-blue-500 transition placeholder-gray-400 placeholder:normal-case placeholder:tracking-normal placeholder:font-normal"
            />

            {/* Hint */}
            <p className="text-[11px] text-gray-400 dark:text-zinc-500 flex items-center gap-1">
                <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                </svg>
                Not readable? Click the refresh icon for a new one. Case-insensitive.
            </p>
        </div>
    );
});

export default CaptchaWidget;
