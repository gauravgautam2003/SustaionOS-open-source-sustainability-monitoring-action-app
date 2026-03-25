import React, { useState, useEffect, useContext } from "react";
import Card from "../components/ui/Card";
import { AuthContext } from "../context/auth-context";
import { ThemeContext } from "../context/ThemeContext";
import SustainabilityGauge from "../components/dashboard/SustainabilityGauge";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import {
  Sun,
  Moon,
  Building2,
  Droplets,
  Zap,
  Bell,
  Leaf,
  Clock3,
  Target,
  Activity,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Mic,
} from "lucide-react";
import { getAuthToken } from "../utils/auth";
import { apiUrl } from "../utils/api";

const emptyStats = {
  totalEnergy: 0,
  totalWater: 0,
  score: 0,
  avgEnergy: 0,
  avgWater: 0,
};

const formatDateTime = (value) => {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleString();
};

const safeNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const openAssistantMode = (mode) => {
  window.dispatchEvent(new CustomEvent("sustainos:ai-mode", { detail: { mode, open: true } }));
};

const Profile = () => {
  const { user, setUser } = useContext(AuthContext);
  const { darkMode, setDarkMode } = useContext(ThemeContext);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    building: "",
    location: "",
    latitude: "",
    longitude: "",
    sensorId: "",
    sensorName: "",
    sensorType: "manual",
    protocol: "manual",
    batteryLevel: "",
    signalQuality: "",
    water: "",
    energy: "",
  });
  const [profileForm, setProfileForm] = useState({ name: "", building: "" });
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [stats, setStats] = useState(emptyStats);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [profilePulse, setProfilePulse] = useState({
    favoriteBuilding: "N/A",
    dataDays: 0,
    latestReading: null,
    energyTrend: null,
    waterTrend: null,
  });

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || "",
        building: user.building || "",
      });
    }
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      const token = getAuthToken();
      if (!token) {
        setPageLoading(false);
        return;
      }

      try {
        const [profileRes, historyRes, scoreRes, alertsRes] = await Promise.all([
          fetch(apiUrl("/api/user/profile"), {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(apiUrl("/api/data/history"), {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(apiUrl("/api/score"), {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(apiUrl("/api/alerts"), {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const profileJson = await profileRes.json();
        const historyJson = await historyRes.json();
        const scoreJson = await scoreRes.json();
        const alertsJson = await alertsRes.json();

        if (!profileRes.ok) throw new Error(profileJson.msg || "Profile fetch failed");
        if (!historyRes.ok) throw new Error(historyJson.msg || "History fetch failed");

        const updatedUser = { ...profileJson.user, token };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));

        const historyArray = Array.isArray(historyJson) ? historyJson : historyJson.history || [];

        const sortedHistory = [...historyArray].sort(
          (a, b) => new Date(b.createdAt || b.timestamp || 0) - new Date(a.createdAt || a.timestamp || 0)
        );

        const totalEnergy = sortedHistory.reduce((sum, item) => sum + safeNumber(item.energy), 0);
        const totalWater = sortedHistory.reduce((sum, item) => sum + safeNumber(item.water), 0);
        const avgEnergy = sortedHistory.length ? Math.round(totalEnergy / sortedHistory.length) : 0;
        const avgWater = sortedHistory.length ? Math.round(totalWater / sortedHistory.length) : 0;

        const buildingCounts = sortedHistory.reduce((acc, item) => {
          const key = item.building || "Unknown";
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});

        const favoriteBuilding = Object.entries(buildingCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
        const activeDays = new Set(
          sortedHistory.map((item) => new Date(item.createdAt || item.timestamp || Date.now()).toDateString())
        ).size;

        const recentThree = sortedHistory.slice(0, 3);
        const previousThree = sortedHistory.slice(3, 6);

        const avgOf = (arr, key) => {
          if (!arr.length) return null;
          return arr.reduce((sum, item) => sum + safeNumber(item[key]), 0) / arr.length;
        };

        const recentEnergy = avgOf(recentThree, "energy");
        const previousEnergy = avgOf(previousThree, "energy");
        const recentWater = avgOf(recentThree, "water");
        const previousWater = avgOf(previousThree, "water");

        const trend = (current, previous) => {
          if (!current || !previous) return null;
          if (previous === 0) return null;
          return Number((((current - previous) / previous) * 100).toFixed(1));
        };

        setStats({
          totalEnergy,
          totalWater,
          score: scoreJson?.score ?? scoreJson?.data?.score ?? 0,
          avgEnergy,
          avgWater,
        });

        setScore(scoreJson?.score ?? scoreJson?.data?.score ?? 0);
        setHistory(sortedHistory.slice(0, 6));
        setAlerts(Array.isArray(alertsJson) ? alertsJson : []);
        setProfilePulse({
          favoriteBuilding,
          dataDays: activeDays,
          latestReading: sortedHistory[0] || null,
          energyTrend: trend(recentEnergy, previousEnergy),
          waterTrend: trend(recentWater, previousWater),
        });
      } catch (err) {
        console.error(err);
        toast.error(err.message || "Error loading profile");
        setHistory([]);
        setAlerts([]);
        setStats(emptyStats);
      } finally {
        setPageLoading(false);
      }
    };

    fetchData();
  }, [user?.token, setUser]);

  const completion = Math.min(
    100,
    [
      user?.name,
      user?.email,
      user?.building,
      profileForm.name,
      profileForm.building,
      form.location,
      history.length > 0,
      score > 0,
    ].filter(Boolean).length * 14
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleTheme = async () => {
    const token = getAuthToken();
    const newMode = !darkMode;
    setDarkMode(newMode);
    try {
      await fetch(apiUrl("/api/settings"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || user?.token || ""}`,
        },
        body: JSON.stringify({ darkMode: newMode }),
      });
    } catch {
      toast.error("Theme save failed");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.building) return toast.error("Building required");
    setLoading(true);

    try {
      const token = getAuthToken();
      const submittedData = { ...form, timestamp: new Date().toISOString() };

      const res = await fetch(apiUrl("/api/data"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || user?.token || ""}`,
        },
        body: JSON.stringify({
          ...form,
          water: Number(form.water),
          energy: Number(form.energy),
          latitude: form.latitude === "" ? null : Number(form.latitude),
          longitude: form.longitude === "" ? null : Number(form.longitude),
          batteryLevel: form.batteryLevel === "" ? null : Number(form.batteryLevel),
          signalQuality: form.signalQuality === "" ? null : Number(form.signalQuality),
        }),
      });

      const data = await res.json();
      if (!res.ok) return toast.error(data.msg || "Submit failed");

      toast.success("Data submitted");

      setHistory((prev) => [submittedData, ...prev].slice(0, 6));
      setForm({
        building: "",
        location: "",
        latitude: "",
        longitude: "",
        sensorId: "",
        sensorName: "",
        sensorType: "manual",
        protocol: "manual",
        batteryLevel: "",
        signalQuality: "",
        water: "",
        energy: "",
      });
    } catch {
      toast.error("Server error");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    const token = getAuthToken();
    if (!token) return toast.error("User not logged in");
    setLoading(true);

    try {
      const res = await fetch(apiUrl("/api/user/update"), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileForm),
      });

      const data = await res.json();
      if (!res.ok || !data.success) return toast.error(data.msg || "Update failed");

      const updatedUser = { ...data.user, token };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      toast.success("Profile updated successfully");
    } catch (err) {
      console.error("Update failed:", err);
      toast.error("Update failed");
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return <div className="p-10 text-center text-lg animate-pulse">Loading Profile...</div>;
  }

  return (
    <div className="space-y-8">
      <Toaster />

      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
              Personal Sustainability Control Center
            </p>
            <h1 className="text-3xl md:text-4xl font-bold mt-2 flex items-center gap-3">
              <Sparkles className="text-primary" size={28} />
              Profile
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Update your profile, review your sustainability footprint, and submit new telemetry.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={toggleTheme}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              {darkMode ? "Light Mode" : "Dark Mode"}
            </button>
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-black font-medium shadow-sm"
            >
              <Target size={18} />
              Dashboard
            </button>
            <button
              onClick={() => openAssistantMode("telemetry")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-medium shadow-sm"
            >
              <Mic size={18} />
              Voice Data
            </button>
            <button
              onClick={() => openAssistantMode("profile")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300 font-medium shadow-sm"
            >
              <Sparkles size={18} />
              Voice Profile
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-1 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Account Summary</p>
                <h2 className="text-2xl font-bold mt-1">{profileForm.name || user?.name || "User"}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {profileForm.building || user?.building || "No building set"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {form.location || "Location can be set while submitting telemetry"}
                </p>
              </div>
              <div className="rounded-2xl bg-primary/15 text-black px-3 py-2 text-sm font-semibold">
                {user?.role || "Member"}
              </div>
            </div>

            <div className="mt-6">
              <SustainabilityGauge score={score} />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Profile Completion</p>
                <p className="text-2xl font-bold mt-1">{completion}%</p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Active Alerts</p>
                <p className="text-2xl font-bold mt-1">{alerts.filter((a) => a.status !== "RESOLVED").length}</p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Recorded Days</p>
                <p className="text-2xl font-bold mt-1">{profilePulse.dataDays}</p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Favorite Site</p>
                <p className="text-lg font-bold mt-1 truncate">{profilePulse.favoriteBuilding}</p>
              </div>
            </div>
          </Card>

          <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Building2 size={18} />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Live Footprint</h3>
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Total Energy</span>
                  <span className="font-semibold">{stats.totalEnergy} kWh</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Total Water</span>
                  <span className="font-semibold">{stats.totalWater} L</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Average Energy</span>
                  <span className="font-semibold">{stats.avgEnergy} kWh</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Average Water</span>
                  <span className="font-semibold">{stats.avgWater} L</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Activity size={18} />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Trend Pulse</h3>
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Energy Trend</span>
                  <span className={`font-semibold ${profilePulse.energyTrend > 0 ? "text-red-500" : "text-green-500"}`}>
                    {profilePulse.energyTrend == null
                      ? "Not enough data"
                      : `${profilePulse.energyTrend > 0 ? "+" : ""}${profilePulse.energyTrend}%`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Water Trend</span>
                  <span className={`font-semibold ${profilePulse.waterTrend > 0 ? "text-red-500" : "text-green-500"}`}>
                    {profilePulse.waterTrend == null
                      ? "Not enough data"
                      : `${profilePulse.waterTrend > 0 ? "+" : ""}${profilePulse.waterTrend}%`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Latest Update</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatDateTime(profilePulse.latestReading?.createdAt || profilePulse.latestReading?.timestamp)}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Bell size={18} />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Alerts</h3>
              </div>
              <div className="mt-4 space-y-3">
                {alerts.filter((a) => a.status !== "RESOLVED").length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No active alerts right now.</p>
                ) : (
                  alerts
                    .filter((a) => a.status !== "RESOLVED")
                    .slice(0, 3)
                    .map((alert) => (
                      <div key={alert._id} className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold">{alert.building || "System"}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{alert.message}</p>
                          </div>
                          <span className="rounded-full bg-red-500/15 px-2 py-1 text-xs text-red-500">
                            {alert.severity || "LOW"}
                          </span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Leaf size={18} />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Insights</h3>
              </div>
              <div className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={16} />
                  {score >= 80 ? "Excellent operating profile" : "Optimization opportunity detected"}
                </div>
                <div className="flex items-center gap-2">
                  <Droplets size={16} />
                  Latest water reading: {safeNumber(profilePulse.latestReading?.water)} L
                </div>
                <div className="flex items-center gap-2">
                  <Zap size={16} />
                  Latest energy reading: {safeNumber(profilePulse.latestReading?.energy)} kWh
                </div>
                <div className="flex items-center gap-2">
                  <Clock3 size={16} />
                  Last refresh: {new Date().toLocaleTimeString()}
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={18} className="text-primary" />
              <h3 className="text-lg font-semibold">Update Profile</h3>
            </div>
            <form onSubmit={handleProfileUpdate} className="space-y-3">
              <input
                name="name"
                value={profileForm.name}
                onChange={handleProfileChange}
                className="w-full rounded-lg border border-gray-200 bg-gray-100 p-3 text-black placeholder-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
                placeholder="Name"
              />
              <input
                name="building"
                value={profileForm.building}
                onChange={handleProfileChange}
                className="w-full rounded-lg border border-gray-200 bg-gray-100 p-3 text-black placeholder-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
                placeholder="Building"
              />
              <button className="w-full rounded-lg bg-green-500 py-3 font-medium text-white">
                {loading ? "Saving..." : "Update Profile"}
              </button>
            </form>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <RefreshCw size={18} className="text-primary" />
              <h3 className="text-lg font-semibold">Submit Telemetry</h3>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                name="building"
                value={form.building}
                onChange={handleChange}
                placeholder="Building"
                className="w-full rounded-lg border border-gray-200 bg-white p-3 text-black placeholder-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
              />
              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="Location / Area"
                className="w-full rounded-lg border border-gray-200 bg-white p-3 text-black placeholder-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
              />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  name="latitude"
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={handleChange}
                  placeholder="Latitude (optional)"
                  className="w-full rounded-lg border border-gray-200 bg-white p-3 text-black placeholder-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
                />
                <input
                  name="longitude"
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={handleChange}
                  placeholder="Longitude (optional)"
                  className="w-full rounded-lg border border-gray-200 bg-white p-3 text-black placeholder-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  name="sensorId"
                  value={form.sensorId}
                  onChange={handleChange}
                  placeholder="Sensor ID (optional)"
                  className="w-full rounded-lg border border-gray-200 bg-white p-3 text-black placeholder-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
                />
                <input
                  name="sensorName"
                  value={form.sensorName}
                  onChange={handleChange}
                  placeholder="Sensor Name (optional)"
                  className="w-full rounded-lg border border-gray-200 bg-white p-3 text-black placeholder-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  name="sensorType"
                  value={form.sensorType}
                  onChange={handleChange}
                  placeholder="Sensor Type"
                  className="w-full rounded-lg border border-gray-200 bg-white p-3 text-black placeholder-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
                />
                <input
                  name="protocol"
                  value={form.protocol}
                  onChange={handleChange}
                  placeholder="Protocol"
                  className="w-full rounded-lg border border-gray-200 bg-white p-3 text-black placeholder-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  name="batteryLevel"
                  type="number"
                  value={form.batteryLevel}
                  onChange={handleChange}
                  placeholder="Battery %"
                  className="w-full rounded-lg border border-gray-200 bg-white p-3 text-black placeholder-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
                />
                <input
                  name="signalQuality"
                  type="number"
                  value={form.signalQuality}
                  onChange={handleChange}
                  placeholder="Signal quality %"
                  className="w-full rounded-lg border border-gray-200 bg-white p-3 text-black placeholder-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  name="water"
                  type="number"
                  value={form.water}
                  onChange={handleChange}
                  placeholder="Water"
                  className="w-full rounded-lg border border-gray-200 bg-white p-3 text-black placeholder-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
                />
                <input
                  name="energy"
                  type="number"
                  value={form.energy}
                  onChange={handleChange}
                  placeholder="Energy"
                  className="w-full rounded-lg border border-gray-200 bg-white p-3 text-black placeholder-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
                />
              </div>
              <button className="w-full rounded-lg bg-blue-500 py-3 font-medium text-white">
                {loading ? "Submitting..." : "Submit Data"}
              </button>
            </form>
          </Card>
        </div>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          {history.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {history.map((item, index) => (
                <div
                  key={item._id || index}
                  className="flex items-center justify-between rounded-lg bg-gray-100 p-3 dark:bg-gray-800"
                >
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{item.building || "Building"}</p>
                    <p className="text-xs text-gray-500">{formatDateTime(item.timestamp || item.createdAt)}</p>
                  </div>

                  <div className="text-right text-sm">
                    <p className="text-blue-500">💧 {safeNumber(item.water)}</p>
                    <p className="text-green-500">⚡ {safeNumber(item.energy)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Profile;
