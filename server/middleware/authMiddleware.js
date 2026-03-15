const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async (req, res, next) => {

 try {

  const authHeader = req.headers.authorization;

  if (!authHeader)
   return res.status(401).json({ msg: "No token provided" });

  const token = authHeader.split(" ")[1];

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const user = await User.findById(decoded.id).select("-password");

  if (!user)
   return res.status(401).json({ msg: "Invalid token user" });

  req.user = user;

  next();

 } catch (err) {

  return res.status(401).json({ msg: "Token invalid or expired" });

 }

};