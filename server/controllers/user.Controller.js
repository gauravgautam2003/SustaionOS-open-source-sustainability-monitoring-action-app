const User = require("../models/User");

// ✅ GET USER STATS
exports.getUserStats = async (req, res) => {
  try {
    const user = await User.findById(req.user._id); // ✅ FIX

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json({
      totalEnergy: 500,
      totalWater: 2000,
      score: 75,
      name: user.name,
      email: user.email, // ✅ add this
      building: user.building,
      role: user.role,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// ✅ UPDATE PROFILE
exports.updateProfile = async (req, res) => {
  try {
    const { name, building } = req.body;

    const user = await User.findById(req.user._id); // ✅ FIX

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // ✅ update only if provided
    if (name !== undefined) user.name = name;
    if (building !== undefined) user.building = building;

    await user.save();

    res.json({
      success: true, // ✅ important
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        building: user.building,
        role: user.role,
      },
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};