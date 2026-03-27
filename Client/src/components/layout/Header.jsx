import React, { useContext, useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, ExternalLink, Menu, Sparkles, AlertTriangle, Volume2, VolumeX } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { ThemeContext } from "../../context/ThemeContext";
import { AuthContext } from "../../context/auth-context";
import { getAuthToken } from "../../utils/auth";
import { apiUrl } from "../../utils/api";
import socket from "../../utils/socket";
import {
  isAlertSoundEnabled,
  playAlertSound,
  primeAlertAudio,
  setAlertSoundEnabled,
} from "../../utils/notificationSound";

const routeLabels = {
  "/": "Dashboard Overview",
  "/analytics": "Analytics",
  "/history": "Usage History",
  "/reports": "Reports",
  "/alerts": "Alerts",
  "/incidents": "Incidents",
  "/impact": "Impact",
  "/buildings": "Buildings",
  "/recommendations": "Recommendations",
  "/notifications": "Notifications",
  "/profile": "Profile",
  "/settings": "Settings",
};

const Header = ({ setIsOpen }) => {
  const { darkMode, setDarkMode } = useContext(ThemeContext);
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [alertMenuOpen, setAlertMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(() => isAlertSoundEnabled());

  const headerRef = useRef(null);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!headerRef.current) return;
      if (headerRef.current.contains(event.target)) return;
      setUserMenuOpen(false);
      setAlertMenuOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    primeAlertAudio();
  }, []);

  useEffect(() => {
    const loadNotifications = async () => {
      const token = getAuthToken();
      if (!token) return;

      try {
        const res = await fetch(apiUrl("/api/notifications?limit=6"), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) return;

        const json = await res.json();
        setNotifications(Array.isArray(json?.notifications) ? json.notifications : []);
        setUnreadCount(Number(json?.unreadCount || 0));
      } catch (err) {
        console.error("Header notifications load failed:", err);
      }
    };

    loadNotifications();

    if (!socket.connected) socket.connect();

    const onNewNotification = (notification) => {
      if (!notification?._id) return;
      if (String(notification.userId || "") !== String(user?._id || "")) return;
      setNotifications((prev) => [notification, ...prev].slice(0, 6));
      setUnreadCount((count) => count + 1);
      playAlertSound({ priority: notification.priority, type: notification.type });
    };

    socket.on("newNotification", onNewNotification);

    return () => {
      socket.off("newNotification", onNewNotification);
    };
  }, [user?._id]);

  const toggleAlertSound = () => {
    const nextValue = !soundEnabled;
    setSoundEnabled(nextValue);
    setAlertSoundEnabled(nextValue);
  };

  const markNotificationRead = async (id) => {
    try {
      const token = getAuthToken();
      if (!token) return;

      await fetch(apiUrl(`/api/notifications/${id}/read`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotifications((prev) => prev.map((item) => (item._id === id ? { ...item, read: true } : item)));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (err) {
      console.error("Mark notification read failed:", err);
    }
  };

  const pageTitle = routeLabels[location.pathname] || "SustainOS";

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-30 border-b border-white/20 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl shadow-sm"
    >
      <div className="mx-auto flex min-h-[4.5rem] w-full max-w-[1600px] flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white/70 text-gray-700 transition hover:border-primary hover:text-primary dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-200 lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>

          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-lg font-bold tracking-tight text-gray-900 dark:text-white md:text-xl">
                <span className="text-primary">Sustain</span>OS
              </h1>
              <span className="hidden items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 sm:inline-flex">
                <Sparkles size={12} />
                Live
              </span>
            </div>
            <p className="hidden truncate text-xs text-gray-500 dark:text-gray-400 md:block">
              {pageTitle} · AI-powered campus monitoring
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 md:gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-300 lg:inline-flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Auto-refreshing
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setUserMenuOpen(false);
                setAlertMenuOpen((open) => !open);
              }}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white/70 text-gray-700 transition hover:border-primary hover:text-primary dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-200"
              aria-label="Notifications"
              aria-expanded={alertMenuOpen}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {alertMenuOpen && (
              <div className="fixed left-2 right-2 top-[4.75rem] z-50 max-h-[calc(100dvh-6rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-3 sm:w-[min(20rem,calc(100vw-1rem))]">
                <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{unreadCount} unread</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigate("/notifications");
                      setAlertMenuOpen(false);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary"
                  >
                    View all <ExternalLink size={12} />
                  </button>
                </div>

                <div className="max-h-[calc(100dvh-12rem)] overflow-y-auto overscroll-contain">
                  {notifications.slice(0, 4).length === 0 ? (
                    <div className="p-4 text-sm text-gray-500 dark:text-gray-400">No notifications yet.</div>
                  ) : (
                    notifications.slice(0, 4).map((item) => (
                      <button
                        key={item._id}
                        type="button"
                        onClick={async () => {
                          await markNotificationRead(item._id);
                          navigate(item.link || "/alerts");
                          setAlertMenuOpen(false);
                        }}
                        className="w-full border-b border-gray-100 px-4 py-3 text-left transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`${item.read ? "text-gray-400" : "text-primary"} mt-0.5`}>
                            {item.type === "SCORE" ? <Sparkles size={16} /> : <AlertTriangle size={16} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                                {item.title}
                              </p>
                              {!item.read && (
                                <span className="whitespace-nowrap rounded-full bg-red-500 px-2 py-0.5 text-[10px] text-white">
                                  NEW
                                </span>
                              )}
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                              {item.message}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className="hidden h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white/70 px-3 text-sm font-medium text-gray-700 transition hover:border-primary hover:text-primary dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-200 md:inline-flex"
            aria-label="Toggle theme"
          >
            <span className={`h-5 w-10 rounded-full p-1 transition ${darkMode ? "bg-primary" : "bg-gray-400"}`}>
              <span
                className={`block h-3 w-3 rounded-full bg-black transition ${
                  darkMode ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </span>
            {darkMode ? "Dark" : "Light"}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setAlertMenuOpen(false);
                setUserMenuOpen((open) => !open);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white/70 px-2.5 py-1.5 text-left transition hover:border-primary dark:border-gray-800 dark:bg-gray-900/70"
              aria-expanded={userMenuOpen}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-bold text-black">
                {user?.name ? user.name[0].toUpperCase() : "U"}
              </div>
              <div className="hidden min-w-0 md:block">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {user?.name || "User"}
                </p>
                <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                  {user?.email || "Account"}
                </p>
              </div>
              <ChevronDown size={16} className="text-gray-500 dark:text-gray-400" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-3 w-[min(14rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950">
                <button
                  type="button"
                  onClick={() => {
                    navigate("/profile");
                    setUserMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 transition hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-900"
                >
                  Profile
                </button>

                <div className="border-t border-gray-100 dark:border-gray-800" />

                <button
                  type="button"
                  onClick={() => {
                    setDarkMode(!darkMode);
                    setUserMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 transition hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-900"
                >
                  {darkMode ? "Light mode" : "Dark mode"}
                </button>

                <div className="border-t border-gray-100 dark:border-gray-800" />

                <button
                  type="button"
                  onClick={() => {
                    toggleAlertSound();
                    setUserMenuOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm text-gray-700 transition hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-900"
                >
                  <span>{soundEnabled ? "Alert sound on" : "Alert sound off"}</span>
                  {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>

                <div className="border-t border-gray-100 dark:border-gray-800" />

                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-red-500 transition hover:bg-red-500 hover:text-white"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
