from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse
import json
import math

HOST = "127.0.0.1"
PORT = 8000


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


def hour_of_week(ts):
    from datetime import datetime

    if ts is None:
        return None
    try:
        dt = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
    except Exception:
        return None
    return dt.weekday() * 24 + dt.hour


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
          from datetime import datetime
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

    return {"nextHour": predict_at(one_hour), "nextDay": predict_at(one_day)}


def apply_seasonal(base_value, target_ts, seasonal_means, overall_mean):
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

    seasonal_energy_mean = [
        (b["sum"] / b["count"]) if b["count"] else None for b in seasonal_energy
    ]
    seasonal_water_mean = [
        (b["sum"] / b["count"]) if b["count"] else None for b in seasonal_water
    ]

    energy_residuals = []
    for pt in energy_series:
        idx = hour_of_week(pt["timestamp"])
        if idx is None:
          continue
        seasonal = seasonal_energy_mean[idx] if seasonal_energy_mean[idx] is not None else avg_energy
        energy_residuals.append(pt["value"] - seasonal)

    energy_std = round(stddev(energy_residuals))
    last_ts = records[0].get("timestamp")
    from datetime import datetime, timezone
    try:
        last_dt = datetime.fromisoformat(str(last_ts).replace("Z", "+00:00"))
    except Exception:
        last_dt = datetime.now(timezone.utc)
    target_hour_ts = (last_dt.timestamp() * 1000.0) + (1000 * 60 * 60)
    target_day_ts = (last_dt.timestamp() * 1000.0) + (1000 * 60 * 60 * 24)

    energy_next_hour_base = energy_trend["nextHour"] if energy_trend else avg_energy
    energy_next_day_base = energy_trend["nextDay"] if energy_trend else avg_energy

    predicted_energy_next_hour = apply_seasonal(energy_next_hour_base, target_hour_ts, seasonal_energy_mean, avg_energy)
    predicted_energy_next_day = apply_seasonal(energy_next_day_base, target_day_ts, seasonal_energy_mean, avg_energy)
    ci95 = round(1.96 * energy_std)

    predicted_water_next_hour = (
        apply_seasonal(water_trend["nextHour"], target_hour_ts, seasonal_water_mean, avg_water)
        if water_trend
        else round(avg_water)
    )
    predicted_water_next_day = (
        apply_seasonal(water_trend["nextDay"], target_day_ts, seasonal_water_mean, avg_water)
        if water_trend
        else round(avg_water)
    )

    return {
        "predictedWaterAvg": round(avg_water),
        "predictedEnergyAvg": round(avg_energy),
        "predictedWaterNextHour": predicted_water_next_hour,
        "predictedEnergyNextHour": predicted_energy_next_hour,
        "predictedWaterNextDay": predicted_water_next_day,
        "predictedEnergyNextDay": predicted_energy_next_day,
        "predictedEnergyStdDev": energy_std,
        "predictedEnergyCI95": {"low": predicted_energy_next_hour - ci95, "high": predicted_energy_next_hour + ci95},
    }


def insights_payload(records):
    if not records:
        return {
            "score": 0,
            "riskLevel": "No Data",
            "summary": "No telemetry available",
            "confidence": 0,
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

    by_building = {}
    for r in records:
        building = r.get("building") or "Unknown"
        if building not in by_building:
            by_building[building] = {"building": building, "energy": 0.0, "water": 0.0, "count": 0, "locations": set()}
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

    trend_energy = prediction.get("predictedEnergyNextDay", round(avg_energy))
    trend_water = prediction.get("predictedWaterNextDay", round(avg_water))
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
        "score": score,
        "riskLevel": risk_level,
        "summary": f"{risk_level} risk with {len(anomalies)} active anomaly signals",
        "confidence": confidence,
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
            }

    return {
        "anomaly": False,
        "reason": "No anomaly",
        "severity": "low",
        "score": 0,
        "summary": "Normal",
        "recommendation": "No action",
        "priority": "low",
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
            return self._json(200, {"status": "ok", "service": "python-ml"})
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

        return self._json(404, {"error": "not found"})


if __name__ == "__main__":
    print(f"Python ML service running on http://{HOST}:{PORT}")
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    server.serve_forever()
