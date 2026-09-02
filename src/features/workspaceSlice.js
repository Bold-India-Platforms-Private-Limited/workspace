import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../configs/api";

// Lightweight list of workspaces (id / name / image / members) — NO project
// or task graph. The heavy per-workspace graph lives under DETAIL_KEY_PREFIX
// and is fetched one workspace at a time via fetchWorkspaceDetail.
const CACHE_KEY = "workspaceListCache";
const DETAIL_KEY_PREFIX = "workspaceDetailCache:";
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

// --- Per-workspace detail cache (heavy graph) ---
function readDetailCache(workspaceId) {
    if (!workspaceId) return null;
    try {
        const raw = localStorage.getItem(DETAIL_KEY_PREFIX + workspaceId);
        if (!raw) return null;
        const { workspace, timestamp } = JSON.parse(raw);
        if (Date.now() - timestamp > CACHE_TTL) {
            localStorage.removeItem(DETAIL_KEY_PREFIX + workspaceId);
            return null;
        }
        return workspace && Array.isArray(workspace.projects) ? workspace : null;
    } catch {
        return null;
    }
}

function writeDetailCache(workspace) {
    if (!workspace?.id) return;
    try {
        localStorage.setItem(
            DETAIL_KEY_PREFIX + workspace.id,
            JSON.stringify({ workspace, timestamp: Date.now() })
        );
    } catch { /* quota exceeded - ignore */ }
}

function clearAllDetailCache() {
    try {
        Object.keys(localStorage)
            .filter((k) => k.startsWith(DETAIL_KEY_PREFIX))
            .forEach((k) => localStorage.removeItem(k));
    } catch { /* ignore */ }
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
    clearAllDetailCache();
}

function savedWorkspaceId() {
    try {
        return localStorage.getItem("currentWorkspaceId");
    } catch {
        return null;
    }
}

// Guarantee `currentWorkspace` always has projects/groups arrays, even when
// it's a bare light-list stub whose heavy graph hasn't loaded yet. Many
// consumers do `currentWorkspace.projects.flatMap(...)` without guarding.
function asCurrent(ws) {
    if (!ws) return null;
    return {
        ...ws,
        projects: Array.isArray(ws.projects) ? ws.projects : [],
        groups: Array.isArray(ws.groups) ? ws.groups : [],
    };
}

// Pick which workspace is "current" from a light list, preferring a cached
// heavy detail blob so consumers see projects/tasks immediately on load.
function selectWorkspace(workspaces) {
    if (!workspaces || workspaces.length === 0) return null;
    const savedId = savedWorkspaceId();
    const chosen = (savedId && workspaces.find((w) => w.id === savedId)) || workspaces[0];
    return asCurrent(readDetailCache(chosen.id) || chosen);
}

// Hydrate from cache for instant render on page load
const cached = readCache(); // null if empty, expired, or missing
const initialState = {
    workspaces: cached || [],
    currentWorkspace: cached ? selectWorkspace(cached) : null,
    // Show loading skeleton when there is no valid cached data to display
    loading: !cached,
    fetchError: false,
    // Heavy per-workspace graph load (fetchWorkspaceDetail)
    detailLoading: false,
    detailError: false,
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

// Fetch the heavy project/task/group graph for ONE workspace — the selected
// one. This replaces the old behaviour where fetchWorkspaces returned every
// workspace's full graph at once (which materialised ~the whole DB for admins).
export const fetchWorkspaceDetail = createAsyncThunk(
    "workspace/fetchWorkspaceDetail",
    async ({ getToken, workspaceId }, { rejectWithValue }) => {
        try {
            const { data } = await api.get(`/api/workspaces/${workspaceId}`, {
                headers: { Authorization: `Bearer ${await getToken()}` },
            });
            return { workspace: data.workspace };
        } catch (error) {
            return rejectWithValue(error?.response?.data?.message || error.message || "Network error");
        }
    }
);

// Merge a freshly-fetched light list entry over the current workspace while
// keeping any heavy graph (projects/groups) we've already loaded for it.
function withLoadedGraph(lightWs, existingCurrent) {
    if (
        existingCurrent &&
        existingCurrent.id === lightWs.id &&
        Array.isArray(existingCurrent.projects)
    ) {
        return { ...lightWs, projects: existingCurrent.projects, groups: existingCurrent.groups };
    }
    return asCurrent(readDetailCache(lightWs.id) || lightWs);
}

const workspaceSlice = createSlice({
    name: "workspace",
    initialState,
    reducers: {
        setWorkspaces: (state, action) => {
            state.workspaces = action.payload;
        },
        setCurrentWorkspace: (state, action) => {
            localStorage.setItem("currentWorkspaceId", action.payload);
            const light = state.workspaces.find((w) => w.id === action.payload) || null;
            // Show cached heavy data instantly; fetchWorkspaceDetail refreshes it.
            state.currentWorkspace = asCurrent(readDetailCache(action.payload) || light);
        },
        addWorkspace: (state, action) => {
            state.workspaces.push(action.payload);
            if (state.currentWorkspace?.id !== action.payload.id) {
                state.currentWorkspace = asCurrent(action.payload);
            }
        },
        updateWorkspace: (state, action) => {
            state.workspaces = state.workspaces.map((w) =>
                w.id === action.payload.id ? action.payload : w
            );
            if (state.currentWorkspace?.id === action.payload.id) {
                state.currentWorkspace = asCurrent(action.payload);
            }
        },
        deleteWorkspace: (state, action) => {
            state.workspaces = state.workspaces.filter((w) => w._id !== action.payload);
        },
        addProject: (state, action) => {
            if (state.currentWorkspace) {
                state.currentWorkspace.projects = (state.currentWorkspace.projects || []).concat(action.payload);
            }
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace?.id && Array.isArray(w.projects)
                    ? { ...w, projects: w.projects.concat(action.payload) }
                    : w
            );
        },
        addProjectMember: (state, action) => {
            const { projectId, member } = action.payload;
            if (state.currentWorkspace?.projects) {
                state.currentWorkspace.projects = state.currentWorkspace.projects.map((p) => {
                    if (p.id === projectId) {
                        p.members.push(member);
                    }
                    return p;
                });
            }
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace?.id && Array.isArray(w.projects)
                    ? {
                        ...w, projects: w.projects.map((p) =>
                            p.id === projectId ? { ...p, members: p.members.concat(member) } : p
                        )
                    } : w
            );
        },
        addTask: (state, action) => {
            if (state.currentWorkspace?.projects) {
                state.currentWorkspace.projects = state.currentWorkspace.projects.map((p) => {
                    if (p.id === action.payload.projectId) {
                        p.tasks.push(action.payload);
                    }
                    return p;
                });
            }
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace?.id && Array.isArray(w.projects)
                    ? {
                        ...w, projects: w.projects.map((p) =>
                            p.id === action.payload.projectId ? { ...p, tasks: p.tasks.concat(action.payload) } : p
                        )
                    } : w
            );
        },
        updateTask: (state, action) => {
            if (state.currentWorkspace?.projects) {
                state.currentWorkspace.projects.map((p) => {
                    if (p.id === action.payload.projectId) {
                        p.tasks = p.tasks.map((t) =>
                            t.id === action.payload.id ? action.payload : t
                        );
                    }
                });
            }
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace?.id && Array.isArray(w.projects)
                    ? {
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
            if (state.currentWorkspace?.projects) {
                state.currentWorkspace.projects.map((p) => {
                    p.tasks = p.tasks.filter((t) => !action.payload.includes(t.id));
                    return p;
                });
            }
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace?.id && Array.isArray(w.projects)
                    ? {
                        ...w, projects: w.projects.map((p) => ({
                            ...p, tasks: p.tasks.filter((t) => !action.payload.includes(t.id))
                        }))
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
            state.detailLoading = false;
            state.detailError = false;
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
                const savedId = savedWorkspaceId();
                const found = savedId ? workspaces.find((w) => w.id === savedId) : null;
                const lightCurrent = found || workspaces[0];
                // Keep any heavy graph we've already loaded for this workspace;
                // don't clobber currentWorkspace with a bare light stub.
                state.currentWorkspace = withLoadedGraph(lightCurrent, state.currentWorkspace);
                writeCache(workspaces, action.payload.etag); // persist fresh list + revalidation etag
            } else {
                state.currentWorkspace = null;
                // User genuinely has no workspaces — clear any stale cache
                // so the next load doesn't try to hydrate from it
                localStorage.removeItem(CACHE_KEY);
                clearAllDetailCache();
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

        builder.addCase(fetchWorkspaceDetail.pending, (state) => {
            state.detailError = false;
            // Only show a skeleton when there's no graph to display yet for
            // the current workspace — otherwise refresh silently in place.
            state.detailLoading = !Array.isArray(state.currentWorkspace?.projects);
        });

        builder.addCase(fetchWorkspaceDetail.fulfilled, (state, action) => {
            state.detailLoading = false;
            state.detailError = false;

            const ws = action.payload.workspace;
            if (!ws?.id) return;

            // Guard against a stale response arriving after the user already
            // switched to another workspace.
            if (!state.currentWorkspace || state.currentWorkspace.id === ws.id) {
                state.currentWorkspace = ws;
            }
            state.workspaces = state.workspaces.map((w) =>
                w.id === ws.id ? { ...w, ...ws } : w
            );
            writeDetailCache(ws);
        });

        builder.addCase(fetchWorkspaceDetail.rejected, (state) => {
            state.detailLoading = false;
            state.detailError = true;
        });
    },
});

export const {
    setWorkspaces, setCurrentWorkspace, addWorkspace, updateWorkspace,
    deleteWorkspace, addProject, addProjectMember, addTask, updateTask, deleteTask, resetState,
} = workspaceSlice.actions;
export default workspaceSlice.reducer;
