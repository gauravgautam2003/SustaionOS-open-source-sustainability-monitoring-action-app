const User = require("../models/User");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "sustaios_secret_key";

/*
Generate JWT Token
*/
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
};


/*
REGISTER USER
*/
exports.register = async (req, res, next) => {
  try {

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ msg: "All fields required" });
    }

    // check existing user
    const existing = await User.findOne({ email });

    if (existing) {
      return res.status(400).json({ msg: "User already exists" });
    }

    // create user
    const user = await User.create({
      name,
      email,
      password
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        notifications: user.notifications,
        theme: user.theme
      }
    });

  } catch (err) {
    next(err);
  }
};


/*
LOGIN USER
*/
exports.login = async (req, res, next) => {
  try {

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ msg: "Email and password required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ msg: "Invalid credentials" });
    }

    const match = await user.comparePassword(password);

    if (!match) {
      return res.status(401).json({ msg: "Invalid credentials" });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        notifications: user.notifications,
        theme: user.theme
      }
    });

  } catch (err) {
    next(err);
  }
};