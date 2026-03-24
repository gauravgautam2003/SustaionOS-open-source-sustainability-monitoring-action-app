import React from "react";

const Card = ({ children, className = "" }) => {
  return (
    <div
      className={`rounded-xl p-6 shadow-sm
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
