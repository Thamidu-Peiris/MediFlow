const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/user.model");
const { generateToken } = require("../services/auth.service");

exports.register = async (req, res) => {
  try {
    const { name, email, password, role = "patient" } = req.body;
    const normalizedRole = role.toLowerCase();

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email and password are required" });
    }
    if (!["patient", "doctor"].includes(normalizedRole)) {
      return res
        .status(400)
        .json({ message: "Only patient and doctor self-registration is allowed" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: normalizedRole,
      isDoctorVerified: normalizedRole === "doctor" ? false : true
    });

    const token = generateToken({
      sub: user._id.toString(),
      email: user.email,
      role: user.role
    });

    return res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to register user" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken({
      sub: user._id.toString(),
      email: user.email,
      role: user.role
    });

    return res.status(200).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to login" });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.sub).select("_id name email role createdAt");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch user details" });
  }
};

exports.logout = async (req, res) => {
  return res.status(200).json({ message: "Logged out successfully" });
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(200).json({ message: "If the email exists, a reset link has been sent" });
    }

    const token = crypto.randomBytes(24).toString("hex");
    const resetTokenHash = crypto.createHash("sha256").update(token).digest("hex");
    user.resetTokenHash = resetTokenHash;
    user.resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    return res.status(200).json({
      message: "Reset link generated",
      resetToken: token
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to process forgot password request" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: "token and password are required" });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetTokenHash: tokenHash,
      resetTokenExpiresAt: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    user.resetTokenHash = null;
    user.resetTokenExpiresAt = null;
    await user.save();

    return res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to reset password" });
  }
};

exports.bootstrapAdmin = async (req, res) => {
  try {
    const { name, email, password, bootstrapKey } = req.body;
    if (!name || !email || !password || !bootstrapKey) {
      return res.status(400).json({ message: "name, email, password and bootstrapKey are required" });
    }
    if (bootstrapKey !== process.env.ADMIN_BOOTSTRAP_KEY) {
      return res.status(403).json({ message: "Invalid bootstrap key" });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: "admin",
      isDoctorVerified: true
    });

    return res.status(201).json({
      message: "Admin account created",
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create admin account" });
  }
};

exports.adminOverview = async (req, res) => {
  try {
    const [totalUsers, totalPatients, totalDoctors, totalAdmins, verifiedDoctors] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: "patient" }),
      User.countDocuments({ role: "doctor" }),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ role: "doctor", isDoctorVerified: true })
    ]);

    return res.status(200).json({
      metrics: {
        totalUsers,
        totalPatients,
        totalDoctors,
        totalAdmins,
        verifiedDoctors,
        pendingDoctorVerifications: Math.max(totalDoctors - verifiedDoctors, 0),
        financialTransactionsToday: 0,
        grossRevenueLkr: 0
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load admin overview" });
  }
};

exports.listUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select("_id name email role isDoctorVerified createdAt")
      .sort({ createdAt: -1 });
    return res.status(200).json({ users });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch users" });
  }
};

exports.verifyDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const { verified = true } = req.body;
    const user = await User.findOneAndUpdate(
      { _id: id, role: "doctor" },
      { $set: { isDoctorVerified: Boolean(verified) } },
      { new: true }
    ).select("_id name email role isDoctorVerified");

    if (!user) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update doctor verification" });
  }
};
