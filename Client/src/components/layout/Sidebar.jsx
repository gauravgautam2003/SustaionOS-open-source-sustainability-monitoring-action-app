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
  X,
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
  { name: "Mission Control", path: "/recommendations", icon: Lightbulb },
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
        className={`fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-[min(18rem,88vw)] flex-col overflow-y-auto border-r border-white/20 bg-white/70 p-4 shadow-2xl backdrop-blur-xl transition-transform duration-300
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        dark:border-gray-700 dark:bg-gray-900/70
        lg:static lg:w-72 lg:translate-x-0 lg:p-6`}
      >
        <div className="mb-8 flex items-start justify-between gap-3">
          <h2 className="text-2xl font-bold">
            <span className="text-primary">Sustain</span>OS
          </h2>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white/80 text-gray-700 transition hover:border-primary hover:text-primary dark:border-gray-800 dark:bg-gray-900/80 dark:text-gray-200 lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1.5 sm:gap-2">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-all duration-300 group sm:py-3 sm:text-base
                  ${
                    isActive
                      ? "bg-gradient-to-r from-primary to-purple-500 text-black shadow-lg scale-[1.03]"
                      : "text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-gray-800/40 hover:scale-[1.02]"
                  }`
                }
              >
                <Icon className="transition group-hover:scale-110" size={18} />
                <span className="font-medium">{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 text-[11px] text-gray-500 dark:text-gray-400 sm:text-xs">
          AI Powered Monitoring
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
