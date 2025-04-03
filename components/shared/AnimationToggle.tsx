"use client";

import React, { Dispatch, SetStateAction } from 'react';
import { LuHeartPulse, LuHeartOff } from 'react-icons/lu'; // Using Lucide icons

interface AnimationToggleProps {
  isEnabled: boolean;
  setIsEnabled: Dispatch<SetStateAction<boolean>>;
}

export default function AnimationToggle({ isEnabled, setIsEnabled }: AnimationToggleProps) {
  const handleClick = () => {
    setIsEnabled(prev => !prev);
  };

  return (
    <button
      onClick={handleClick}
      className="absolute top-4 left-4 z-50 p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-md hover:bg-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
      aria-label={isEnabled ? 'Disable beat animation' : 'Enable beat animation'}
    >
      {isEnabled ? (
        <LuHeartPulse size={24} className="text-red-500" />
      ) : (
        <LuHeartOff size={24} className="text-gray-500" />
      )}
    </button>
  );
} 