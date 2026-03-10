import { NavLink } from "react-router-dom";
import { LayoutDashboard, BarChart3, History, FileText, Settings } from "lucide-react";
import { useContext } from "react";
import { ThemeContext } from "../../context/ThemeContext";

const menuItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Analytics", path: "/analytics", icon: BarChart3 },
  { name: "History", path: "/history", icon: History },
  { name: "Reports", path: "/reports", icon: FileText },
  { name: "Settings", path: "/settings", icon: Settings },
];

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { darkMode } = useContext(ThemeContext);

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 w-64 p-6 border-r transition-transform duration-300
          ${darkMode ? "bg-cardBg border-gray-800" : "bg-white border-gray-300"}
          transform ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:static lg:block shadow-lg
          flex flex-col min-h-screen overflow-y-auto
          scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-800
        `}
      >
        {/* Brand */}
        <h2 className={`text-xl font-bold mb-8 transition-colors duration-300 ${darkMode ? "text-white" : "text-black"}`}>
          SustainOS
        </h2>

        {/* Menu Items */}
        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-all duration-300
                  ${isActive
                    ? "bg-primary text-black font-medium shadow-md hover:shadow-lg"
                    : darkMode
                    ? "text-gray-400 hover:bg-gray-700 hover:text-white hover:shadow-sm"
                    : "text-gray-700 hover:bg-gray-200 hover:text-black hover:shadow-sm"
                  }`
                }
              >
                <Icon size={18} />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        {/* Pro Badge / Footer */}
        <div className="mt-auto text-xs text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-700 hover:text-primary transition-all duration-300">
          ⭐ Premium Features
        </div>
      </aside>
    </>
  );
};

export default Sidebar;