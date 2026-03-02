import React from 'react';

const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 sm:p-6 md:p-8 z-50">
      <div className="bg-white p-4 sm:p-6 md:p-8 rounded-lg shadow-2xl max-w-sm sm:max-w-md md:max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="float-right text-2xl font-bold text-gray-500 hover:text-gray-700 transition">×</button>
        {children}
      </div>
    </div>
  );
};

export default Modal;
