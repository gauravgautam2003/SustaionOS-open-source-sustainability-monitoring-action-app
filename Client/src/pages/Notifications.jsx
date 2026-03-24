import React, { useEffect, useMemo, useState, useContext } from "react";
import Card from "../components/ui/Card";
import { ThemeContext } from "../context/ThemeContext";
import { getAuthToken } from "../utils/auth";
import { apiUrl } from "../utils/api";
import { Bell, Sparkles, AlertTriangle, CheckCheck, RotateCcw } from "lucide-react";

const Notifications = () => {
  const { darkMode } = useContext(ThemeContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      if (!token) {
        setNotifications([]);
        return;
      }

      const res = await fetch(apiUrl("/api/notifications?limit=30"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      setNotifications(Array.isArray(json?.notifications) ? json.notifications : []);
    } catch (err) {
      console.error("Notification load failed:", err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  const markRead = async (id) => {
    try {
      const token = getAuthToken();
      if (!token) return;
      const res = await fetch(apiUrl(`/api/notifications/${id}/read`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      setNotifications((prev) =>
        prev.map((item) => (item._id === id ? { ...item, read: true, readAt: new Date().toISOString() } : item))
      );
    } catch (err) {
      console.error("Mark notification read failed:", err);
    }
  };

  const markAllRead = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      const res = await fetch(apiUrl("/api/notifications/read-all"), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    } catch (err) {
      console.error("Mark all read failed:", err);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400">
            System feed
          </p>
          <h1 className="text-3xl font-bold mt-2 flex items-center gap-3">
            <Bell className="text-primary" size={28} />
            Notifications
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {unreadCount} unread updates from alerts, score changes, and system events.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={loadNotifications}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
          >
            <RotateCcw size={16} />
            Refresh
          </button>
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-black font-medium"
          >
            <CheckCheck size={16} />
            Mark all read
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
          <h2 className="text-3xl font-bold mt-2">{notifications.length}</h2>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Unread</p>
          <h2 className="text-3xl font-bold mt-2 text-red-500">{unreadCount}</h2>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Read</p>
          <h2 className="text-3xl font-bold mt-2 text-emerald-500">
            {notifications.length - unreadCount}
          </h2>
        </Card>
      </div>

      {loading ? (
        <Card className="p-8 text-center text-gray-500 dark:text-gray-400">
          Loading notifications...
        </Card>
      ) : notifications.length === 0 ? (
        <Card className="p-8 text-center text-gray-500 dark:text-gray-400">
          No notifications yet.
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((item) => (
            <Card
              key={item._id}
              className={`p-5 border transition ${
                item.read
                  ? "border-gray-200 dark:border-gray-800"
                  : "border-primary/30 shadow-lg shadow-primary/10"
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                      item.type === "SCORE"
                        ? "bg-amber-500/10 text-amber-500"
                        : "bg-red-500/10 text-red-500"
                    }`}
                  >
                    {item.type === "SCORE" ? <Sparkles size={18} /> : <AlertTriangle size={18} />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold">{item.title}</h3>
                      {!item.read && (
                        <span className="text-[10px] px-2 py-1 rounded-full bg-red-500 text-white">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      {item.message}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      {new Date(item.time || item.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800">
                    {item.type}
                  </span>
                  {!item.read && (
                    <button
                      onClick={() => markRead(item._id)}
                      className="px-3 py-1.5 rounded-lg bg-black text-white dark:bg-white dark:text-black text-sm"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
