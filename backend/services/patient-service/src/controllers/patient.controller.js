const Patient = require("../models/patient.model");

exports.upsertProfile = async (req, res) => {
  try {
    const {
      fullName,
      email = "",
      phone = "",
      age = null,
      gender = "",
      address = "",
      medicalHistory = []
    } = req.body;

    if (!fullName) {
      return res.status(400).json({ message: "fullName is required" });
    }

    const patient = await Patient.findOneAndUpdate(
      { userId: req.user.sub },
      {
        $set: {
          userId: req.user.sub,
          fullName,
          email: email.toLowerCase(),
          phone,
          age,
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
            filePath: `/api/patients/uploads/${req.file.filename}`,
            fileType: req.file.mimetype || ""
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

exports.deleteReport = async (req, res) => {
  try {
    const patient = await Patient.findOneAndUpdate(
      { userId: req.user.sub },
      { $pull: { reports: { _id: req.params.id } } },
      { new: true }
    ).select("reports");

    if (!patient) {
      return res.status(404).json({ message: "Profile not found" });
    }

    return res.status(200).json({ reports: patient.reports || [] });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete report" });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const patient = await Patient.findOneAndDelete({ userId: req.user.sub });
    if (!patient) {
      return res.status(404).json({ message: "Profile not found" });
    }
    return res.status(200).json({ message: "Patient account data deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete account" });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user.sub }).select(
      "medicalHistory appointments prescriptions"
    );
    if (!patient) {
      return res.status(404).json({ message: "Profile not found" });
    }
    const diagnoses = (patient.appointments || [])
      .map((item) => item.diagnosis)
      .filter(Boolean);

    return res.status(200).json({
      medicalHistory: patient.medicalHistory || [],
      diagnoses,
      prescriptions: patient.prescriptions || [],
      appointments: patient.appointments || []
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch medical history" });
  }
};

exports.getPrescriptions = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user.sub }).select("prescriptions");
    if (!patient) {
      return res.status(404).json({ message: "Profile not found" });
    }
    return res.status(200).json({ prescriptions: patient.prescriptions || [] });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch prescriptions" });
  }
};

exports.getAppointments = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user.sub }).select("appointments");
    if (!patient) {
      return res.status(404).json({ message: "Profile not found" });
    }
    return res.status(200).json({ appointments: patient.appointments || [] });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch appointments" });
  }
};
