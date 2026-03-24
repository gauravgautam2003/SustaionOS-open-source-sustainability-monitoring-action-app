import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  BarChart3,
  History,
  FileText,
  Bell,
  ShieldAlert,
  Leaf,
  Building2,
  Lightbulb,
  Cpu,
  MapPin,
  Settings,
  User,
} from "lucide-react";

const menuItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Analytics", path: "/analytics", icon: BarChart3 },
  { name: "History", path: "/history", icon: History },
  { name: "Reports", path: "/reports", icon: FileText },
  { name: "Alerts", path: "/alerts", icon: Bell },
  { name: "Incidents", path: "/incidents", icon: ShieldAlert },
  { name: "Impact", path: "/impact", icon: Leaf },
  { name: "Buildings", path: "/buildings", icon: Building2 },
  { name: "Locations", path: "/locations", icon: MapPin },
  { name: "Recommendations", path: "/recommendations", icon: Lightbulb },
  { name: "Sensors", path: "/sensors", icon: Cpu },
  { name: "Settings", path: "/settings", icon: Settings },
  { name: "Profile", path: "/profile", icon: User },
];

const Sidebar = ({ isOpen, setIsOpen }) => {
  return (
    <>
      <div
        className={`fixed inset-0 bg-black/60 z-40 lg:hidden transition ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsOpen(false)}
      />

      <aside
        className={`fixed top-0 left-0 z-50 w-64 p-6 transition-transform duration-300
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 lg:static
        backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-r
        border-white/20 dark:border-gray-700 shadow-2xl flex flex-col`}
      >
        <h2 className="text-2xl font-bold mb-10">
          <span className="text-primary">Sustain</span>OS
        </h2>

        <nav className="flex flex-col gap-2">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group
                  ${
                    isActive
                      ? "bg-gradient-to-r from-primary to-purple-500 text-black shadow-lg scale-[1.03]"
                      : "text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-gray-800/40 hover:scale-[1.02]"
                  }`
                }
              >
                <Icon className="group-hover:scale-110 transition" size={20} />
                <span className="font-medium">{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto text-xs text-gray-500 dark:text-gray-400 pt-6">
          AI Powered Monitoring
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
