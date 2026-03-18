const User = require("../models/User");

// GET user stats
exports.getUserStats = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // For now dummy stats; later link with actual energy/water data
    res.json({
      totalEnergy: 500,
      totalWater: 2000,
      score: 75,
      name: user.name,
      building: user.building,
      role: user.role,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// PATCH update profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, building } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    user.name = name || user.name;
    user.building = building || user.building;

    await user.save();
    res.json({ msg: "Profile updated successfully", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};