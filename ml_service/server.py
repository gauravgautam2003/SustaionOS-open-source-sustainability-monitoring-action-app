from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse
from pathlib import Path
import json
import math
from datetime import datetime, timezone, timedelta
import copy

HOST = "127.0.0.1"
PORT = 8000
MODEL_NAME = "sustainos-ensemble-v2"
MODEL_VERSION = "2.0.0"
MODEL_STATE_PATH = Path(__file__).with_name("model_state.json")
from trainable_model import SustainOSLinearModel, parse_dt as model_parse_dt
from profile_voice_model import PROFILE_VOICE_MODEL

MODEL = SustainOSLinearModel(MODEL_STATE_PATH, MODEL_NAME, MODEL_VERSION)


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
    ordered = sorted(
        records or [],
        key=lambda r: model_parse_dt(r.get("timestamp") or r.get("createdAt") or r.get("time")) or datetime.fromtimestamp(0, tz=timezone.utc),
    )
    if not ordered:
        return None

    if len(ordered) >= 3:
        MODEL.train(ordered)

    one_hour = MODEL.forecast(ordered, steps=1) or {}
    one_day = MODEL.forecast(ordered, steps=24) or {}
    latest_energy = safe_num(ordered[-1].get("energy"))
    latest_water = safe_num(ordered[-1].get("water"))
    avg_energy = mean([safe_num(r.get("energy")) for r in ordered])
    avg_water = mean([safe_num(r.get("water")) for r in ordered])
    metrics = MODEL.status().get("metrics", {})
    energy_std = round(safe_num(metrics.get("energy", {}).get("rmse")) or stddev([safe_num(r.get("energy")) for r in ordered]) or 1.0)
    water_std = round(safe_num(metrics.get("water", {}).get("rmse")) or stddev([safe_num(r.get("water")) for r in ordered]) or 1.0)
    ci95_energy = round(1.96 * max(1.0, energy_std))
    ci95_water = round(1.96 * max(1.0, water_std))

    return {
        "model": MODEL.status(),
        "predictedWaterAvg": round(avg_water),
        "predictedEnergyAvg": round(avg_energy),
        "predictedWaterNextHour": one_hour.get("prediction", {}).get("predictedWater", round(avg_water)),
        "predictedEnergyNextHour": one_hour.get("prediction", {}).get("predictedEnergy", round(avg_energy)),
        "predictedWaterNextDay": one_day.get("prediction", {}).get("predictedWater", round(avg_water)),
        "predictedEnergyNextDay": one_day.get("prediction", {}).get("predictedEnergy", round(avg_energy)),
        "predictedEnergyStdDev": energy_std,
        "predictedWaterStdDev": water_std,
        "predictedEnergyCI95": {"low": max(0, round(one_hour.get("prediction", {}).get("predictedEnergy", avg_energy) - ci95_energy)), "high": round(one_hour.get("prediction", {}).get("predictedEnergy", avg_energy) + ci95_energy)},
        "predictedWaterCI95": {"low": max(0, round(one_hour.get("prediction", {}).get("predictedWater", avg_water) - ci95_water)), "high": round(one_hour.get("prediction", {}).get("predictedWater", avg_water) + ci95_water)},
        "confidence": one_hour.get("confidence", MODEL.status().get("fitScore", 60)),
        "signalBreakdown": build_signal_breakdown(ordered),
        "latest": {"energy": latest_energy, "water": latest_water},
    }


def anomaly_payload(water, energy, history):
    return MODEL.anomaly(water, energy, history or [])


def insights_payload(records):
    return MODEL.build_insights(records or [])


def simulate_payload(records, energy_reduction_pct=10, water_reduction_pct=10, horizon_days=30):
    return MODEL.simulate(records or [], energy_reduction_pct, water_reduction_pct, horizon_days)


def parse_profile_payload(text, draft=None):
    return PROFILE_VOICE_MODEL.parse(text or "", draft or {})


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
            return self._json(200, {"status": "ok", "service": "python-ml", "model": MODEL_NAME, "version": MODEL_VERSION, "modelStatus": MODEL.status()})
        if path == "/model":
            return self._json(200, MODEL.status())
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

        if path == "/train":
            result = MODEL.train(payload.get("records") or [])
            return self._json(200, {"status": "trained", "model": result})

        if path == "/profile-parse":
            result = parse_profile_payload(payload.get("text") or "", payload.get("draft") or {})
            return self._json(200, {"status": "success", **result, "model": {"name": "sustainos-profile-voice", "version": "1.0.0"}})

        return self._json(404, {"error": "not found"})


if __name__ == "__main__":
    print(f"Python ML service running on http://{HOST}:{PORT}")
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    server.serve_forever()
