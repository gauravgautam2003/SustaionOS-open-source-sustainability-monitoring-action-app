import React, { useState, useContext } from "react";
import { Menu, Bell, User, ChevronDown } from "lucide-react";
import { ThemeContext } from "../../context/ThemeContext";

const Header = ({ setIsOpen }) => {
  const { darkMode, setDarkMode } = useContext(ThemeContext);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(true); // dummy login state

  return (
    <header
      className={`h-16 flex items-center justify-between px-4 md:px-6 border-b transition-colors duration-300
      ${darkMode ? "bg-cardBg border-gray-800" : "bg-white border-gray-300"}`}
    >
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Hamburger for mobile */}
        <Menu
          className={`cursor-pointer lg:hidden ${darkMode ? "text-white" : "text-black"}`}
          onClick={() => setIsOpen(true)}
        />

        {/* Logo */}
        <h1 className={`text-xl font-semibold ${darkMode ? "text-white" : "text-black"}`}>
          Sustain<span className="text-primary">OS</span>
        </h1>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4 relative">
        <Bell
          className={`cursor-pointer transition hover:text-primary ${
            darkMode ? "text-gray-400" : "text-gray-600"
          }`}
        />

        {/* User Dropdown */}
        <div className="relative">
          <div
            className="flex items-center gap-1 cursor-pointer select-none"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
          >
            <User
              className={`${darkMode ? "text-gray-400" : "text-gray-600"} transition`}
            />
            <ChevronDown
              size={16}
              className={`${darkMode ? "text-gray-400" : "text-gray-600"} transition`}
            />
          </div>

          {userMenuOpen && (
            <div
              className={`absolute right-0 mt-2 w-40 bg-white dark:bg-cardBg border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg z-50`}
            >
              {loggedIn ? (
                <>
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-t-lg"
                  >
                    Profile
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-b-lg"
                    onClick={() => {
                      setLoggedIn(false);
                      setUserMenuOpen(false);
                    }}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  className="w-full text-left px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
                  onClick={() => {
                    setLoggedIn(true);
                    setUserMenuOpen(false);
                  }}
                >
                  Login
                </button>
              )}
            </div>
          )}
        </div>

        {/* Dark/Light Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`w-12 h-6 flex items-center rounded-full p-1 transition ${
            darkMode ? "bg-primary" : "bg-gray-400"
          }`}
        >
          <div
            className={`bg-black w-4 h-4 rounded-full transform transition ${
              darkMode ? "translate-x-6" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </header>
  );
};

export default Header;