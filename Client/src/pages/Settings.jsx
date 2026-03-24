import React, { useState, useEffect, useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";
import { Save, User, Shield, Bell, Zap, Trash2 } from "lucide-react";

const API = "/api/settings"; // proxy use kar raha hai

const Settings = () => {
  const { darkMode, setDarkMode } = useContext(ThemeContext);

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // 🔥 FETCH SETTINGS
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(API, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (res.status === 401) {
          // not authenticated
          setMsg("❌ Unauthorized. Please login.");
          setLoading(false);
          return;
        }

        const data = await res.json();

        setSettings({
          name: data.name || "",
          email: data.email || "",
          aiSuggestions: data.aiSuggestions ?? true,
          predictiveInsights: data.predictiveInsights ?? true,
          energyLimit: data.energyLimit ?? 500,
          waterLimit: data.waterLimit ?? 200,
          energyAlerts: data.energyAlerts ?? true,
          waterAlerts: data.waterAlerts ?? true,
          weeklyReports: data.weeklyReports ?? false,
          sustainabilityGoal: data.sustainabilityGoal ?? 20,
          darkMode: data.darkMode ?? false,
        });

        setDarkMode(!!data.darkMode);
      } catch (err) {
        console.error(err);
        setMsg("❌ Failed to load settings");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // 🔄 HANDLE CHANGE
  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // 💾 SAVE SETTINGS
  const saveSettings = async () => {
    setSaving(true);
    setMsg("");

    // simple validation
    if (!settings?.name || !settings?.email) {
      setMsg("❌ Name and Email are required");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(API, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(settings),
      });

      const data = await res.json();

      if (res.status === 401) {
        setMsg("❌ Unauthorized. Please login.");
        setSaving(false);
        return;
      }

      if (!res.ok) throw new Error(data.msg || "Error saving");

      setMsg("✅ Settings saved successfully");
    } catch (err) {
      setMsg("❌ Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // Reset settings to server defaults (DELETE)
  const resetSettings = async () => {
    if (!window.confirm("Reset settings to defaults?")) return;
    setSaving(true);
    try {
      const res = await fetch(API, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.msg || "Reset failed");

      // server returns settings
      if (data.settings) {
        setSettings({
          name: data.settings.name || "",
          email: data.settings.email || "",
          aiSuggestions: data.settings.aiSuggestions ?? true,
          predictiveInsights: data.settings.predictiveInsights ?? true,
          energyLimit: data.settings.energyLimit ?? 500,
          waterLimit: data.settings.waterLimit ?? 200,
          energyAlerts: data.settings.energyAlerts ?? true,
          waterAlerts: data.settings.waterAlerts ?? true,
          weeklyReports: data.settings.weeklyReports ?? false,
          sustainabilityGoal: data.settings.sustainabilityGoal ?? 20,
          darkMode: data.settings.darkMode ?? false,
        });
        setDarkMode(!!data.settings.darkMode);
      }

      setMsg("✅ Settings reset to defaults");
    } catch (err) {
      console.error(err);
      setMsg("❌ Failed to reset settings");
    } finally {
      setSaving(false);
    }
  };

  // ❌ LOADING UI
  if (loading)
    return (
      <div className="text-center mt-10 text-lg animate-pulse">
        Loading Settings...
      </div>
    );

  const cardStyle = `p-6 rounded-2xl shadow-md ${
    darkMode
      ? "bg-gray-900 text-white border border-gray-700"
      : "bg-white text-black border border-gray-200"
  }`;

  const inputStyle = `w-full p-3 rounded-lg ${
    darkMode
      ? "bg-gray-800 border border-gray-700"
      : "bg-gray-100 border border-gray-300"
  }`;

  const toggle = (value, onChange) => (
    <div
      onClick={() => onChange(!value)}
      className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer ${
        value ? "bg-green-500" : "bg-gray-400"
      }`}
    >
      <div
        className={`w-4 h-4 bg-white rounded-full transition ${
          value ? "translate-x-6" : ""
        }`}
      />
    </div>
  );

  return (
    <div className="space-y-8 pb-10">

      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold">⚙️ Settings</h1>
        <p className="text-gray-500">Manage your preferences</p>
      </div>

      {/* PROFILE */}
      <div className={cardStyle}>
        <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
          <User size={18} /> Profile
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          <input
            value={settings.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className={inputStyle}
            placeholder="Full Name"
          />
          <input
            value={settings.email}
            onChange={(e) => handleChange("email", e.target.value)}
            className={inputStyle}
            placeholder="Email"
          />
        </div>
      </div>

      {/* AI SETTINGS */}
      <div className={cardStyle}>
        <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
          <Zap size={18} /> AI System
        </h2>

        <div className="flex justify-between">
          AI Suggestions
          {toggle(settings.aiSuggestions, (v) =>
            handleChange("aiSuggestions", v)
          )}
        </div>

        <div className="flex justify-between mt-3">
          Predictive Insights
          {toggle(settings.predictiveInsights, (v) =>
            handleChange("predictiveInsights", v)
          )}
        </div>
      </div>

      {/* LIMITS */}
      <div className={cardStyle}>
        <h2 className="text-xl font-semibold mb-4">📊 Limits</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <input
            type="number"
            value={settings.energyLimit}
            onChange={(e) =>
              handleChange("energyLimit", Number(e.target.value))
            }
            className={inputStyle}
            placeholder="Energy Limit"
          />
          <input
            type="number"
            value={settings.waterLimit}
            onChange={(e) =>
              handleChange("waterLimit", Number(e.target.value))
            }
            className={inputStyle}
            placeholder="Water Limit"
          />
        </div>
      </div>

      {/* THEME */}
      <div className={cardStyle}>
        <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
          <Shield size={18} /> Theme
        </h2>

        <div className="flex justify-between">
          Dark Mode
          {toggle(darkMode, (v) => {
            setDarkMode(v);
            handleChange("darkMode", v);
          })}
        </div>
      </div>

      {/* SAVE */}
      <button
        onClick={saveSettings}
        disabled={saving}
        className="bg-primary px-6 py-3 rounded-xl font-semibold hover:scale-105 transition"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>

      <button
        onClick={resetSettings}
        disabled={saving}
        className="ml-3 bg-red-500 px-4 py-3 rounded-xl font-semibold hover:scale-105 transition text-white"
      >
        Reset Defaults
      </button>

      {msg && <p className="text-center mt-2">{msg}</p>}
    </div>
  );
};

export default Settings;