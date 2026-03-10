import React, { useContext } from "react";
import { Github, Linkedin, Twitter } from "lucide-react";
import { ThemeContext } from "../../context/ThemeContext";

const Footer = () => {
  const { darkMode } = useContext(ThemeContext);

  return (
    <footer
      className={`w-full border-t transition-colors duration-300
      ${darkMode ? "bg-cardBg border-gray-800" : "bg-white border-gray-300"} 
      py-6 px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4`}
    >
      {/* Left: Branding */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <span>&copy; {new Date().getFullYear()} SustainOS</span>
        <span className="hidden md:inline">| All rights reserved</span>
      </div>

      {/* Center: Links */}
      <div className="flex items-center gap-4 text-sm">
        <a
          href="#"
          className="hover:text-primary transition-colors duration-300"
        >
          Privacy Policy
        </a>
        <a
          href="#"
          className="hover:text-primary transition-colors duration-300"
        >
          Terms of Service
        </a>
      </div>

      {/* Right: Social Icons */}
      <div className="flex items-center gap-3">
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className={`hover:text-primary transition-colors duration-300`}
        >
          <Github size={20} />
        </a>
        <a
          href="https://linkedin.com"
          target="_blank"
          rel="noopener noreferrer"
          className={`hover:text-primary transition-colors duration-300`}
        >
          <Linkedin size={20} />
        </a>
        <a
          href="https://twitter.com"
          target="_blank"
          rel="noopener noreferrer"
          className={`hover:text-primary transition-colors duration-300`}
        >
          <Twitter size={20} />
        </a>
      </div>
    </footer>
  );
};

export default Footer;