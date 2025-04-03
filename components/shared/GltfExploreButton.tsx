"use client";

import React, { Dispatch, SetStateAction, useRef, useMemo } from 'react';
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
  // Add viewState prop
  viewState: ViewState;
  // Add prop to toggle beat animation
  isBeatAnimationEnabled: boolean;
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
  isDebugMode,
  // Destructure viewState
  viewState,
  // Destructure animation toggle
  isBeatAnimationEnabled
}: GltfExploreButtonProps) {
  
  const { scene } = useGLTF('/object.gltf');
  const groupRef = useRef<THREE.Group>(null!); // Ref for the main group for context menu logic
  const animationGroupRef = useRef<THREE.Group>(null!); // Ref for the inner group to apply animations
  const { clock } = useThree(); // Get clock for bobbing animation
  // Store default scale and position for smooth transitions
  const defaultScale = useMemo(() => new THREE.Vector3(1, 1, 1), []);
  const defaultPosition = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  // Temporary vectors for calculations
  const targetPosition = useMemo(() => new THREE.Vector3(), []);
  const targetScaleVec = useMemo(() => new THREE.Vector3(), []);

  // Animation and rotation logic within useFrame
  useFrame((state, delta) => {
    if (!animationGroupRef.current) return;

    // Initialize damping factors with default
    let currentPositionDamp = 0.15;
    let currentScaleDamp = 0.15;

    // --- Base Bobbing Animation ---
    const bobFrequency = 1.5;
    const bobAmplitude = 0.05;
    const currentBobY = Math.sin(clock.elapsedTime * bobFrequency) * bobAmplitude;

    // --- Beat Animation (only in initial view) ---
    let beatScaleMultiplier = 1;
    let beatZOffset = 0;

    if (viewState === 'initial' && isBeatAnimationEnabled) {
      const bpm = 120;
      const beatPeriod = 60 / bpm; // Seconds per beat
      const beatFrequencyRad = (Math.PI * 2) / beatPeriod; // Radians per second

      // Use cosine for a peak at the start of the cycle, map to 0-1 range
      const beatPhase = (clock.elapsedTime % beatPeriod) * beatFrequencyRad;
      const pulse = (Math.cos(beatPhase) + 1) / 2; // Maps -1 to 1 range -> 0 to 1 range

      // Apply easing to the pulse for a sharper beat
      // Use the mathematical formula for easeOutExpo directly
      const easedPulse = pulse === 1 ? 1 : 1 - Math.pow(2, -10 * pulse);

      beatScaleMultiplier = 1 + easedPulse * 0.25; // INCREASED Scale bumps up by 25%
      beatZOffset = easedPulse * 0.5; // INCREASED Moves forward more

      // --- Determine Damping based on Phase ---
      // Use faster damping when returning (second half of the cycle)
      const expandDamp = 0.2;  // Slightly slower expansion
      const contractDamp = 0.08; // Much faster contraction
      currentPositionDamp = beatPhase >= Math.PI ? contractDamp : expandDamp;
      currentScaleDamp = beatPhase >= Math.PI ? contractDamp : expandDamp;

    }

    // --- Combine Animations ---
    // Set target position including bobbing and beat offset
    targetPosition.set(0, currentBobY, beatZOffset);
    // Set target scale based on beat
    targetScaleVec.set(beatScaleMultiplier, beatScaleMultiplier, beatScaleMultiplier);

    // --- Smooth Rotation (always active) ---
    const targetRotationX = normalizedMousePosition.y * 0.2; // Rotate around X based on mouse Y
    const targetRotationY = normalizedMousePosition.x * 0.2; // Rotate around Y based on mouse X

    // --- Apply Damping ---
    // Damp position towards target (bob + beat offset)
    easing.damp3(animationGroupRef.current.position, targetPosition, currentPositionDamp, delta);

    // Damp scale towards target (beat scale or default 1)
    easing.damp3(animationGroupRef.current.scale, targetScaleVec, currentScaleDamp, delta);

    // Damp rotation towards target (mouse look)
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