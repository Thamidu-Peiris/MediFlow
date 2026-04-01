const jwt = require("jsonwebtoken");

const verifyAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  console.log("verifyAuth authHeader:", authHeader);
  console.log("verifyAuth scheme:", scheme);
  console.log("verifyAuth token:", token);

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Missing or invalid authorization header" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "change_this_secret");
    console.log("JWT payload:", payload);
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const requirePatientRole = (req, res, next) => {
  if (req.user.role !== "patient" && req.user.role !== "admin") {
    return res.status(403).json({ message: "Only patient/admin can access this endpoint" });
  }
  return next();
};

module.exports = { verifyAuth, requirePatientRole };
