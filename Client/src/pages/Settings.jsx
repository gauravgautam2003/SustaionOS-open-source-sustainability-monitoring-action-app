import React, { useState, useContext } from "react";
import Card from "../components/ui/Card";
import { ThemeContext } from "../context/ThemeContext";

const Settings = () => {
  const [notifications, setNotifications] = useState(true);
  const { darkMode, setDarkMode } = useContext(ThemeContext);

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">
          Account Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage your preferences & system configuration
        </p>
      </div>

      {/* Profile Section */}
      <Card>
        <h3 className="text-lg font-semibold mb-6">
          Profile Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <input
            type="text"
            placeholder="Full Name"
            className="bg-gray-200 dark:bg-gray-900
                       border border-gray-300 dark:border-gray-700
                       text-gray-900 dark:text-white
                       px-4 py-2 rounded-lg text-sm
                       transition-colors duration-300"
          />

          <input
            type="email"
            placeholder="Email Address"
            className="bg-gray-200 dark:bg-gray-900
                       border border-gray-300 dark:border-gray-700
                       text-gray-900 dark:text-white
                       px-4 py-2 rounded-lg text-sm
                       transition-colors duration-300"
          />
        </div>

        <button className="mt-6 bg-primary text-black px-4 py-2 rounded-lg hover:scale-105 transition">
          Save Changes
        </button>
      </Card>

      {/* Preferences Section */}
      <Card>
        <h3 className="text-lg font-semibold mb-6">
          Preferences
        </h3>

        <div className="space-y-6">

          {/* Notifications Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm">
              Enable Email Notifications
            </span>

            <button
              onClick={() => setNotifications(!notifications)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition ${
                notifications
                  ? "bg-primary"
                  : "bg-gray-400 dark:bg-gray-600"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                  notifications ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm">
              Dark Mode
            </span>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition ${
                darkMode
                  ? "bg-primary"
                  : "bg-gray-400 dark:bg-gray-600"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                  darkMode ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="border border-red-400/40 dark:border-red-600/40">
        <h3 className="text-lg font-semibold text-red-500 mb-4">
          Danger Zone
        </h3>

        <button className="bg-red-500 text-white px-4 py-2 rounded-lg hover:scale-105 transition">
          Delete Account
        </button>
      </Card>

    </div>
  );
};

export default Settings;