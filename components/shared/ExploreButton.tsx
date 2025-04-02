"use client";

import React, { Dispatch, SetStateAction, useState } from 'react';
import { Plane, Text } from '@react-three/drei';
// import { Interactive } from '@react-three/xr'; // Removed import
import * as THREE from 'three';

// Define possible view states matching app/page.tsx
type ViewState = 'initial' | 'cardSelection';

interface ExploreButtonProps {
  setViewState: Dispatch<SetStateAction<ViewState>>;
  viewState: ViewState;
  position?: [number, number, number];
}

export default function ExploreButton({ 
  setViewState, 
  viewState, 
  position = [0, 1, 5] // Default position, adjust as needed
}: ExploreButtonProps) {
  const [hovered, setHover] = useState(false);

  const handleClick = () => {
    if (viewState === 'initial') {
      setViewState('cardSelection');
    }
  };

  return (
    <group position={position}>
      {/* <Interactive onSelect={handleClick}> */}
        <Plane
          args={[4, 1.2]} // Increased Width, Height
          onClick={handleClick} // Also handle regular clicks
          onPointerOver={() => setHover(true)}
          onPointerOut={() => setHover(false)}
        >
          <meshStandardMaterial 
            color={hovered ? '#e0e0e0' : '#ffffff'} 
            transparent 
            opacity={0.9}
            roughness={0.6}
            metalness={0.1}
          />
        </Plane>
        <Text
          position={[0, 0, 0.01]} // Slightly in front of the plane
          fontSize={0.4} // Increased font size
          color="#333333"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.005}
          outlineColor="#ffffff"
        >
          Explore Bookmarks
        </Text>
      {/* </Interactive> */}
    </group>
  );
} 