"use client";

import React, { Dispatch, SetStateAction } from 'react';
import { LuHeartPulse, LuHeartOff } from 'react-icons/lu';

interface BeatToggleProps {
  isBeatEnabled: boolean;
  setIsBeatEnabled: Dispatch<SetStateAction<boolean>>;
}

export default function BeatToggle({ isBeatEnabled, setIsBeatEnabled }: BeatToggleProps) {
  const handleClick = () => {
    setIsBeatEnabled(prev => !prev);
  };

  return (
    <button
      onClick={handleClick}
      // Added explicit background color and hover state for visibility
      className="relative z-0 p-2 rounded-full bg-pink-500 text-white shadow-md hover:bg-pink-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-opacity-75"
      aria-label={isBeatEnabled ? 'Disable beat animation' : 'Enable beat animation'}
    >
      {isBeatEnabled ? (
        <LuHeartPulse size={24} />
      ) : (
        <LuHeartOff size={24} />
      )}
    </button>
  );
} 