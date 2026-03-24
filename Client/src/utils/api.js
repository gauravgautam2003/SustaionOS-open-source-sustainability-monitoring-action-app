const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const getApiBase = () => API_BASE;
export const apiUrl = (path = "") => `${API_BASE}${path}`;
