const mlBridge = require("./mlBridge.service");

const fallbackPredictNext = (records) => {
  if (!records || !records.length) return null;

  const totalWater = records.reduce((sum, r) => sum + (Number(r.water) || 0), 0);
  const totalEnergy = records.reduce((sum, r) => sum + (Number(r.energy) || 0), 0);
  const avgWater = totalWater / records.length;
  const avgEnergy = totalEnergy / records.length;

  const linearPredict = (values) => {
    if (!values || values.length < 2) return null;

    const times = values.map((v) => {
      const t = v.timestamp ? Number(new Date(v.timestamp)) : null;
      return Number.isFinite(t) ? t : null;
    });

    if (times.some((t) => t == null)) return null;

    const t0 = times[0];
    const xs = times.map((t) => t - t0);
    const ys = values.map((v) => Number(v.value || v));

    const n = xs.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    for (let i = 0; i < n; i++) {
      const x = xs[i];
      const y = ys[i];
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }

    const denom = n * sumXX - sumX * sumX;
    const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    const lastX = xs[xs.length - 1];
    const oneHour = 1000 * 60 * 60;
    const oneDay = oneHour * 24;

    const predictAt = (delta) => Math.round(intercept + slope * (lastX + delta));

    return {
      nextHour: predictAt(oneHour),
      nextDay: predictAt(oneDay),
    };
  };

  const waterSeries = records.map((r) => ({ timestamp: r.timestamp, value: Number(r.water) || 0 }));
  const energySeries = records.map((r) => ({ timestamp: r.timestamp, value: Number(r.energy) || 0 }));
  const waterTrend = linearPredict(waterSeries);
  const energyTrend = linearPredict(energySeries);

  const HOURS_IN_WEEK = 24 * 7;
  const seasonalEnergy = new Array(HOURS_IN_WEEK).fill(0).map(() => ({ sum: 0, count: 0 }));
  const seasonalWater = new Array(HOURS_IN_WEEK).fill(0).map(() => ({ sum: 0, count: 0 }));

  const getHourOfWeek = (ts) => {
    const d = new Date(ts);
    return d.getDay() * 24 + d.getHours();
  };

  records.forEach((r) => {
    const t = r.timestamp ? new Date(r.timestamp) : null;
    if (!t || isNaN(t.getTime())) return;
    const idx = getHourOfWeek(t);
    seasonalEnergy[idx].sum += Number(r.energy) || 0;
    seasonalEnergy[idx].count += 1;
    seasonalWater[idx].sum += Number(r.water) || 0;
    seasonalWater[idx].count += 1;
  });

  const seasonalEnergyMean = seasonalEnergy.map((b) => (b.count ? b.sum / b.count : null));
  const seasonalWaterMean = seasonalWater.map((b) => (b.count ? b.sum / b.count : null));

  const energyResiduals = energySeries
    .map((pt) => {
      const t = new Date(pt.timestamp);
      const idx = getHourOfWeek(t);
      const seasonal = seasonalEnergyMean[idx] != null ? seasonalEnergyMean[idx] : avgEnergy;
      return pt.value - seasonal;
    })
    .filter((v) => Number.isFinite(v));

  const stddev = (arr) => {
    if (!arr.length) return 0;
    const m = arr.reduce((s, x) => s + x, 0) / arr.length;
    const v = arr.reduce((s, x) => s + (x - m) * (x - m), 0) / arr.length;
    return Math.sqrt(v);
  };

  const energyStd = Math.round(stddev(energyResiduals));

  const applySeasonal = (baseValue, targetTs, seasonalMeanArray, overallMean) => {
    if (!targetTs) return Math.round(baseValue);
    const idx = getHourOfWeek(new Date(targetTs));
    const seasonal = seasonalMeanArray[idx] != null ? seasonalMeanArray[idx] : overallMean;
    return Math.round(baseValue + (seasonal - overallMean));
  };

  const lastTs = records[0] && records[0].timestamp ? new Date(records[0].timestamp).getTime() : Date.now();
  const oneHour = 1000 * 60 * 60;
  const oneDay = oneHour * 24;
  const targetHourTs = lastTs + oneHour;
  const targetDayTs = lastTs + oneDay;

  const energyNextHourBase = energyTrend ? energyTrend.nextHour : avgEnergy;
  const energyNextDayBase = energyTrend ? energyTrend.nextDay : avgEnergy;
  const predictedEnergyNextHour = applySeasonal(energyNextHourBase, targetHourTs, seasonalEnergyMean, avgEnergy);
  const predictedEnergyNextDay = applySeasonal(energyNextDayBase, targetDayTs, seasonalEnergyMean, avgEnergy);
  const ci95 = Math.round(1.96 * energyStd);

  return {
    predictedWaterAvg: Math.round(avgWater),
    predictedEnergyAvg: Math.round(avgEnergy),
    predictedWaterNextHour: waterTrend
      ? applySeasonal(waterTrend.nextHour, targetHourTs, seasonalWaterMean, avgWater)
      : Math.round(avgWater),
    predictedEnergyNextHour,
    predictedWaterNextDay: waterTrend
      ? applySeasonal(waterTrend.nextDay, targetDayTs, seasonalWaterMean, avgWater)
      : Math.round(avgWater),
    predictedEnergyNextDay,
    predictedEnergyStdDev: energyStd,
    predictedEnergyCI95: { low: predictedEnergyNextHour - ci95, high: predictedEnergyNextHour + ci95 },
  };
};

exports.predictNext = async (records) => {
  const simplified = Array.isArray(records)
    ? records.map((r) => ({
        timestamp: r.timestamp || r.createdAt || null,
        water: Number(r.water) || 0,
        energy: Number(r.energy) || 0,
      }))
    : [];

  try {
    const remote = await mlBridge.postJson("/predict", { records: simplified });
    if (remote?.prediction) return remote.prediction;
    if (remote?.predictions) return remote.predictions;
  } catch (err) {
    console.error("Python ML prediction unavailable, using local fallback:", err.message || err);
  }

  return fallbackPredictNext(records);
};
