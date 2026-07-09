import { useEffect, useRef, useState } from "react";
import { getSocket, isSocketConnected } from "../configs/socket";

const IDLE_MS = 3 * 60 * 1000; // 3 minutes
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "wheel"];

/**
 * After 3 minutes with no mouse/keyboard/scroll activity, disconnects the
 * shared socket.io connection (the one standing backend connection per tab)
 * and shows an informational popup. This never touches auth/session state —
 * no logout, no redirect, no localStorage changes. Activity resumes the
 * socket connection automatically and dismisses the popup.
 */
export default function IdleDisconnect() {
    const [isIdle, setIsIdle] = useState(false);
    const timerRef = useRef(null);
    const isIdleRef = useRef(false);
    const disconnectedByIdleRef = useRef(false);

    useEffect(() => {
        const goIdle = () => {
            if (isSocketConnected()) {
                getSocket().disconnect();
                disconnectedByIdleRef.current = true;
            }
            isIdleRef.current = true;
            setIsIdle(true);
        };

        const resetTimer = () => {
            if (isIdleRef.current) {
                if (disconnectedByIdleRef.current) {
                    getSocket().connect();
                    disconnectedByIdleRef.current = false;
                }
                isIdleRef.current = false;
                setIsIdle(false);
            }
            clearTimeout(timerRef.current);
            timerRef.current = setTimeout(goIdle, IDLE_MS);
        };

        ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));
        timerRef.current = setTimeout(goIdle, IDLE_MS);

        return () => {
            ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetTimer));
            clearTimeout(timerRef.current);
        };
    }, []);

    const dismiss = () => {
        if (disconnectedByIdleRef.current) {
            getSocket().connect();
            disconnectedByIdleRef.current = false;
        }
        isIdleRef.current = false;
        setIsIdle(false);
    };

    if (!isIdle) return null;

    return (
        <div className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-sm w-full p-6 text-center space-y-3">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">Still there?</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    If you have understood your project, you can close this tab now.
                </p>
                <button
                    onClick={dismiss}
                    className="mt-2 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
                >
                    Continue working
                </button>
            </div>
        </div>
    );
}
