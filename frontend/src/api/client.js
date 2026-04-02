import axios from "axios";

/** Gateway routes live under /api/...; a missing /api suffix yields 404 (e.g. /payments/...). */
function resolveApiBaseUrl() {
  const raw = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8081/api").trim();
  const base = raw.replace(/\/+$/, "");
  return /\/api$/i.test(base) ? base : `${base}/api`;
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 30000
});

export default api;
