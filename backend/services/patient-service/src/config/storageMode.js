const cloudinaryCfg = require("./cloudinary");

/** New report/avatar uploads use Cloudinary only when env is set; otherwise uploads are disabled. */
function preferredUploadEngine() {
  if (cloudinaryCfg.isConfigured()) return "cloudinary";
  return "none";
}

module.exports = { preferredUploadEngine };
