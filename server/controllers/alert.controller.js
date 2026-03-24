const Alert = require("../models/Alert");

exports.getAlerts = async (req, res) => {
	try {
		if (!req.user?._id) return res.status(401).json({ success: false, msg: "Unauthorized" });

		const alerts = await Alert.find({ userId: req.user._id }).sort({ time: -1 });
		return res.json(alerts);
	} catch (err) {
		console.error("Get Alerts Error:", err);
		return res.status(500).json({ success: false, msg: "Server Error" });
	}
};