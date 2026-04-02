const cloudinary = require("cloudinary").v2;

function trimEnv(v) {
  if (v == null) return "";
  return String(v).trim().replace(/^["']|["']$/g, "");
}

function readEnvTriplet() {
  return {
    cloud_name: trimEnv(process.env.CLOUDINARY_CLOUD_NAME),
    api_key: trimEnv(process.env.CLOUDINARY_API_KEY),
    api_secret: trimEnv(process.env.CLOUDINARY_API_SECRET)
  };
}

function configure() {
  const { cloud_name, api_key, api_secret } = readEnvTriplet();
  if (!cloud_name || !api_key || !api_secret) {
    return false;
  }
  cloudinary.config({
    cloud_name,
    api_key,
    api_secret,
    secure: true
  });
  return true;
}

function isConfigured() {
  const { cloud_name, api_key, api_secret } = readEnvTriplet();
  return Boolean(cloud_name && api_key && api_secret);
}

/**
 * Verifies API key/secret against Cloudinary (GET /ping).
 * @returns {Promise<{ status: string }>}
 */
function pingApi() {
  return new Promise((resolve, reject) => {
    cloudinary.api.ping((err, result) => {
      if (err != null) reject(err);
      else resolve(result);
    });
  });
}

function uploadBuffer(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err != null) {
        const msg =
          err.message ||
          err.error?.message ||
          (typeof err === "string" ? err : "Cloudinary upload failed");
        const e = new Error(msg);
        if (err.http_code != null) e.http_code = err.http_code;
        reject(e);
        return;
      }
      if (result?.error) {
        const e = new Error(result.error.message || "Cloudinary upload failed");
        if (result.error.http_code != null) e.http_code = result.error.http_code;
        reject(e);
        return;
      }
      resolve(result);
    });
    stream.on("error", (streamErr) => {
      reject(streamErr);
    });
    stream.end(buffer);
  });
}

module.exports = {
  cloudinary,
  configure,
  isConfigured,
  uploadBuffer,
  pingApi,
  readEnvTriplet
};
