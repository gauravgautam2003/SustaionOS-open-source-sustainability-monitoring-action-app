import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import AIChatWidget from "../ai/AIChatWidget";
import Footer from "../ui/Footer"; // Pro-level footer

const PageWrapper = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-darkBg text-gray-900 dark:text-white transition-colors duration-300">
      {/* Sidebar + Content */}
      <div className="flex flex-1 w-full">
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