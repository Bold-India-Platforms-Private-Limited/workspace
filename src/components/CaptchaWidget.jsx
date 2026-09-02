import { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
import { RefreshCw, Info } from "lucide-react";

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
            <label className="block text-[13px] font-medium text-gray-700 dark:text-zinc-300">Security check</label>

            {/* CAPTCHA image + refresh */}
            <div className="flex items-stretch gap-2">
                <div className="flex-1 min-w-0 h-12 rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden bg-[#eef2ff] dark:bg-zinc-900">
                    {loading && (
                        <div className="w-full h-full flex items-center justify-center">
                            <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                        </div>
                    )}
                    {error && !loading && (
                        <div className="w-full h-full flex items-center justify-center text-xs text-red-500 px-2 text-center">
                            Failed to load — tap refresh
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
                    aria-label="Get a new image"
                    title="Get a new image"
                    className="group shrink-0 h-12 w-12 grid place-items-center rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 text-gray-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-500/50 hover:bg-blue-50 dark:hover:bg-blue-950/30 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition"
                >
                    <RefreshCw className={`w-[18px] h-[18px] transition-transform duration-300 ${loading ? "animate-spin" : "group-hover:-rotate-90"}`} />
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
                className="w-full h-12 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 px-4 text-[15px] font-mono font-semibold uppercase tracking-[0.25em] focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition placeholder:text-gray-400 dark:placeholder:text-zinc-600 placeholder:normal-case placeholder:tracking-normal placeholder:font-sans placeholder:font-normal"
            />

            {/* Hint */}
            <p className="text-[11px] text-gray-400 dark:text-zinc-500 flex items-center gap-1.5">
                <Info className="w-3 h-3 shrink-0" />
                Not readable? Tap refresh for a new one. Case-insensitive.
            </p>
        </div>
    );
});

export default CaptchaWidget;
