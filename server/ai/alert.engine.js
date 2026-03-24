const alertService = require("../services/alert.service");

exports.checkAndCreateAlert = async (latest, avgWater, avgEnergy, userId) => {
    const created = [];

    if (!latest || !userId) return created;

    // Map severity to schema enum values
    const mapSeverity = (sev) => {
        if (!sev) return "LOW";
        const s = sev.toString().toUpperCase();
        if (s === "HIGH") return "HIGH";
        if (s === "MEDIUM") return "MEDIUM";
        return "LOW";
    };

    try {
        // Water alert
        if (typeof latest.water === "number" && typeof avgWater === "number" && latest.water > avgWater * 1.3) {
            const sev = latest.water > avgWater * 1.6 ? "HIGH" : "MEDIUM";
            const a = await alertService.createAlert({
                userId,
                building: latest.building || "Unknown",
                message: "🚨 Water spike detected! Possible leakage.",
                severity: mapSeverity(sev)
            });
            if (a) created.push(a);
        }

        // Energy alert
        if (typeof latest.energy === "number" && typeof avgEnergy === "number" && latest.energy > avgEnergy * 1.3) {
            const sev = latest.energy > avgEnergy * 1.6 ? "HIGH" : "MEDIUM";
            const a = await alertService.createAlert({
                userId,
                building: latest.building || "Unknown",
                message: "⚡ Energy spike detected! High load usage.",
                severity: mapSeverity(sev)
            });
            if (a) created.push(a);
        }
    } catch (err) {
        console.error("Alert Engine Error:", err?.message || err);
    }

    return created;
};