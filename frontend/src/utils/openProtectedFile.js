import { resolveApiFileUrl, needsAuthenticatedFetch } from "./mediaUrl";

export async function openProtectedFile(filePath, token) {
  if (!filePath) return;
  if (/^https?:\/\//i.test(filePath)) {
    window.open(filePath, "_blank", "noopener,noreferrer");
    return;
  }
  const abs = resolveApiFileUrl(filePath);
  if (!needsAuthenticatedFetch(filePath)) {
    window.open(abs, "_blank", "noopener,noreferrer");
    return;
  }
  if (!token) return;
  const res = await fetch(abs, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return;
  const blob = await res.blob();
  const u = URL.createObjectURL(blob);
  window.open(u, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(u), 120000);
}

export async function downloadProtectedFile(filePath, token, filename = "report") {
  if (!filePath) return;
  const abs = resolveApiFileUrl(filePath);
  let blob;
  if (needsAuthenticatedFetch(filePath)) {
    if (!token) return;
    const res = await fetch(abs, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    blob = await res.blob();
  } else {
    const res = await fetch(abs);
    if (!res.ok) return;
    blob = await res.blob();
  }
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = u;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 5000);
}
