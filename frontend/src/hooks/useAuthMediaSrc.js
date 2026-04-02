import { useEffect, useState } from "react";
import { resolveApiFileUrl, needsAuthenticatedFetch } from "../utils/mediaUrl";

/**
 * Resolves a profile/report file URL for <img src>. Uses Bearer fetch + blob when the API requires auth.
 */
export function useAuthMediaSrc(filePath, token) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    if (!filePath) {
      setSrc("");
      return undefined;
    }
    if (/^https?:\/\//i.test(filePath)) {
      setSrc(filePath);
      return undefined;
    }
    const abs = resolveApiFileUrl(filePath);
    if (!needsAuthenticatedFetch(filePath)) {
      setSrc(abs);
      return undefined;
    }
    if (!token) {
      setSrc("");
      return undefined;
    }

    let cancelled = false;
    let blobUrl = "";
    fetch(abs, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        blobUrl = URL.createObjectURL(blob);
        setSrc(blobUrl);
      })
      .catch(() => {
        if (!cancelled) setSrc("");
      });

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [filePath, token]);

  return src;
}
