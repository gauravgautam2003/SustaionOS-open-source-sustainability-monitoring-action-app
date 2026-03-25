import React, { useContext, useEffect, useState } from "react";
import Card from "../components/ui/Card";
import { ThemeContext } from "../context/ThemeContext";
import {
  Bell,
  ChevronRight,
  Gauge,
  MoonStar,
  RefreshCw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  User,
  Zap,
} from "lucide-react";
import { getAuthToken } from "../utils/auth";
import { apiUrl } from "../utils/api";

const DEFAULT_SETTINGS = {
  name: "",
  email: "",
  aiSuggestions: true,
  predictiveInsights: true,
  energyLimit: 500,
  waterLimit: 200,
  energyAlerts: true,
  waterAlerts: true,
  weeklyReports: false,
  sustainabilityGoal: 20,
  darkMode: false,
};

const normalizeSettings = (data = {}) => ({
  name: data.name || "",
  email: data.email || "",
  aiSuggestions: data.aiSuggestions ?? true,
  predictiveInsights: data.predictiveInsights ?? true,
  energyLimit: Number(data.energyLimit ?? 500),
  waterLimit: Number(data.waterLimit ?? 200),
  energyAlerts: data.energyAlerts ?? true,
  waterAlerts: data.waterAlerts ?? true,
  weeklyReports: data.weeklyReports ?? false,
  sustainabilityGoal: Number(data.sustainabilityGoal ?? 20),
  darkMode: data.darkMode ?? false,
});

const formatDateTime = (value) => {
  if (!value) return "Not synced yet";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not synced yet";
  return parsed.toLocaleString();
};

const bannerStyles = {
  success:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  error:
    "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
  info:
    "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
};

const toggleToneStyles = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  sky: "bg-sky-500",
  violet: "bg-violet-500",
};

const rangeAccentStyles = {
  emerald: "accent-emerald-500",
  amber: "accent-amber-500",
  sky: "accent-sky-500",
};

const MetricTile = ({ label, value, meta }) => (
  <div className="rounded-2xl border border-gray-200/80 bg-white/75 p-4 backdrop-blur dark:border-gray-800 dark:bg-gray-900/70">
    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
      {label}
    </p>
    <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{meta}</p>
  </div>
);

const ToggleRow = ({ icon: Icon, title, description, checked, onChange, tone = "emerald" }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className="flex w-full items-center justify-between gap-4 rounded-2xl border border-gray-200/80 bg-white/70 p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900/70"
  >
    <div className="flex min-w-0 items-start gap-3">
      <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-gray-900 dark:text-white">{title}</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </div>

    <div
      className={`flex h-7 w-14 items-center rounded-full p-1 transition ${
        checked ? toggleToneStyles[tone] : "bg-gray-300 dark:bg-gray-700"
      }`}
    >
      <div
        className={`h-5 w-5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-7" : "translate-x-0"
        }`}
      />
    </div>
  </button>
);

const RangeControl = ({
  label,
  description,
  unit,
  min,
  max,
  step,
  value,
  onChange,
  accent = "emerald",
}) => (
  <div className="rounded-2xl border border-gray-200/80 bg-white/70 p-4 backdrop-blur dark:border-gray-800 dark:bg-gray-900/70">
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        <p className="font-semibold text-gray-900 dark:text-white">{label}</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>

      <div className="rounded-xl bg-primary/10 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white">
        {value} {unit}
      </div>
    </div>

    <div className="mt-4 grid gap-3 md:grid-cols-[1fr_120px] md:items-center">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full ${rangeAccentStyles[accent]}`}
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-sm font-medium text-gray-900 outline-none transition focus:border-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white"
      />
    </div>
  </div>
);

const Settings = () => {
  const { darkMode, setDarkMode } = useContext(ThemeContext);

  const [settings, setSettings] = useState(null);
  const [initialSettings, setInitialSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          setBanner({ type: "error", text: "Login required to manage settings." });
          setLoading(false);
          return;
        }

        const res = await fetch(apiUrl("/api/settings"), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          setBanner({ type: "error", text: "Unauthorized. Please login again." });
          setLoading(false);
          return;
        }

        if (!res.ok) throw new Error("Failed to load settings");

        const data = await res.json();
        const normalized = normalizeSettings(data);

        setSettings(normalized);
        setInitialSettings(normalized);
        setDarkMode(!!normalized.darkMode);
        setLastSyncedAt(data.updatedAt || data.createdAt || null);
      } catch {
        setBanner({ type: "error", text: "Failed to load settings." });
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [setDarkMode]);

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleNumberChange = (key, value, fallback = 0) => {
    const parsed = Number(value);
    handleChange(key, Number.isFinite(parsed) ? parsed : fallback);
  };

  const saveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    setBanner(null);

    if (!settings.name.trim() || !settings.email.trim()) {
      setBanner({ type: "error", text: "Name and email are required." });
      setSaving(false);
      return;
    }

    const payload = {
      ...settings,
      name: settings.name.trim(),
      email: settings.email.trim(),
      energyLimit: Math.max(0, Number(settings.energyLimit) || DEFAULT_SETTINGS.energyLimit),
      waterLimit: Math.max(0, Number(settings.waterLimit) || DEFAULT_SETTINGS.waterLimit),
      sustainabilityGoal: Math.min(
        100,
        Math.max(0, Number(settings.sustainabilityGoal) || DEFAULT_SETTINGS.sustainabilityGoal)
      ),
    };

    try {
      const token = getAuthToken();
      const res = await fetch(apiUrl("/api/settings"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 401) {
        setBanner({ type: "error", text: "Unauthorized. Please login again." });
        setSaving(false);
        return;
      }

      if (!res.ok) throw new Error(data.msg || "Failed to save settings");

      const normalized = normalizeSettings(data);
      setSettings(normalized);
      setInitialSettings(normalized);
      setDarkMode(!!normalized.darkMode);
      setLastSyncedAt(data.updatedAt || new Date().toISOString());
      setBanner({ type: "success", text: "Settings saved successfully." });
    } catch {
      setBanner({ type: "error", text: "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = async () => {
    if (!window.confirm("Reset settings to defaults?")) return;

    setSaving(true);
    setBanner(null);

    try {
      const token = getAuthToken();
      const res = await fetch(apiUrl("/api/settings"), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token || ""}` },
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.msg || "Reset failed");

      const normalized = normalizeSettings(data.settings || DEFAULT_SETTINGS);
      setSettings(normalized);
      setInitialSettings(normalized);
      setDarkMode(!!normalized.darkMode);
      setLastSyncedAt(data.settings?.updatedAt || data.settings?.createdAt || new Date().toISOString());
      setBanner({ type: "success", text: "Settings reset to defaults." });
    } catch {
      setBanner({ type: "error", text: "Failed to reset settings." });
    } finally {
      setSaving(false);
    }
  };

  const revertUnsaved = () => {
    if (!initialSettings) return;
    setSettings(initialSettings);
    setDarkMode(!!initialSettings.darkMode);
    setBanner({ type: "info", text: "Unsaved changes reverted." });
  };

  if (loading) {
    return <div className="mt-10 text-center text-lg animate-pulse">Loading advanced settings...</div>;
  }

  if (!settings) {
    return <div className="mt-10 text-center text-lg text-red-500">Unable to load settings.</div>;
  }

  const dirty = JSON.stringify(settings) !== JSON.stringify(initialSettings || settings);
  const enabledAutomation = [
    settings.aiSuggestions,
    settings.predictiveInsights,
    settings.energyAlerts,
    settings.waterAlerts,
    settings.weeklyReports,
  ].filter(Boolean).length;
  const automationScore = Math.round((enabledAutomation / 5) * 100);
  const alertCoverage =
    settings.energyAlerts && settings.waterAlerts
      ? "Full coverage"
      : settings.energyAlerts || settings.waterAlerts
        ? "Partial coverage"
        : "Muted";
  const goalMode =
    settings.sustainabilityGoal >= 40
      ? "Aggressive target"
      : settings.sustainabilityGoal >= 20
        ? "Balanced target"
        : "Conservative target";

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-gray-500 dark:text-gray-400">
            Advanced Control Center
          </p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">
            Settings
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400 md:text-base">
            Tune AI behavior, alert coverage, appearance, and operational thresholds from one place.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={revertUnsaved}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200"
          >
            <RefreshCw size={16} />
            Revert
          </button>
          <button
            type="button"
            onClick={saveSettings}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-black shadow-sm shadow-primary/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {banner ? (
        <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${bannerStyles[banner.type]}`}>
          {banner.text}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2 overflow-hidden border border-gray-200/80 dark:border-gray-800/80 bg-gradient-to-br from-white via-white to-primary/5 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-black dark:text-white">
                <Sparkles size={14} />
                Smart configuration layer
              </div>
              <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">
                One place to control automation, alerts, and sustainability posture.
              </h2>
              <p className="mt-3 text-sm leading-7 text-gray-600 dark:text-gray-400">
                Keep the platform sharp with stronger defaults, synced thresholds, and faster recovery if anything drifts.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200/80 bg-white/75 px-4 py-3 text-sm text-gray-600 backdrop-blur dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-300">
              <p className="font-semibold text-gray-900 dark:text-white">Last synced</p>
              <p className="mt-1">{formatDateTime(lastSyncedAt)}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <MetricTile label="Automation" value={`${automationScore}%`} meta={`${enabledAutomation}/5 controls enabled`} />
            <MetricTile label="Alert Coverage" value={alertCoverage} meta="Energy and water monitoring status" />
            <MetricTile label="Goal Mode" value={`${settings.sustainabilityGoal}%`} meta={goalMode} />
          </div>
        </Card>

        <Card className="border border-gray-200/80 dark:border-gray-800/80">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <ShieldCheck size={18} />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">System Posture</h2>
          </div>

          <div className="mt-5 space-y-4">
            {[
              {
                label: "AI assistant",
                value: settings.aiSuggestions && settings.predictiveInsights ? "Advanced" : "Basic",
              },
              {
                label: "Theme",
                value: settings.darkMode ? "Dark mode active" : "Light mode active",
              },
              {
                label: "Weekly reports",
                value: settings.weeklyReports ? "Scheduled" : "Manual only",
              },
              {
                label: "Unsaved changes",
                value: dirty ? "Pending review" : "All synced",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-2xl border border-gray-200/80 bg-white/70 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/70"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{item.value}</p>
                </div>
                <ChevronRight size={16} className="text-gray-400" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="border border-gray-200/80 dark:border-gray-800/80">
          <div className="flex items-center gap-2">
            <User size={18} className="text-primary" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Identity and Appearance</h2>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
              <input
                value={settings.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-gray-900 outline-none transition focus:border-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="Full Name"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <input
                value={settings.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-gray-900 outline-none transition focus:border-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="Email"
              />
            </div>
          </div>

          <div className="mt-5">
            <ToggleRow
              icon={MoonStar}
              title="Dark mode"
              description="Switch the dashboard shell and widgets to a darker operational theme."
              checked={settings.darkMode}
              onChange={(value) => {
                setDarkMode(value);
                handleChange("darkMode", value);
              }}
              tone="violet"
            />
          </div>
        </Card>

        <Card className="border border-gray-200/80 dark:border-gray-800/80">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-primary" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">AI and Automation</h2>
          </div>

          <div className="mt-5 space-y-4">
            <ToggleRow
              icon={Sparkles}
              title="AI suggestions"
              description="Enable contextual recommendations based on live telemetry and system behavior."
              checked={settings.aiSuggestions}
              onChange={(value) => handleChange("aiSuggestions", value)}
              tone="emerald"
            />
            <ToggleRow
              icon={Gauge}
              title="Predictive insights"
              description="Use forward-looking analysis to surface anomalies before they become incidents."
              checked={settings.predictiveInsights}
              onChange={(value) => handleChange("predictiveInsights", value)}
              tone="sky"
            />
            <ToggleRow
              icon={RefreshCw}
              title="Weekly reports"
              description="Prepare recurring summaries for stakeholders and demo reviews."
              checked={settings.weeklyReports}
              onChange={(value) => handleChange("weeklyReports", value)}
              tone="amber"
            />
          </div>
        </Card>

        <Card className="border border-gray-200/80 dark:border-gray-800/80">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-primary" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Alert Coverage</h2>
          </div>

          <div className="mt-5 space-y-4">
            <ToggleRow
              icon={Zap}
              title="Energy alerts"
              description="Notify the team when energy readings breach your configured threshold."
              checked={settings.energyAlerts}
              onChange={(value) => handleChange("energyAlerts", value)}
              tone="amber"
            />
            <ToggleRow
              icon={SlidersHorizontal}
              title="Water alerts"
              description="Raise visibility when water consumption suggests leaks or inefficiency."
              checked={settings.waterAlerts}
              onChange={(value) => handleChange("waterAlerts", value)}
              tone="sky"
            />
          </div>
        </Card>

        <Card className="border border-gray-200/80 dark:border-gray-800/80">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-primary" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Threshold Controls</h2>
          </div>

          <div className="mt-5 space-y-4">
            <RangeControl
              label="Energy limit"
              description="Maximum energy reading before the platform starts treating usage as risky."
              unit="kWh"
              min={100}
              max={2000}
              step={25}
              value={settings.energyLimit}
              onChange={(value) => handleNumberChange("energyLimit", value, DEFAULT_SETTINGS.energyLimit)}
              accent="amber"
            />
            <RangeControl
              label="Water limit"
              description="Maximum water reading before alerting for waste, spikes, or leakage."
              unit="L"
              min={50}
              max={1000}
              step={10}
              value={settings.waterLimit}
              onChange={(value) => handleNumberChange("waterLimit", value, DEFAULT_SETTINGS.waterLimit)}
              accent="sky"
            />
            <RangeControl
              label="Sustainability goal"
              description="Target improvement percentage for your optimization strategy."
              unit="%"
              min={0}
              max={100}
              step={5}
              value={settings.sustainabilityGoal}
              onChange={(value) =>
                handleNumberChange("sustainabilityGoal", value, DEFAULT_SETTINGS.sustainabilityGoal)
              }
              accent="emerald"
            />
          </div>
        </Card>
      </div>

      <Card className="border border-red-500/15 bg-gradient-to-br from-white to-red-50/60 dark:border-red-500/10 dark:from-gray-950 dark:to-red-950/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-red-500">
              <Trash2 size={18} />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Reset and Recovery</h2>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
              If a demo setup drifts too far, reset everything back to clean defaults in one click.
            </p>
          </div>

          <button
            type="button"
            onClick={resetSettings}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 size={16} />
            Reset Defaults
          </button>
        </div>
      </Card>
    </div>
  );
};

export default Settings;
