const Settings = require("../models/UserSettings");

// ✅ GET
exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne({ user: req.user._id });

    if (!settings) {
      settings = await Settings.create({ user: req.user._id });
    }

    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error fetching settings" });
  }
};

// ✅ PUT
exports.updateSettings = async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      { user: req.user._id },
      req.body,
      { new: true, upsert: true }
    );

    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error saving settings" });
  }
};