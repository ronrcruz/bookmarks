"use client";

import React, { Dispatch, SetStateAction } from 'react';
import { LuPlay, LuPause } from 'react-icons/lu'; // Changed icons

// Renamed interface and props
interface MusicToggleProps {
  isMusicPlaying: boolean;
  onToggleClick: () => void;
}

// Renamed component and props
export default function MusicToggle({ isMusicPlaying, onToggleClick }: MusicToggleProps) {
  const handleClick = () => {
    onToggleClick();
  };

  return (
    <button
      onClick={handleClick}
      // Added explicit background color and hover state for visibility
      className="relative z-10 p-2 rounded-full bg-blue-500 text-white shadow-md hover:bg-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-opacity-75"
      aria-label={isMusicPlaying ? 'Pause music' : 'Play music'}
    >
      {isMusicPlaying ? (
        <LuPause size={24} />
      ) : (
        <LuPlay size={24} />
      )}
    </button>
  );
} 