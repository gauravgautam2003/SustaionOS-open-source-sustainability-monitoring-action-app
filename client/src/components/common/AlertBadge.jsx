import React from 'react';

const AlertBadge = ({ type = 'info', message }) => {
  const colors = {
    info: 'bg-blue-200 text-blue-800',
    warning: 'bg-yellow-200 text-yellow-800',
    error: 'bg-red-200 text-red-800',
    success: 'bg-green-200 text-green-800',
  };

  return (
    <span className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${colors[type]}`}>{message}</span>
  );
};

export default AlertBadge;
