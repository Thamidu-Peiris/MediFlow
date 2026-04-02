/**
 * Removes report subdocuments whose filePath is the old disk URL pattern
 * (/api/patients/uploads/...). Those rows point at files that are not on Cloudinary
 * and usually no longer exist on disk.
 *
 * Dry run (default): logs what would be removed.
 * Apply: APPLY_LEGACY_REPORT_CLEANUP=1 node scripts/remove-legacy-disk-reports.js
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const Patient = require("../src/models/patient.model");

function isLegacyDiskUploadPath(filePath) {
  const fp = String(filePath || "");
  return (
    /\/uploads\//i.test(fp) ||
    fp.includes("/api/patients/uploads") ||
    /localhost:\d+\/api\/patients\/uploads/i.test(fp)
  );
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI missing in .env");
    process.exit(1);
  }
  const apply = process.env.APPLY_LEGACY_REPORT_CLEANUP === "1";

  await mongoose.connect(uri);
  const patients = await Patient.find({});

  let wouldRemove = 0;
  for (const p of patients) {
    const legacy = (p.reports || []).filter((r) => isLegacyDiskUploadPath(r.filePath));
    if (!legacy.length) continue;
    wouldRemove += legacy.length;
    console.log(
      `userId=${p.userId} email=${p.email || ""} — ${legacy.length} legacy disk report(s):`,
      legacy.map((r) => ({ _id: String(r._id), fileName: r.fileName, filePath: r.filePath }))
    );
    if (apply) {
      p.reports = (p.reports || []).filter((r) => !isLegacyDiskUploadPath(r.filePath));
      await p.save();
    }
  }

  if (wouldRemove === 0) {
    console.log("No legacy /uploads/ report rows found.");
  } else if (!apply) {
    console.log(
      `\nDRY RUN: ${wouldRemove} report row(s) would be removed from Atlas.\n` +
        "Re-upload files in the app (with Cloudinary configured) after cleanup.\n" +
        "To apply: APPLY_LEGACY_REPORT_CLEANUP=1 node scripts/remove-legacy-disk-reports.js"
    );
  } else {
    console.log(`\nRemoved ${wouldRemove} legacy report row(s) from Atlas.`);
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
