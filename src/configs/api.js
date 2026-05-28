import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_BASEURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on expired/invalid token.
// Only triggers when the user WAS authenticated (has a stored token) and the
// failing request is not the login endpoint itself (login failures also return 401).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";
    const hadToken = Boolean(localStorage.getItem("token"));

    if (status === 401 && hadToken && !url.includes("/api/auth/")) {
      // Clear all auth + workspace data then force a clean reload to the login screen
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("currentWorkspaceId");
      localStorage.removeItem("workspaceCache");
      window.location.href = "/";
    }

    return Promise.reject(error);
  }
);

export default api;