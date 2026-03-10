import React, { useContext } from "react";
import { Twitter, Linkedin, Github } from "lucide-react";
import { ThemeContext } from "../../context/ThemeContext";

const Footer = () => {
  const { darkMode } = useContext(ThemeContext);

  return (
    <footer
      className={`w-full border-t transition-colors duration-300
        ${darkMode ? "bg-darkBg border-gray-700" : "bg-white border-gray-300"}`}
    >
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-4">

        {/* Left: Copyright */}
        <p className={`text-sm transition-colors duration-300 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
          © {new Date().getFullYear()} SustainOS. All rights reserved.
        </p>

        {/* Center: Links */}
        <div className="flex gap-6 text-sm">
          {["About", "Contact", "Privacy"].map((link) => (
            <a
              key={link}
              href={`/${link.toLowerCase()}`}
              className={`relative group transition-colors duration-300
                ${darkMode ? "text-gray-400 hover:text-primary" : "text-gray-600 hover:text-primary"}`}
            >
              {link}
              <span
                className={`absolute left-0 -bottom-1 w-0 h-[2px] bg-primary transition-all duration-300 group-hover:w-full`}
              />
            </a>
          ))}
        </div>

        {/* Right: Social Icons */}
        <div className="flex gap-4">
          {[{icon: Twitter, link: "https://twitter.com"}, {icon: Linkedin, link: "https://linkedin.com"}, {icon: Github, link: "https://github.com"}].map((item, idx) => {
            const Icon = item.icon;
            return (
              <a
                key={idx}
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className={`transition-transform duration-300 hover:scale-110 ${
                  darkMode ? "text-gray-400 hover:text-primary" : "text-gray-600 hover:text-primary"
                }`}
              >
                <Icon size={18} />
              </a>
            );
          })}
        </div>
      </div>

      {/* Optional subtle bottom glow */}
      <div className={`h-1 w-full ${darkMode ? "bg-gradient-to-r from-primary/50 via-transparent to-primary/50" : "bg-gradient-to-r from-primary/30 via-transparent to-primary/30"}`} />
    </footer>
  );
};

export default Footer;