// src/pages/Profile.jsx
import React, { useState, useEffect, useContext } from "react";
import Card from "../components/ui/Card";
import { AuthContext } from "../context/AuthContext";
import { ThemeContext } from "../context/ThemeContext";
import SustainabilityGauge from "../components/dashboard/SustainabilityGauge";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from 'react-hot-toast';

const Profile = () => {
  const { user, setUser } = useContext(AuthContext);
  const { darkMode } = useContext(ThemeContext);
  const navigate = useNavigate();

  const [form, setForm] = useState({ building: "", water: "", energy: "" });
  const [profileForm, setProfileForm] = useState({ name: user?.name || "", building: user?.building || "" });
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalEnergy: 0, totalWater: 0, score: 0, avgEnergy: 0, avgWater: 0 });
  const [history, setHistory] = useState([]);

  // Fetch user stats & history
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, historyRes] = await Promise.all([
          fetch("http://localhost:5000/api/user/stats", {
            headers: { Authorization: `Bearer ${user?.token}` },
          }),
          fetch("http://localhost:5000/api/data/history", {
            headers: { Authorization: `Bearer ${user?.token}` },
          }),
        ]);

        const statsJson = await statsRes.json();
        const historyJson = await historyRes.json();

        const avgEnergy = historyJson.length ? Math.round(historyJson.reduce((a,b)=>a+b.energy,0)/historyJson.length) : 0;
        const avgWater = historyJson.length ? Math.round(historyJson.reduce((a,b)=>a+b.water,0)/historyJson.length) : 0;

        setStats({ ...statsJson, avgEnergy, avgWater });
        setHistory(historyJson.slice(0, 5)); // last 5 entries
      } catch (err) {
        console.error("Error fetching profile data:", err);
        toast.error("Error loading profile data");
      }
    };
    fetchData();
  }, [user]);

  // Handlers
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleProfileChange = (e) => setProfileForm({ ...profileForm, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.building || form.water < 0 || form.energy < 0) return toast.error("Invalid input");

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user?.token}` },
        body: JSON.stringify({ ...form, water: Number(form.water), energy: Number(form.energy) }),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.msg || "Error submitting data");
      else {
        toast.success("Data submitted successfully");
        setForm({ building: "", water: "", energy: "" });
        setStats(prev => ({
          ...prev,
          totalEnergy: prev.totalEnergy + Number(form.energy),
          totalWater: prev.totalWater + Number(form.water),
          score: Math.min(100, prev.score + 1),
        }));
        setHistory(prev => [{ ...form, timestamp: new Date().toISOString() }, ...prev].slice(0,5));
      }
    } catch {
      toast.error("Server error");
    }
    setLoading(false);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!profileForm.name || !profileForm.building) return toast.error("Name and Building required");

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/user/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user?.token}` },
        body: JSON.stringify(profileForm),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.msg || "Update failed");
      else {
        toast.success("Profile updated successfully");
        setUser(prev => ({ ...prev, ...profileForm })); // Update context
      }
    } catch {
      toast.error("Server error");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen p-6 bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <Toaster position="top-right" reverseOrder={false} />
      <div className="max-w-6xl mx-auto space-y-8">

        {/* BACK BUTTON */}
        <button onClick={() => navigate("/")} className="mb-6 px-4 py-2 rounded-lg bg-primary text-black font-semibold hover:bg-green-500 transition">
          ← Back to Dashboard
        </button>

        {/* USER CARD + SUSTAINABILITY GAUGE */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className={`p-6 flex flex-col items-center ${darkMode ? "bg-gray-900" : "bg-white"}`}>
            <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-black text-3xl font-bold">
              {user?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <h2 className="text-xl font-bold mt-3">{user?.name || "User Name"}</h2>
            <p className="text-sm text-gray-400">{user?.email}</p>
            <p className="text-sm mt-1">Role: <span className="font-semibold">{user?.role || "User"}</span></p>
            <p className="text-sm mt-1">Building: <span className="font-semibold">{user?.building || "N/A"}</span></p>
          </Card>

          <Card className="md:col-span-2 p-6">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">Sustainability Score</h3>
            <SustainabilityGauge score={stats.score} />
            <div className="flex justify-around mt-6 text-sm">
              <div>⚡ Total Energy: {stats.totalEnergy} kWh</div>
              <div>💧 Total Water: {stats.totalWater} L</div>
              <div>📊 Avg Energy: {stats.avgEnergy} kWh</div>
              <div>📊 Avg Water: {stats.avgWater} L</div>
            </div>
          </Card>
        </div>

        {/* PROFILE UPDATE FORM */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">📝 Update Profile</h3>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <input type="text" name="name" placeholder="Name" value={profileForm.name} onChange={handleProfileChange}
              className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-black dark:text-white outline-none focus:ring-2 focus:ring-primary" />
            <input type="text" name="building" placeholder="Building" value={profileForm.building} onChange={handleProfileChange}
              className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-black dark:text-white outline-none focus:ring-2 focus:ring-primary" />
            <button type="submit" disabled={loading} className="w-full py-3 rounded-lg bg-primary text-black font-semibold hover:scale-105 transition">
              {loading ? "Updating..." : "Update Profile"}
            </button>
          </form>
        </Card>

        {/* ADD DATA FORM */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">📊 Add Resource Data</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" name="building" placeholder="Building Name" value={form.building} onChange={handleChange}
              className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-black dark:text-white outline-none focus:ring-2 focus:ring-primary" />
            <input type="number" name="water" placeholder="Water Usage (Liters)" value={form.water} onChange={handleChange}
              className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-black dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="number" name="energy" placeholder="Energy Usage (kWh)" value={form.energy} onChange={handleChange}
              className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-black dark:text-white outline-none focus:ring-2 focus:ring-purple-500" />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200">
                💧 Water: {form.water || 0}
              </div>
              <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-200">
                ⚡ Energy: {form.energy || 0}
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 rounded-lg bg-primary text-black font-semibold hover:scale-105 transition">
              {loading ? "Submitting..." : "Submit Data"}
            </button>
          </form>
        </Card>

        {/* RECENT ACTIVITY */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">📜 Recent Activity</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="py-2 px-3">Building</th>
                  <th className="py-2 px-3">Water (L)</th>
                  <th className="py-2 px-3">Energy (kWh)</th>
                  <th className="py-2 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, idx) => (
                  <tr key={idx} className="border-b dark:border-gray-700">
                    <td className="py-2 px-3">{item.building}</td>
                    <td className="py-2 px-3">{item.water}</td>
                    <td className="py-2 px-3">{item.energy}</td>
                    <td className="py-2 px-3">{new Date(item.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

      </div>
    </div>
  );
};

export default Profile;