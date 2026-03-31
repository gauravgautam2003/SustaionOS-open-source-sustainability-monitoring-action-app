import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import AIChatWidget from "../ai/AIChatWidget";
import Footer from "../ui/Footer"; // Pro-level footer
import { lockBodyScroll, unlockBodyScroll } from "../../utils/scrollLock";

// PageWrapper component acts as the main layout wrapper
const PageWrapper = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  // Hook to track current route (used for re-rendering Header on route change)
  
  const location = useLocation();

   /**
   * Effect: Lock body scroll when sidebar is open
   * Prevents background scrolling for better UX
   */
  
  useEffect(() => {
    if (isOpen) {
      lockBodyScroll("sidebar");
      return;
    }

    unlockBodyScroll("sidebar");
  }, [isOpen]);

  /**
   * Effect: Listen for custom AI chat open/close events
   * Updates chatOpen state based on event detail
   */
  
  useEffect(() => {
    const onChatState = (event) => {
      setChatOpen(Boolean(event?.detail?.open));
    };

    // Add custom event listener
    window.addEventListener("sustainos:ai-chat-state", onChatState);
      // Cleanup listener on component unmount
    return () => window.removeEventListener("sustainos:ai-chat-state", onChatState);
  }, []);

  return (
    <div className="relative flex h-[100dvh] overflow-hidden bg-[#f4f7fb] text-gray-900 transition-colors duration-300 dark:bg-[#060b16] dark:text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_24%)]" />
      <div className="relative z-10 flex min-h-0 flex-1 w-full">
        <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              {/* Header re-renders on route change */}
          <Header key={location.pathname} setIsOpen={setIsOpen} />
              {/* Main content area */}
          <main
            className={`flex-1 min-h-0 overscroll-contain ${
              chatOpen ? "overflow-hidden" : "overflow-y-auto"
            }`}
          >
            <div className="mx-auto w-full max-w-[1600px] px-3 py-4 pb-24 sm:px-4 sm:py-5 sm:pb-28 md:px-6 lg:px-8 lg:py-8 lg:pb-8">
              {children}
            </div>
            <Footer />
          </main>
        </div>
      </div>
  {/* AI Chat widget (floating component) */}
      <AIChatWidget />
    </div>
  );
};

export default PageWrapper;
