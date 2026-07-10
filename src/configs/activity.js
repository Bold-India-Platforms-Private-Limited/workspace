// Lightweight, independent activity tracker used to pause background polling
// (Groups chat, Email Monitor logs) while the tab sits idle. Deliberately
// separate from IdleDisconnect's own listeners — no shared state, so this
// can't affect the socket-disconnect/popup behavior. Never touches auth/session.
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "wheel"];

let lastActivity = Date.now();

if (typeof window !== "undefined") {
    ACTIVITY_EVENTS.forEach((evt) =>
        window.addEventListener(evt, () => { lastActivity = Date.now(); }, { passive: true })
    );
}

export const isIdleFor = (ms) => Date.now() - lastActivity >= ms;
