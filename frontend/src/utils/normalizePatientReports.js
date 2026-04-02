/**
 * Legacy rows stored filePath like /api/patients/uploads/... (disk URLs).
 * Patient-service should strip these; if an old service still returns them, normalize here
 * so thumbnails and dev checks never treat them as valid media URLs.
 */
function isCloudinaryDeliveredUrl(filePath) {
  return /res\.cloudinary\.com/i.test(String(filePath || ""));
}

export function isLegacyDiskReportPath(filePath) {
  const fp = String(filePath || "").replace(/\\/g, "/");
  if (!fp || isCloudinaryDeliveredUrl(fp)) return false;
  return (
    /\/uploads\//i.test(fp) ||
    fp.includes("/api/patients/uploads") ||
    /localhost:\d+\/api\/patients\/uploads/i.test(fp)
  );
}

export function normalizeReportForClient(report) {
  if (!report || typeof report !== "object") return report;
  let fp = String(report.filePath || "").trim();
  if (fp.startsWith("//")) fp = `https:${fp}`;

  const cloudinaryId = String(report.cloudinaryPublicId || "").trim();

  if (isLegacyDiskReportPath(report.filePath)) {
    return { ...report, filePath: "", needsReupload: true };
  }

  if (/^https?:\/\//i.test(fp) || isCloudinaryDeliveredUrl(fp) || cloudinaryId) {
    return { ...report, filePath: fp || report.filePath, needsReupload: false };
  }

  if (fp.includes("/reports/") && fp.includes("/download")) {
    return { ...report, needsReupload: false };
  }

  return { ...report, needsReupload: Boolean(report.needsReupload) };
}

export function normalizeReportsList(reports) {
  if (!Array.isArray(reports)) return [];
  return reports.map(normalizeReportForClient);
}
