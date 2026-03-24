from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse
import json
import math
from datetime import datetime, timezone

HOST = "127.0.0.1"
PORT = 8000
MODEL_NAME = "sustainos-ensemble-v2"
MODEL_VERSION = "2.0.0"


def safe_num(value):
    try:
        n = float(value)
        return n if math.isfinite(n) else 0.0
    except Exception:
        return 0.0


def mean(values):
    values = [safe_num(v) for v in values]
    return sum(values) / len(values) if values else 0.0


def stddev(values):
    values = [safe_num(v) for v in values]
    if not values:
        return 0.0
    m = mean(values)
    return math.sqrt(sum((v - m) ** 2 for v in values) / len(values))


def recency_weights(length):
    if length <= 0:
        return []
    if length == 1:
        return [1.0]
    return [0.65 ** (length - 1 - idx) for idx in range(length)]


def weighted_mean(values):
    clean = [safe_num(v) for v in values]
    if not clean:
        return 0.0
    weights = recency_weights(len(clean))
    total_weight = sum(weights) or 1.0
    return sum(v * w for v, w in zip(clean, weights)) / total_weight


def ema(values, alpha=0.38):
    clean = [safe_num(v) for v in values]
    if not clean:
        return 0.0
    value = clean[0]
    for point in clean[1:]:
        value = alpha * point + (1 - alpha) * value
    return value


def hour_of_week(ts):
    if ts is None:
        return None
    try:
        dt = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
    except Exception:
        return None
    return dt.weekday() * 24 + dt.hour


def is_off_hours(ts):
    if ts is None:
        return False
    try:
        dt = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
    except Exception:
        return False
    return dt.weekday() >= 5 or dt.hour < 7 or dt.hour >= 20


def safe_percent(numerator, denominator):
    if denominator in (None, 0):
        return None
    return (numerator / denominator) * 100.0


def trend_delta(values):
    clean = [safe_num(v) for v in values]
    if len(clean) < 2:
        return 0.0
    midpoint = max(1, len(clean) // 2)
    first_mean = mean(clean[:midpoint])
    last_mean = mean(clean[midpoint:])
    if first_mean == 0:
        return 0.0
    return ((last_mean - first_mean) / first_mean) * 100.0


def linear_predict(series):
    if len(series) < 2:
        return None

    times = []
    values = []
    for item in series:
        ts = item.get("timestamp")
        if ts is None:
            return None
        try:
            dt = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
            times.append(dt.timestamp() * 1000.0)
            values.append(safe_num(item.get("value")))
        except Exception:
            return None

    t0 = times[0]
    xs = [t - t0 for t in times]
    ys = values
    n = len(xs)
    sum_x = sum(xs)
    sum_y = sum(ys)
    sum_xy = sum(x * y for x, y in zip(xs, ys))
    sum_xx = sum(x * x for x in xs)
    denom = n * sum_xx - sum_x * sum_x
    slope = 0 if denom == 0 else (n * sum_xy - sum_x * sum_y) / denom
    intercept = (sum_y - slope * sum_x) / n
    last_x = xs[-1]
    one_hour = 1000 * 60 * 60
    one_day = one_hour * 24

    def predict_at(delta):
        return round(intercept + slope * (last_x + delta))

    return {"nextHour": predict_at(one_hour), "nextDay": predict_at(one_day), "slope": slope}


def window_stats(values):
    clean = [safe_num(v) for v in values]
    if not clean:
        return {"mean": 0.0, "weightedMean": 0.0, "ema": 0.0, "std": 0.0, "min": 0.0, "max": 0.0, "cv": 0.0}
    m = mean(clean)
    sd = stddev(clean)
    return {
        "mean": round(m, 2),
        "weightedMean": round(weighted_mean(clean), 2),
        "ema": round(ema(clean), 2),
        "std": round(sd, 2),
        "min": round(min(clean), 2),
        "max": round(max(clean), 2),
        "cv": round(sd / m, 3) if m else 0.0,
    }


def top_location(records, metric):
    by_location = {}
    for r in records:
        location = (r.get("location") or "Unknown").strip() or "Unknown"
        by_location.setdefault(location, 0.0)
        by_location[location] += safe_num(r.get(metric))
    if not by_location:
        return {"location": "Unknown", "value": 0}
    location, value = max(by_location.items(), key=lambda item: item[1])
    return {"location": location, "value": round(value)}


def build_signal_breakdown(records):
    if not records:
        return {
            "energyTrend": 0.0,
            "waterTrend": 0.0,
            "volatility": 0.0,
            "offHoursRatio": 0.0,
            "usageConsistency": 100.0,
        }

    energy_values = [safe_num(r.get("energy")) for r in records]
    water_values = [safe_num(r.get("water")) for r in records]
    all_values = energy_values + water_values
    off_hours_count = sum(1 for r in records if is_off_hours(r.get("timestamp")))
    off_hours_ratio = safe_percent(off_hours_count, len(records)) or 0.0
    energy_trend = trend_delta(energy_values)
    water_trend = trend_delta(water_values)
    volatility = stddev(all_values)
    usage_consistency = max(
        0.0,
        100.0 - min(70.0, abs(energy_trend) * 0.35 + abs(water_trend) * 0.35 + volatility * 0.2 + off_hours_ratio * 0.6),
    )

    return {
        "energyTrend": round(energy_trend, 2),
        "waterTrend": round(water_trend, 2),
        "volatility": round(volatility, 2),
        "offHoursRatio": round(off_hours_ratio, 2),
        "usageConsistency": round(usage_consistency, 2),
    }


def classify_root_cause(latest, stats, breakdown, anomalies):
    latest_energy = safe_num(latest.get("energy"))
    latest_water = safe_num(latest.get("water"))
    energy_mean = stats["energy"]["mean"]
    water_mean = stats["water"]["mean"]

    if anomalies:
      anomaly_metric = anomalies[0]["metric"]
      if anomaly_metric == "water":
          return "Likely leakage or uncontrolled water draw"
      if anomaly_metric == "energy" and breakdown["offHoursRatio"] > 20:
          return "After-hours energy usage"
      if anomaly_metric == "energy":
          return "Equipment load spike or inefficient appliance cycle"

    if breakdown["offHoursRatio"] > 35 and latest_energy > energy_mean:
        return "After-hours load is driving waste"
    if latest_water > water_mean * 1.2 and latest_energy <= energy_mean * 1.1:
        return "Possible leakage or valve drift"
    if latest_energy > energy_mean * 1.2 and latest_water > water_mean * 1.15:
        return "Occupancy surge or parallel load spike"
    if abs(breakdown["energyTrend"]) > 12 or abs(breakdown["waterTrend"]) > 12:
        return "Directional drift across recent usage window"
    return "Mixed operational drift"


def seasonal_adjust(base_value, target_ts, seasonal_means, overall_mean):
    idx = hour_of_week(target_ts)
    seasonal = seasonal_means[idx] if idx is not None and seasonal_means[idx] is not None else overall_mean
    return round(base_value + (seasonal - overall_mean))


def predict_payload(records):
    if not records:
        return None

    total_water = sum(safe_num(r.get("water")) for r in records)
    total_energy = sum(safe_num(r.get("energy")) for r in records)
    avg_water = total_water / len(records)
    avg_energy = total_energy / len(records)
    stats = {
        "water": window_stats([r.get("water") for r in records]),
        "energy": window_stats([r.get("energy") for r in records]),
    }

    water_series = [{"timestamp": r.get("timestamp"), "value": safe_num(r.get("water"))} for r in records]
    energy_series = [{"timestamp": r.get("timestamp"), "value": safe_num(r.get("energy"))} for r in records]
    water_trend = linear_predict(water_series)
    energy_trend = linear_predict(energy_series)

    hours_in_week = 24 * 7
    seasonal_energy = [{"sum": 0.0, "count": 0} for _ in range(hours_in_week)]
    seasonal_water = [{"sum": 0.0, "count": 0} for _ in range(hours_in_week)]

    for r in records:
        idx = hour_of_week(r.get("timestamp"))
        if idx is None:
            continue
        e = safe_num(r.get("energy"))
        w = safe_num(r.get("water"))
        seasonal_energy[idx]["sum"] += e
        seasonal_energy[idx]["count"] += 1
        seasonal_water[idx]["sum"] += w
        seasonal_water[idx]["count"] += 1

    seasonal_energy_mean = [(b["sum"] / b["count"]) if b["count"] else None for b in seasonal_energy]
    seasonal_water_mean = [(b["sum"] / b["count"]) if b["count"] else None for b in seasonal_water]

    energy_residuals = []
    water_residuals = []
    for pt in energy_series:
        idx = hour_of_week(pt["timestamp"])
        if idx is None:
            continue
        seasonal = seasonal_energy_mean[idx] if seasonal_energy_mean[idx] is not None else avg_energy
        energy_residuals.append(pt["value"] - seasonal)

    for pt in water_series:
        idx = hour_of_week(pt["timestamp"])
        if idx is None:
            continue
        seasonal = seasonal_water_mean[idx] if seasonal_water_mean[idx] is not None else avg_water
        water_residuals.append(pt["value"] - seasonal)

    energy_std = round(stddev(energy_residuals))
    water_std = round(stddev(water_residuals))

    last_ts = records[0].get("timestamp")
    try:
        last_dt = datetime.fromisoformat(str(last_ts).replace("Z", "+00:00"))
    except Exception:
        last_dt = datetime.now(timezone.utc)
    target_hour_ts = int(last_dt.timestamp() * 1000.0) + (1000 * 60 * 60)
    target_day_ts = int(last_dt.timestamp() * 1000.0) + (1000 * 60 * 60 * 24)

    water_ema = round(ema([r.get("water") for r in records]))
    energy_ema = round(ema([r.get("energy") for r in records]))

    energy_next_hour_base = round((energy_trend["nextHour"] * 0.5) + (energy_ema * 0.3) + (avg_energy * 0.2)) if energy_trend else round(avg_energy)
    energy_next_day_base = round((energy_trend["nextDay"] * 0.5) + (energy_ema * 0.3) + (avg_energy * 0.2)) if energy_trend else round(avg_energy)
    water_next_hour_base = round((water_trend["nextHour"] * 0.45) + (water_ema * 0.35) + (avg_water * 0.2)) if water_trend else round(avg_water)
    water_next_day_base = round((water_trend["nextDay"] * 0.45) + (water_ema * 0.35) + (avg_water * 0.2)) if water_trend else round(avg_water)

    predicted_energy_next_hour = seasonal_adjust(energy_next_hour_base, target_hour_ts, seasonal_energy_mean, avg_energy)
    predicted_energy_next_day = seasonal_adjust(energy_next_day_base, target_day_ts, seasonal_energy_mean, avg_energy)
    predicted_water_next_hour = seasonal_adjust(water_next_hour_base, target_hour_ts, seasonal_water_mean, avg_water)
    predicted_water_next_day = seasonal_adjust(water_next_day_base, target_day_ts, seasonal_water_mean, avg_water)

    ci95_energy = round(1.96 * energy_std)
    ci95_water = round(1.96 * water_std)
    confidence = max(
        52,
        min(
            97,
            round(
                70
                + min(15, len(records) * 1.2)
                - min(12, stats["energy"]["cv"] * 18)
                - min(8, stats["water"]["cv"] * 12)
            ),
        ),
    )

    return {
        "model": {
            "name": MODEL_NAME,
            "version": MODEL_VERSION,
            "type": "ensemble-trend-seasonal",
        },
        "predictedWaterAvg": round(avg_water),
        "predictedEnergyAvg": round(avg_energy),
        "predictedWaterNextHour": predicted_water_next_hour,
        "predictedEnergyNextHour": predicted_energy_next_hour,
        "predictedWaterNextDay": predicted_water_next_day,
        "predictedEnergyNextDay": predicted_energy_next_day,
        "predictedEnergyStdDev": energy_std,
        "predictedWaterStdDev": water_std,
        "predictedEnergyCI95": {"low": predicted_energy_next_hour - ci95_energy, "high": predicted_energy_next_hour + ci95_energy},
        "predictedWaterCI95": {"low": predicted_water_next_hour - ci95_water, "high": predicted_water_next_hour + ci95_water},
        "confidence": confidence,
        "signalBreakdown": build_signal_breakdown(records),
    }


def anomaly_payload(water, energy, history):
    w = safe_num(water)
    e = safe_num(energy)
    history = history or []

    if len(history) >= 3:
        water_vals = [safe_num(r.get("water")) for r in history]
        energy_vals = [safe_num(r.get("energy")) for r in history]
        w_mean = mean(water_vals)
        e_mean = mean(energy_vals)
        w_std = stddev(water_vals) or 1.0
        e_std = stddev(energy_vals) or 1.0
        w_z = (w - w_mean) / w_std
        e_z = (e - e_mean) / e_std

        if abs(w_z) > abs(e_z) and abs(w_z) >= 2:
            return {
                "anomaly": True,
                "reason": "Water Spike",
                "severity": "high" if abs(w_z) >= 3 else "medium",
                "score": round(w_z, 2),
                "summary": "Water usage spike",
                "recommendation": "Inspect leakage",
                "priority": "high" if abs(w_z) >= 3 else "medium",
                "rootCause": "Possible leakage or uncontrolled water draw",
                "confidence": 78 if abs(w_z) >= 3 else 66,
            }

        if abs(e_z) > abs(w_z) and abs(e_z) >= 2:
            return {
                "anomaly": True,
                "reason": "Energy Spike",
                "severity": "high" if abs(e_z) >= 3 else "medium",
                "score": round(e_z, 2),
                "summary": "Energy usage spike",
                "recommendation": "Reduce heavy load",
                "priority": "high" if abs(e_z) >= 3 else "medium",
                "rootCause": "Peak load or equipment cycle drift",
                "confidence": 78 if abs(e_z) >= 3 else 66,
            }

    return {
        "anomaly": False,
        "reason": "No anomaly",
        "severity": "low",
        "score": 0,
        "summary": "Normal",
        "recommendation": "No action",
        "priority": "low",
        "rootCause": "Stable operating window",
        "confidence": 62,
    }


def insights_payload(records):
    if not records:
        return {
            "model": {
                "name": MODEL_NAME,
                "version": MODEL_VERSION,
                "type": "ensemble-trend-seasonal",
            },
            "score": 0,
            "riskLevel": "No Data",
            "summary": "No telemetry available",
            "confidence": 0,
            "rootCause": "No telemetry",
            "confidenceReasons": ["Start collecting telemetry"],
            "recommendations": ["Start collecting telemetry"],
            "hotspots": [],
            "forecast": None,
            "anomalies": [],
        }

    prediction = predict_payload(records) or {}
    latest = records[0]
    total_water = sum(safe_num(r.get("water")) for r in records)
    total_energy = sum(safe_num(r.get("energy")) for r in records)
    avg_water = total_water / len(records)
    avg_energy = total_energy / len(records)

    water_values = [safe_num(r.get("water")) for r in records]
    energy_values = [safe_num(r.get("energy")) for r in records]
    water_mean = mean(water_values)
    energy_mean = mean(energy_values)
    water_std = stddev(water_values) or 1.0
    energy_std = stddev(energy_values) or 1.0
    stats = {"water": window_stats(water_values), "energy": window_stats(energy_values)}
    breakdown = prediction.get("signalBreakdown") or build_signal_breakdown(records)

    w_z = (safe_num(latest.get("water")) - water_mean) / water_std
    e_z = (safe_num(latest.get("energy")) - energy_mean) / energy_std

    anomalies = []
    if abs(w_z) >= 2:
        anomalies.append(
            {
                "metric": "water",
                "severity": "high" if abs(w_z) >= 3 else "medium",
                "zScore": round(w_z, 2),
                "message": "Water spike" if w_z > 0 else "Water drop",
            }
        )
    if abs(e_z) >= 2:
        anomalies.append(
            {
                "metric": "energy",
                "severity": "high" if abs(e_z) >= 3 else "medium",
                "zScore": round(e_z, 2),
                "message": "Energy spike" if e_z > 0 else "Energy drop",
            }
        )

    root_cause = classify_root_cause(latest, stats, breakdown, anomalies)

    by_building = {}
    for r in records:
        building = r.get("building") or "Unknown"
        if building not in by_building:
            by_building[building] = {
                "building": building,
                "energy": 0.0,
                "water": 0.0,
                "count": 0,
                "locations": set(),
            }
        by_building[building]["energy"] += safe_num(r.get("energy"))
        by_building[building]["water"] += safe_num(r.get("water"))
        by_building[building]["count"] += 1
        if r.get("location"):
            by_building[building]["locations"].add(r.get("location"))

    ranked = []
    for item in by_building.values():
        total_load = item["energy"] + item["water"]
        ranked.append(
            {
                "building": item["building"],
                "energy": round(item["energy"]),
                "water": round(item["water"]),
                "count": item["count"],
                "locations": sorted(list(item["locations"])),
                "totalLoad": round(total_load),
            }
        )

    ranked.sort(key=lambda x: x["totalLoad"], reverse=True)
    max_load = ranked[0]["totalLoad"] if ranked else 1
    for item in ranked:
        item["efficiency"] = max(15, round(100 - (item["totalLoad"] / max_load) * 70))

    trend_strength = 0
    if len(records) >= 2:
        first = records[-1]
        last = records[0]
        trend_strength = abs(safe_num(last.get("energy")) - safe_num(first.get("energy"))) + abs(safe_num(last.get("water")) - safe_num(first.get("water")))

    score = max(
        0,
        min(
            100,
            round(
                100
                - (avg_energy / 15)
                - (avg_water / 120)
                - (len(anomalies) * 12)
                - (trend_strength / 25)
            ),
        ),
    )

    risk_level = "Low"
    if score < 80:
        risk_level = "Moderate"
    if score < 60:
        risk_level = "High"
    if score < 40:
        risk_level = "Critical"

    confidence = max(50, min(96, 72 + min(20, len(records) * 2) - len(anomalies) * 6))
    confidence = max(confidence, prediction.get("confidence", confidence))

    recommendations = []
    if anomalies:
        recommendations.append("Investigate latest spike source")
    if safe_num(latest.get("energy")) > avg_energy * 1.15:
        recommendations.append("Shift peak energy loads off-peak")
    if safe_num(latest.get("water")) > avg_water * 1.15:
        recommendations.append("Inspect water lines for leakage")
    if not recommendations:
        recommendations.append("Maintain current operations and monitor trends")

    return {
        "model": prediction.get("model") or {
            "name": MODEL_NAME,
            "version": MODEL_VERSION,
            "type": "ensemble-trend-seasonal",
        },
        "score": score,
        "riskLevel": risk_level,
        "summary": f"{risk_level} risk with {len(anomalies)} active anomaly signals",
        "confidence": confidence,
        "rootCause": root_cause,
        "signalBreakdown": breakdown,
        "confidenceReasons": [
            f"Telemetry count: {len(records)}",
            f"Energy volatility: {stats['energy']['std']}",
            f"Water volatility: {stats['water']['std']}",
            f"Off-hours usage: {breakdown['offHoursRatio']}%",
        ],
        "anomalies": anomalies,
        "forecast": prediction,
        "hotspots": ranked[:5],
        "recommendations": recommendations[:4],
        "latest": {
            "building": latest.get("building") or "Unknown",
            "location": latest.get("location") or "",
            "energy": safe_num(latest.get("energy")),
            "water": safe_num(latest.get("water")),
        },
        "whatIf": simulate_payload(records, energy_reduction_pct=10, water_reduction_pct=10, horizon_days=30),
    }


def simulate_payload(records, energy_reduction_pct=10, water_reduction_pct=10, horizon_days=30):
    if not records:
        return {
            "energyReductionPct": energy_reduction_pct,
            "waterReductionPct": water_reduction_pct,
            "horizonDays": horizon_days,
            "projectedSavings": 0,
            "projectedCarbonReduction": 0,
            "projectedScore": 0,
            "riskImprovement": "No data",
            "recommendations": ["Collect telemetry first"],
        }

    total_water = sum(safe_num(r.get("water")) for r in records)
    total_energy = sum(safe_num(r.get("energy")) for r in records)
    avg_water = total_water / len(records)
    avg_energy = total_energy / len(records)
    base_score = max(0, min(100, round(100 - (avg_energy / 15) - (avg_water / 120))))

    energy_saved = total_energy * (safe_num(energy_reduction_pct) / 100.0)
    water_saved = total_water * (safe_num(water_reduction_pct) / 100.0)

    projected_savings = round((energy_saved * 8) + (water_saved * 0.02))
    projected_carbon = round(energy_saved * 0.82)
    projected_score = min(100, round(base_score + (energy_reduction_pct * 0.7) + (water_reduction_pct * 0.5)))

    if projected_score >= 80:
        risk_improvement = "Low"
    elif projected_score >= 60:
        risk_improvement = "Moderate"
    elif projected_score >= 40:
        risk_improvement = "High"
    else:
        risk_improvement = "Critical"

    recommendations = []
    if energy_reduction_pct > 0:
        recommendations.append("Shift high-load devices off-peak")
    if water_reduction_pct > 0:
        recommendations.append("Repair leaks and auto-close valves")
    recommendations.append("Track sensor health before scaling automation")

    return {
        "energyReductionPct": energy_reduction_pct,
        "waterReductionPct": water_reduction_pct,
        "horizonDays": horizon_days,
        "projectedSavings": projected_savings,
        "projectedCarbonReduction": projected_carbon,
        "projectedScore": projected_score,
        "riskImprovement": risk_improvement,
        "recommendations": recommendations[:4],
    }


class Handler(BaseHTTPRequestHandler):
    def _json(self, code, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/health":
            return self._json(200, {"status": "ok", "service": "python-ml", "model": MODEL_NAME, "version": MODEL_VERSION})
        return self._json(404, {"error": "not found"})

    def do_POST(self):
        path = urlparse(self.path).path
        try:
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
            payload = json.loads(raw or "{}")
        except Exception:
            return self._json(400, {"error": "invalid json"})

        if path == "/predict":
            prediction = predict_payload(payload.get("records") or [])
            return self._json(200, {"prediction": prediction})

        if path == "/anomaly":
            result = anomaly_payload(payload.get("water"), payload.get("energy"), payload.get("history") or [])
            return self._json(200, result)

        if path == "/insights":
            result = insights_payload(payload.get("records") or [])
            return self._json(200, result)

        if path == "/simulate":
            result = simulate_payload(
                payload.get("records") or [],
                energy_reduction_pct=safe_num(payload.get("energyReductionPct", 10)),
                water_reduction_pct=safe_num(payload.get("waterReductionPct", 10)),
                horizon_days=int(payload.get("horizonDays", 30) or 30),
            )
            return self._json(200, result)

        return self._json(404, {"error": "not found"})


if __name__ == "__main__":
    print(f"Python ML service running on http://{HOST}:{PORT}")
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    server.serve_forever()
