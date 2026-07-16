import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../configs/api";

const CACHE_KEY = "workspaceCache";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function readCache() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const { workspaces, timestamp } = JSON.parse(raw);
        if (Date.now() - timestamp > CACHE_TTL) {
            localStorage.removeItem(CACHE_KEY); // clean up expired cache
            return null;
        }
        // Treat empty arrays as no valid cache — never let a poisoned empty
        // array from a previous failed fetch act as "loaded" state
        if (!Array.isArray(workspaces) || workspaces.length === 0) return null;
        return workspaces;
    } catch {
        return null;
    }
}

function writeCache(workspaces, etag) {
    // Never write an empty array — that would poison the cache and cause
    // the "no workspaces" flash on the next load
    if (!Array.isArray(workspaces) || workspaces.length === 0) {
        localStorage.removeItem(CACHE_KEY);
        return;
    }
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ workspaces, timestamp: Date.now(), etag: etag || null }));
    } catch { /* quota exceeded - ignore */ }
}

// The etag is a candidate for revalidation, independent of the render-cache's
// 5-minute TTL above — the server (not this TTL) is the source of truth on
// whether it's still valid, via the If-None-Match / 304 round trip below.
function readStoredEtag() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        return JSON.parse(raw).etag || null;
    } catch {
        return null;
    }
}

export function clearWorkspaceCache() {
    localStorage.removeItem(CACHE_KEY);
}

function selectWorkspace(workspaces) {
    if (!workspaces || workspaces.length === 0) return null;
    const savedId = localStorage.getItem("currentWorkspaceId");
    if (savedId) {
        const found = workspaces.find((w) => w.id === savedId);
        if (found) return found;
    }
    return workspaces[0];
}

// Hydrate from cache for instant render on page load
const cached = readCache(); // null if empty, expired, or missing
const initialState = {
    workspaces: cached || [],
    currentWorkspace: cached ? selectWorkspace(cached) : null,
    // Show loading skeleton when there is no valid cached data to display
    loading: !cached,
    fetchError: false,
};

export const fetchWorkspaces = createAsyncThunk(
    "workspace/fetchWorkspaces",
    async ({ getToken }, { rejectWithValue }) => {
        try {
            const etag = readStoredEtag();
            const { data, status, headers } = await api.get("/api/workspaces", {
                headers: {
                    Authorization: `Bearer ${await getToken()}`,
                    ...(etag ? { "If-None-Match": etag } : {}),
                },
                // The backend echoes an unchanged payload as 304 (no body) —
                // treat that as a normal response, not an axios error.
                validateStatus: (s) => (s >= 200 && s < 300) || s === 304,
            });

            if (status === 304) {
                return { notModified: true };
            }
            return { workspaces: data.workspaces || [], etag: headers.etag || headers.ETag };
        } catch (error) {
            // Propagate the error so `rejected` fires instead of `fulfilled`.
            // Previously this returned [] on error, poisoning the cache and
            // wiping out valid cached workspaces in the Redux store.
            return rejectWithValue(error?.response?.data?.message || error.message || "Network error");
        }
    }
);

const workspaceSlice = createSlice({
    name: "workspace",
    initialState,
    reducers: {
        setWorkspaces: (state, action) => {
            state.workspaces = action.payload;
        },
        setCurrentWorkspace: (state, action) => {
            localStorage.setItem("currentWorkspaceId", action.payload);
            state.currentWorkspace = state.workspaces.find((w) => w.id === action.payload);
        },
        addWorkspace: (state, action) => {
            state.workspaces.push(action.payload);
            if (state.currentWorkspace?.id !== action.payload.id) {
                state.currentWorkspace = action.payload;
            }
        },
        updateWorkspace: (state, action) => {
            state.workspaces = state.workspaces.map((w) =>
                w.id === action.payload.id ? action.payload : w
            );
            if (state.currentWorkspace?.id === action.payload.id) {
                state.currentWorkspace = action.payload;
            }
        },
        deleteWorkspace: (state, action) => {
            state.workspaces = state.workspaces.filter((w) => w._id !== action.payload);
        },
        addProject: (state, action) => {
            state.currentWorkspace.projects.push(action.payload);
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace.id ? { ...w, projects: w.projects.concat(action.payload) } : w
            );
        },
        addProjectMember: (state, action) => {
            const { projectId, member } = action.payload;
            state.currentWorkspace.projects = state.currentWorkspace.projects.map((p) => {
                if (p.id === projectId) {
                    p.members.push(member);
                }
                return p;
            });
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace.id ? {
                    ...w, projects: w.projects.map((p) =>
                        p.id === projectId ? { ...p, members: p.members.concat(member) } : p
                    )
                } : w
            );
        },
        addTask: (state, action) => {
            state.currentWorkspace.projects = state.currentWorkspace.projects.map((p) => {
                if (p.id === action.payload.projectId) {
                    p.tasks.push(action.payload);
                }
                return p;
            });
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace.id ? {
                    ...w, projects: w.projects.map((p) =>
                        p.id === action.payload.projectId ? { ...p, tasks: p.tasks.concat(action.payload) } : p
                    )
                } : w
            );
        },
        updateTask: (state, action) => {
            state.currentWorkspace.projects.map((p) => {
                if (p.id === action.payload.projectId) {
                    p.tasks = p.tasks.map((t) =>
                        t.id === action.payload.id ? action.payload : t
                    );
                }
            });
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace.id ? {
                    ...w, projects: w.projects.map((p) =>
                        p.id === action.payload.projectId ? {
                            ...p, tasks: p.tasks.map((t) =>
                                t.id === action.payload.id ? action.payload : t
                            )
                        } : p
                    )
                } : w
            );
        },
        deleteTask: (state, action) => {
            state.currentWorkspace.projects.map((p) => {
                p.tasks = p.tasks.filter((t) => !action.payload.includes(t.id));
                return p;
            });
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace.id ? {
                    ...w, projects: w.projects.map((p) =>
                        p.id === action.payload.projectId ? {
                            ...p, tasks: p.tasks.filter((t) => !action.payload.includes(t.id))
                        } : p
                    )
                } : w
            );
        },
        // Called on logout — wipes Redux state so stale data never bleeds into
        // the next login session within the same browser tab
        resetState: (state) => {
            state.workspaces = [];
            state.currentWorkspace = null;
            state.loading = false;
            state.fetchError = false;
        },
    },
    extraReducers: (builder) => {
        builder.addCase(fetchWorkspaces.pending, (state) => {
            // Only show the skeleton loader when there is nothing to display yet.
            // If we already have cached workspaces, the user keeps seeing them
            // while the background refresh runs — no flicker, no disruption.
            if (state.workspaces.length === 0) {
                state.loading = true;
            }
            state.fetchError = false;
        });

        builder.addCase(fetchWorkspaces.fulfilled, (state, action) => {
            state.loading = false;
            state.fetchError = false;

            // Server confirmed nothing changed since our last fetch (304) —
            // keep the existing workspaces/currentWorkspace exactly as-is,
            // same "don't touch valid state" behavior as the rejected case.
            if (action.payload.notModified) return;

            const workspaces = action.payload.workspaces;
            state.workspaces = workspaces;

            if (workspaces.length > 0) {
                const savedId = localStorage.getItem("currentWorkspaceId");
                const found = savedId ? workspaces.find((w) => w.id === savedId) : null;
                state.currentWorkspace = found || workspaces[0];
                writeCache(workspaces, action.payload.etag); // persist fresh data + revalidation etag
            } else {
                state.currentWorkspace = null;
                // User genuinely has no workspaces — clear any stale cache
                // so the next load doesn't try to hydrate from it
                localStorage.removeItem("workspaceCache");
            }
        });

        builder.addCase(fetchWorkspaces.rejected, (state) => {
            // Backend is unreachable or returned an error.
            // Crucially: we do NOT touch state.workspaces here.
            // If the user had valid cached data showing, they keep seeing it.
            // Only mark error + stop spinner so the UI can react appropriately.
            state.loading = false;
            state.fetchError = true;
        });
    },
});

export const {
    setWorkspaces, setCurrentWorkspace, addWorkspace, updateWorkspace,
    deleteWorkspace, addProject, addProjectMember, addTask, updateTask, deleteTask, resetState,
} = workspaceSlice.actions;
export default workspaceSlice.reducer;
