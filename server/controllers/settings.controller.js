const Settings = require("../models/UserSettings");
const {
  DEFAULT_USER_SETTINGS,
  normalizeUserSettings,
  sanitizeSettingsPayload,
} = require("../services/userSettings.service");

exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne({ user: req.user._id });

    if (!settings) {
      settings = await Settings.create({ user: req.user._id, ...DEFAULT_USER_SETTINGS });
    }

    const payload = settings.toObject();
    return res.json({
      ...payload,
      ...normalizeUserSettings(payload),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "Error fetching settings" });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const existing = await Settings.findOne({ user: req.user._id }).lean();
    const payload = sanitizeSettingsPayload(req.body || {}, existing || DEFAULT_USER_SETTINGS);

    const settings = await Settings.findOneAndUpdate(
      { user: req.user._id },
      { $set: payload, $setOnInsert: { user: req.user._id } },
      { upsert: true, returnDocument: "after" }
    );

    const response = settings.toObject();
    return res.json({
      ...response,
      ...normalizeUserSettings(response),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "Error saving settings" });
  }
};

exports.deleteSettings = async (req, res) => {
  try {
    await Settings.findOneAndDelete({ user: req.user._id });

    const defaults = await Settings.create({ user: req.user._id, ...DEFAULT_USER_SETTINGS });
    const payload = defaults.toObject();

    return res.json({
      success: true,
      settings: {
        ...payload,
        ...normalizeUserSettings(payload),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "Error resetting settings" });
  }
};
