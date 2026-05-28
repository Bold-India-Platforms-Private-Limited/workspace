import { createContext, useContext, useMemo, useState } from "react";
import api from "../configs/api";
import { clearWorkspaceCache } from "../features/workspaceSlice";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(() => localStorage.getItem("token") || null);
    const [user, setUser] = useState(() => {
        const stored = localStorage.getItem("user");
        return stored ? JSON.parse(stored) : null;
    });

    const login = async (email, password) => {
        const { data } = await api.post("/api/auth/login", { email, password });
        const userWithRole = { ...data.user, role: data.role };
        setToken(data.token);
        setUser(userWithRole);
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(userWithRole));
        return data;
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("currentWorkspaceId");
        clearWorkspaceCache();
    };

    // Read from localStorage so this never returns a stale value from a
    // React render closure (e.g. right after login before re-render fires)
    const getToken = async () => localStorage.getItem("token");

    const value = useMemo(
        () => ({
            token,
            user,
            login,
            logout,
            getToken,
            isAuthenticated: Boolean(token),
        }),
        [token, user]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);