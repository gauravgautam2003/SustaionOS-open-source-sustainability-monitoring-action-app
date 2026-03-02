import React from 'react';

const Button = ({ children, onClick, className = '' }) => (
  <button onClick={onClick} className={`px-3 sm:px-4 md:px-6 py-2 md:py-3 bg-blue-500 hover:bg-blue-600 text-white text-sm md:text-base font-medium rounded-md md:rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}>
    {children}
  </button>
);

export default Button;
