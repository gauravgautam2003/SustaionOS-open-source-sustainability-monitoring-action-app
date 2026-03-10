import React from "react";

const Card = ({ children, className = "" }) => {
  return (
    <div
      className={`rounded-xl p-6 shadow-sm
      bg-white dark:bg-cardBg
      border border-gray-200 dark:border-gray-800
      transition-all duration-300
      ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;