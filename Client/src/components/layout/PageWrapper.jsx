import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import AIChatWidget from "../ai/AIChatWidget";
import Footer from "../ui/Footer"; // Pro-level footer

const PageWrapper = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#f4f7fb] text-gray-900 transition-colors duration-300 dark:bg-[#060b16] dark:text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_24%)]" />
      <div className="relative z-10 flex min-h-0 flex-1 w-full">
        <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header key={location.pathname} setIsOpen={setIsOpen} />

          <main className="flex-1 overflow-y-auto overscroll-contain">
            <div className="mx-auto w-full max-w-[1600px] p-4 md:p-6 lg:p-8">
              {children}
            </div>
            <Footer />
          </main>
        </div>
      </div>

      <AIChatWidget />
    </div>
  );
};

export default PageWrapper;
