const jwt = require("jsonwebtoken");

const verifyAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Missing or invalid authorization header" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "change_this_secret");
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const requireDoctorRole = (req, res, next) => {
  if (req.user.role !== "doctor" && req.user.role !== "admin") {
    return res.status(403).json({ message: "Only doctor/admin can access this endpoint" });
  }
  return next();
};

module.exports = { verifyAuth, requireDoctorRole };
