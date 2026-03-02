import React from 'react';

const AlertCard = ({ alert }) => (
  <div className="p-3 sm:p-4 md:p-5 lg:p-6 bg-red-100 rounded-md md:rounded-lg border border-red-300 hover:shadow-md transition-shadow duration-200">
    <p className="text-xs sm:text-sm md:text-base text-red-700 leading-relaxed">{alert.message}</p>
  </div>
);

export default AlertCard;
