import React, { useState, useEffect, useContext } from "react";
import Card from "../components/ui/Card";
import { AuthContext } from "../context/AuthContext";
import { ThemeContext } from "../context/ThemeContext";
import SustainabilityGauge from "../components/dashboard/SustainabilityGauge";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { Sun, Moon } from "lucide-react";

const API = "http://localhost:5000";

const Profile = () => {
  const { user, setUser } = useContext(AuthContext);
  const { darkMode, setDarkMode } = useContext(ThemeContext);
  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  const [form, setForm] = useState({ building: "", water: "", energy: "" });
  const [profileForm, setProfileForm] = useState({ name: "", building: "" });
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEnergy: 0,
    totalWater: 0,
    score: 0,
    avgEnergy: 0,
    avgWater: 0,
  });
  const [history, setHistory] = useState([]);

  // Sync profileForm with user after fetch/login
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || "",
        building: user.building || "",
      });
    }
  }, [user]);

  // 🔥 Fetch profile + stats + history
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, statsRes, historyRes] = await Promise.all([
          fetch(`${API}/api/user/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API}/api/user/stats`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API}/api/data/history`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!profileRes.ok) throw new Error("Profile fetch failed");
        if (!statsRes.ok) throw new Error("Stats fetch failed");
        if (!historyRes.ok) throw new Error("History fetch failed");

        const profileJson = await profileRes.json();
        const statsJson = await statsRes.json();
        const historyJson = await historyRes.json();

        setUser({ ...profileJson, token });
        setProfileForm({
          name: profileJson.name || "",
          building: profileJson.building || "",
        });

        const avgEnergy = historyJson.length
          ? Math.round(historyJson.reduce((a, b) => a + b.energy, 0) / historyJson.length)
          : 0;
        const avgWater = historyJson.length
          ? Math.round(historyJson.reduce((a, b) => a + b.water, 0) / historyJson.length)
          : 0;

        setStats({ ...statsJson, avgEnergy, avgWater });
        setHistory(historyJson.slice(0, 5));
      } catch (err) {
        console.error(err);
        toast.error("Error loading profile");
      } finally {
        setPageLoading(false);
      }
    };

    if (token) fetchData();
  }, [token, setUser]);

  // INPUT HANDLERS
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  // DARK MODE
  const toggleTheme = async () => {
    const newMode = !darkMode;
    setDarkMode(newMode);

    try {
      await fetch(`${API}/api/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ darkMode: newMode }),
      });
    } catch {
      toast.error("Theme save failed");
    }
  };

  // SUBMIT DATA
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.building) return toast.error("Building required");

    setLoading(true);

    try {
      const res = await fetch(`${API}/api/data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          water: Number(form.water),
          energy: Number(form.energy),
        }),
      });

      const data = await res.json();
      if (!res.ok) return toast.error(data.msg);

      toast.success("Data submitted");
      setForm({ building: "", water: "", energy: "" });
      setHistory((prev) => [
        { ...form, timestamp: new Date().toISOString() },
        ...prev,
      ].slice(0, 5));
    } catch {
      toast.error("Server error");
    }

    setLoading(false);
  };

  // UPDATE PROFILE
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/user/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileForm),
      });

      const data = await res.json();
      if (!res.ok) return toast.error(data.msg);

      toast.success("Profile updated successfully");
      setUser({ ...data.user, token });
      setProfileForm(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
    } catch {
      toast.error("Update failed");
    }

    setLoading(false);
  };

  if (pageLoading)
    return (
      <div className="p-10 text-center text-lg animate-pulse">
        Loading Profile...
      </div>
    );

  return (
    <div className="min-h-screen p-6 bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-white">
      <Toaster />
      <div className="max-w-6xl mx-auto space-y-8">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">👤 Profile</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-3 rounded-full bg-gray-200 dark:bg-gray-800 hover:scale-110 transition"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 bg-primary rounded-lg font-semibold hover:scale-105 transition"
            >
              Dashboard
            </button>
          </div>
        </div>

        {/* USER CARD */}
        <Card className="p-6 flex items-center gap-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-black text-2xl font-bold shadow-lg">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {user?.name || "User"}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">{user?.email}</p>
            <p className="text-sm mt-1 text-gray-700 dark:text-gray-300">
              Building: <span className="font-semibold">{user?.building || "N/A"}</span>
            </p>
          </div>
        </Card>

        {/* STATS */}
        <Card className="p-6">
          <SustainabilityGauge score={stats.score} />
          <div className="flex justify-around mt-4 text-sm">
            <span>⚡ {stats.totalEnergy + Number(form.energy || 0)}</span>
            <span>💧 {stats.totalWater + Number(form.water || 0)}</span>
            <span>📊 {stats.avgEnergy}</span>
            <span>📊 {stats.avgWater}</span>
          </div>
        </Card>

        {/* UPDATE PROFILE */}
        <Card className="p-6">
          <form onSubmit={handleProfileUpdate} className="space-y-3">
            <input
              name="name"
              value={profileForm.name}
              onChange={handleProfileChange}
              className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-black dark:text-white border border-gray-300 dark:border-gray-700 outline-none"
              placeholder="Name"
            />
            <input
              name="building"
              value={profileForm.building}
              onChange={handleProfileChange}
              className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-black dark:text-white border border-gray-300 dark:border-gray-700 outline-none"
              placeholder="Building"
            />
            <button className="w-full py-3 rounded-lg bg-green-500 text-white font-semibold hover:scale-105 transition">
              {loading ? "Saving..." : "Update Profile"}
            </button>
          </form>
        </Card>

        {/* ADD DATA */}
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              name="building"
              value={form.building}
              onChange={handleChange}
              className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-black dark:text-white border border-gray-300 dark:border-gray-700"
              placeholder="Building"
            />
            <input
              name="water"
              type="number"
              value={form.water}
              onChange={handleChange}
              className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-black dark:text-white border border-gray-300 dark:border-gray-700"
              placeholder="Water"
            />
            <input
              name="energy"
              type="number"
              value={form.energy}
              onChange={handleChange}
              className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-black dark:text-white border border-gray-300 dark:border-gray-700"
              placeholder="Energy"
            />
            <button className="w-full py-3 rounded-lg bg-blue-500 text-white font-semibold hover:scale-105 transition">
              {loading ? "Submitting..." : "Submit Data"}
            </button>
          </form>
        </Card>

      </div>
    </div>
  );
};

export default Profile;