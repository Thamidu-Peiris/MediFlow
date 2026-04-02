const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8081/api";

/** Turn stored path or absolute URL into a browser-fetchable URL. */
export function resolveApiFileUrl(filePath) {
  if (!filePath) return "";
  if (/^https?:\/\//i.test(filePath)) return filePath;
  const origin = API_BASE.replace(/\/api\/?$/, "");
  return filePath.startsWith("/") ? `${origin}${filePath}` : `${origin}/${filePath}`;
}

/** GridFS-backed routes require Authorization; plain <img src> cannot send it. */
export function needsAuthenticatedFetch(filePath) {
  if (!filePath || /^https?:\/\//i.test(filePath)) return false;
  return (
    filePath.includes("/avatar/me") ||
    (filePath.includes("/reports/") && filePath.includes("/download"))
  );
}
