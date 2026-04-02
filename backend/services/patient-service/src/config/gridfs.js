const mongoose = require("mongoose");
const { GridFSBucket, ObjectId } = require("mongodb");

const BUCKET = "patientFiles";

function getBucket() {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("MongoDB is not connected");
  }
  return new GridFSBucket(db, { bucketName: BUCKET });
}

/**
 * Delete a legacy GridFS object (cleanup when user deletes a report/account).
 * New uploads do not write to GridFS — files live on Cloudinary only.
 */
async function deleteFile(fileIdStr) {
  if (!fileIdStr || !ObjectId.isValid(fileIdStr)) return;
  try {
    const bucket = getBucket();
    await bucket.delete(new ObjectId(fileIdStr));
  } catch (e) {
    if (e.code !== "ENOENT" && e.code !== 404) {
      console.warn("GridFS delete (legacy cleanup):", e.message);
    }
  }
}

module.exports = {
  BUCKET,
  deleteFile
};
