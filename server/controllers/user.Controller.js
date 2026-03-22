const User = require("../models/User");

// ✅ GET PROFILE
exports.getProfile = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ success: false, msg: "Unauthorized" });
    }

    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    return res.json({
      success: true,
      user,
    });

  } catch (err) {
    console.error("❌ Get Profile Error:", err);
    return res.status(500).json({
      success: false,
      msg: "Failed to fetch profile",
    });
  }
};


// ✅ GET USER STATS
exports.getUserStats = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ success: false, msg: "Unauthorized" });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    // ⚡ TEMP STATIC (can connect with Data later)
    return res.json({
      success: true,
      totalEnergy: 500,
      totalWater: 2000,
      score: 75,
      avgEnergy: 100,
      avgWater: 400,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        building: user.building,
        role: user.role,
      },
    });

  } catch (err) {
    console.error("❌ Stats Error:", err);
    return res.status(500).json({
      success: false,
      msg: "Failed to fetch stats",
    });
  }
};


// ✅ UPDATE PROFILE
exports.updateProfile = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ success: false, msg: "Unauthorized" });
    }

    const { name, building } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    // ✅ Safe updates
    if (typeof name === "string" && name.trim()) {
      user.name = name.trim();
    }

    if (typeof building === "string" && building.trim()) {
      user.building = building.trim();
    }

    await user.save();

    return res.json({
      success: true,
      msg: "Profile updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        building: user.building,
        role: user.role,
      },
    });

  } catch (err) {
    console.error("❌ Update Profile Error:", err);
    return res.status(500).json({
      success: false,
      msg: "Failed to update profile",
    });
  }
};