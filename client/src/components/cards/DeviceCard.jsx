import React from 'react';

const DeviceCard = ({ device }) => (
  <div className="p-3 sm:p-4 md:p-5 lg:p-6 bg-white shadow rounded-md md:rounded-lg hover:shadow-lg transition-shadow duration-200 h-full">
    <h4 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 truncate">{device.name}</h4>
  </div>
);

export default DeviceCard;
