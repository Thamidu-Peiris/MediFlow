const jwt = require("jsonwebtoken");
const config = require("../config");

exports.generateToken = (payload) => {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: "7d" });
};
