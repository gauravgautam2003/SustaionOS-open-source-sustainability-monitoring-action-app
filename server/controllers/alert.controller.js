const Alert = require("../models/Alert");
const {
  applyIncidentUpdate,
  enrichAlertPayload,
  sortIncidentQueue,
} = require("../services/incidentWorkflow.service");

exports.getAlerts = async (req, res) => {
	try {
		if (!req.user?._id) return res.status(401).json({ success: false, msg: "Unauthorized" });

		const alerts = await Alert.find({ userId: req.user._id }).sort({ time: -1 });
		return res.json(sortIncidentQueue(alerts.map((alert) => enrichAlertPayload(alert))));
	} catch (err) {
		console.error("Get Alerts Error:", err);
		return res.status(500).json({ success: false, msg: "Server Error" });
	}
};

exports.updateAlert = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ success: false, msg: "Unauthorized" });

    const { id } = req.params;
    const {
      status,
      rootCause,
      recommendedAction,
      estimatedLoss,
      ownerName,
      ownerTeam,
      slaMinutes,
      escalate,
      escalationReason,
      assignToSelf,
    } = req.body || {};

    const alert = await Alert.findOne({ _id: id, userId: req.user._id });
    if (!alert) return res.status(404).json({ success: false, msg: "Alert not found" });

    if (typeof status === "string") {
      const normalized = status.toUpperCase();
      const allowed = ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED"];
      if (!allowed.includes(normalized)) {
        return res.status(400).json({ success: false, msg: "Invalid status" });
      }
    }

    applyIncidentUpdate(
      alert,
      {
        status,
        rootCause,
        recommendedAction,
        estimatedLoss,
        ownerName,
        ownerTeam,
        slaMinutes,
        escalate,
        escalationReason,
        assignToSelf,
      },
      req.user
    );

    await alert.save();
    return res.json({ success: true, alert: enrichAlertPayload(alert) });
  } catch (err) {
    console.error("Update Alert Error:", err);
    return res.status(500).json({ success: false, msg: "Server Error" });
  }
};
