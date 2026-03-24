exports.detect = (water, energy, history = []) => {
    // If we have history, compute z-score for both metrics
    try {
        const safeNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
        const w = safeNum(water);
        const e = safeNum(energy);

        if (Array.isArray(history) && history.length >= 5) {
            const waterVals = history.map((r) => safeNum(r.water));
            const energyVals = history.map((r) => safeNum(r.energy));

            const mean = (arr) => arr.reduce((s, x) => s + x, 0) / arr.length;
            const std = (arr, m) => {
                const v = arr.reduce((s, x) => s + Math.pow(x - m, 2), 0) / arr.length;
                return Math.sqrt(v);
            };

            const wMean = mean(waterVals);
            const eMean = mean(energyVals);
            const wStd = std(waterVals, wMean) || 1;
            const eStd = std(energyVals, eMean) || 1;

            const wZ = (w - wMean) / wStd;
            const eZ = (e - eMean) / eStd;

            // choose the stronger anomaly
            if (Math.abs(wZ) > Math.abs(eZ) && Math.abs(wZ) >= 2) {
                return { status: true, reason: "Water Spike", severity: Math.abs(wZ) >= 3 ? "high" : "medium", score: Math.round(wZ * 100) / 100 };
            }

            if (Math.abs(eZ) > Math.abs(wZ) && Math.abs(eZ) >= 2) {
                return { status: true, reason: "Energy Spike", severity: Math.abs(eZ) >= 3 ? "high" : "medium", score: Math.round(eZ * 100) / 100 };
            }
        }

        // Fallback thresholds (existing behaviour)
        if (w > 300) return { status: true, reason: "Water Spike", severity: "high", score: null };
        if (e > 200) return { status: true, reason: "Energy Spike", severity: "medium", score: null };

        return { status: false, score: 0 };
    } catch (err) {
        console.error("Detection Service Error:", err);
        return { status: false };
    }
};