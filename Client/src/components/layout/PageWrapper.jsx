import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import AIChatWidget from "../ai/AIChatWidget";
import Footer from "../ui/Footer"; // Pro-level footer

const PageWrapper = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[#f4f7fb] text-gray-900 transition-colors duration-300 dark:bg-[#060b16] dark:text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_24%)]" />
      {/* Sidebar + Content */}
      <div className="relative z-10 flex flex-1 w-full">
        <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

        <div className="flex-1 flex flex-col">
          {/* Header */}
          <Header setIsOpen={setIsOpen} />

          {/* Main Content */}
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>

      {/* Footer */}
      <Footer />
      
      {/* AI Chat Widget */}
      <AIChatWidget />
    </div>
  );
};

export default PageWrapper;
