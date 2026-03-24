const Patient = require("../models/patient.model");

exports.upsertProfile = async (req, res) => {
  try {
    const { fullName, phone = "", dob = "", gender = "", address = "", medicalHistory = [] } = req.body;

    if (!fullName) {
      return res.status(400).json({ message: "fullName is required" });
    }

    const patient = await Patient.findOneAndUpdate(
      { userId: req.user.sub },
      {
        $set: {
          userId: req.user.sub,
          fullName,
          phone,
          dob,
          gender,
          address,
          medicalHistory
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({ patient });
  } catch (error) {
    return res.status(500).json({ message: "Failed to save profile" });
  }
};

exports.getMyProfile = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user.sub });
    if (!patient) {
      return res.status(404).json({ message: "Profile not found" });
    }
    return res.status(200).json({ patient });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch profile" });
  }
};

exports.uploadReport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No report file uploaded" });
    }

    const patient = await Patient.findOneAndUpdate(
      { userId: req.user.sub },
      {
        $push: {
          reports: {
            fileName: req.file.originalname,
            filePath: `/api/patients/uploads/${req.file.filename}`
          }
        }
      },
      { new: true }
    );

    if (!patient) {
      return res.status(404).json({ message: "Create profile before uploading reports" });
    }

    return res.status(201).json({ reports: patient.reports });
  } catch (error) {
    return res.status(500).json({ message: "Failed to upload report" });
  }
};

exports.listReports = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user.sub }).select("reports");
    if (!patient) {
      return res.status(404).json({ message: "Profile not found" });
    }
    return res.status(200).json({ reports: patient.reports || [] });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch reports" });
  }
};
