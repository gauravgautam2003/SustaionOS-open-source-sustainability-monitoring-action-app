import React from 'react';

const MetricCard = ({ title, value }) => (
  <div className="p-3 sm:p-4 md:p-5 lg:p-6 bg-white shadow rounded-md md:rounded-lg hover:shadow-lg transition-shadow duration-200">
    <h3 className="text-xs sm:text-sm md:text-base font-semibold text-gray-900 mb-2 md:mb-3">{title}</h3>
    <p className="text-lg sm:text-2xl md:text-3xl font-bold text-green-600">{value}</p>
  </div>
);

export default MetricCard;
