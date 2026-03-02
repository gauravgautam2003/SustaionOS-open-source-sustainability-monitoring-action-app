import React from 'react';

const BuildingsList = () => (
  <div className="min-h-screen pt-16 md:pt-20 lg:pt-24 px-3 sm:px-4 md:px-6 lg:px-8 bg-black/95 opacity-80 text-white">
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-6 md:mb-8 text-center">Buildings List</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
        <p className="text-gray-400 col-span-full text-center text-sm md:text-base">No buildings available</p>
      </div>
    </div>
  </div>
);

export default BuildingsList;
