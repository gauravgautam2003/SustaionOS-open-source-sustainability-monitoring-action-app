import React from "react";

// Creaate Card Component for render anywhere in the SustainOS
// Fetch Data in the form of Children and show data on Dashboard as card 
// it will be fetch CSS properties that come from client

const Card = ({ children, className = "" }) => {
  return (
    <div
      className={`rounded-xl p-4 shadow-sm sm:p-6
      bg-white/90 dark:bg-gray-950/70 backdrop-blur-xl
      border border-white/40 dark:border-white/5
      shadow-[0_10px_40px_rgba(15,23,42,0.08)]
      transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(15,23,42,0.12)]
      ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
