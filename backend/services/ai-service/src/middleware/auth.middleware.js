const jwt = require("jsonwebtoken");

function verifyAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Missing or invalid authorization header" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "change_this_secret");
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function requirePatientOrAdmin(req, res, next) {
  const role = req.user?.role;
  if (role !== "patient" && role !== "admin") {
    return res.status(403).json({ message: "Only patient or admin can use this service" });
  }
  return next();
}

module.exports = { verifyAuth, requirePatientOrAdmin };
