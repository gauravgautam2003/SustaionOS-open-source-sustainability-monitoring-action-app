const resolveDefaultBase = () => {
  if (import.meta.env.DEV) return "http://localhost:5000";
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return "";
};

const API_BASE = (import.meta.env.VITE_API_URL || resolveDefaultBase()).replace(/\/$/, "");
const SOCKET_BASE = (import.meta.env.VITE_SOCKET_URL || API_BASE || resolveDefaultBase()).replace(/\/$/, "");

export const getApiBase = () => API_BASE;
export const getSocketBase = () => SOCKET_BASE;
export const apiUrl = (path = "") => `${API_BASE}${path}`;
