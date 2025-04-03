"use client";

import React, { Dispatch, SetStateAction, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { easing } from 'maath';

// Type for the placed lights, should match DesktopScene
interface PlacedLight {
  id: number;
  position: [number, number, number];
}

// Define possible view states matching app/page.tsx or DesktopScene.tsx
type ViewState = 'initial' | 'cardSelection';

interface GltfExploreButtonProps {
  setViewState: Dispatch<SetStateAction<ViewState>>;
  position?: [number, number, number];
  // Add scale prop if needed later
  scale?: number | [number, number, number]; 
  // Add new props received from DesktopScene
  isLightPlacementMode: boolean;
  addPlacedLight: (localPosition: [number, number, number]) => void;
  placedLights: PlacedLight[];
  // Add props for light controls
  lightIntensity: number;
  lightDistance: number;
  lightColor: string;
  // Add props for inspect mode
  isInspectMode: boolean;
  setInspectedPartInfo: Dispatch<SetStateAction<object | string | null>>;
  setIsInspectMode: Dispatch<SetStateAction<boolean>>; // Optional: To turn off mode after click
  // Add the new prop for normalized mouse position
  normalizedMousePosition: { x: number; y: number };
  // Add prop for debug mode
  isDebugMode: boolean;
}

// Preload the model for better performance
useGLTF.preload('/object.gltf');

export default function GltfExploreButton({ 
  setViewState, 
  position = [0, 0, 0], // Default position
  scale = 1, // Default scale
  // Destructure new props
  isLightPlacementMode,
  addPlacedLight,
  placedLights,
  lightIntensity,
  lightDistance,
  lightColor,
  // Destructure new props for inspect mode
  isInspectMode,
  setInspectedPartInfo,
  setIsInspectMode,
  // Destructure the normalized mouse position
  normalizedMousePosition,
  // Destructure debug mode
  isDebugMode
}: GltfExploreButtonProps) {
  
  const { scene } = useGLTF('/object.gltf');
  const groupRef = useRef<THREE.Group>(null!); // Ref for the main group for context menu logic
  const animationGroupRef = useRef<THREE.Group>(null!); // Ref for the inner group to apply animations
  const { clock } = useThree(); // Get clock for bobbing animation

  // Animation and rotation logic within useFrame
  useFrame((state, delta) => {
    if (!animationGroupRef.current) return;

    // Subtle bobbing animation
    const bobFrequency = 1.5;
    const bobAmplitude = 0.05;
    animationGroupRef.current.position.y = Math.sin(clock.elapsedTime * bobFrequency) * bobAmplitude;

    // Smooth rotation based on normalized mouse position
    const targetRotationX = normalizedMousePosition.y * 0.2; // Rotate around X based on mouse Y
    const targetRotationY = normalizedMousePosition.x * 0.2; // Rotate around Y based on mouse X

    // Damp rotation towards target
    easing.dampE(
      animationGroupRef.current.rotation,
      [targetRotationX, targetRotationY, 0], // Target Euler rotation
      0.25, // Smoothing factor
      delta // Frame delta time
    );
  });

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    // Guard: Prevent click action if debug mode is active
    if (isDebugMode) {
      console.log("[GltfExploreButton] Click prevented in debug mode.");
      event.stopPropagation();
      return;
    }
    // Prevent placement if just regular clicking
    if (isLightPlacementMode) {
        event.stopPropagation(); 
        return; 
    }
    event.stopPropagation(); 
    console.log("GLTF Explore Button Clicked! Triggering state change.");
    setViewState('cardSelection');
  };

  const handleContextMenu = (event: ThreeEvent<MouseEvent>) => {
    if (isLightPlacementMode) {
      event.stopPropagation();
      event.nativeEvent.preventDefault(); // Use nativeEvent for preventDefault
      
      // Get the world intersection point
      const worldPoint = event.point;
      
      // Get the inverse of the group's world matrix
      const inverseWorldMatrix = groupRef.current.matrixWorld.clone().invert();
      
      // Transform the world point to local coordinates
      const localPoint = worldPoint.clone().applyMatrix4(inverseWorldMatrix);
      
      // Call the function passed from parent to add the light
      addPlacedLight([localPoint.x, localPoint.y, localPoint.z]);
    }
    // Do nothing if not in light placement mode (allow default context menu)
  };

  // We wrap the loaded scene in a group to easily apply position, scale, and onClick
  // Make sure the GLTF origin is suitable, or adjust position/pivot within the group/scene
  return (
    <group 
      ref={groupRef} // Assign ref to the outer group
      position={position} 
      scale={scale} 
      // Event handlers remain on the outer group
      onClick={handleClick} 
      onContextMenu={handleContextMenu} // Add context menu handler
    >
      {/* Inner group for animations */}
      <group ref={animationGroupRef}>
        <primitive object={scene} />
      </group>
      
      {/* Dynamically render lights based on the placedLights prop */}
      {placedLights.map(light => (
        <pointLight
          key={light.id} // Use unique ID for key
          position={light.position} // Use position from the state
          intensity={lightIntensity}         
          distance={lightDistance}          
          color={lightColor}     
          decay={2}             
        />
      ))}
    </group>
  );
} 