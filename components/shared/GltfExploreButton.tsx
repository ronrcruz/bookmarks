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
  // Add Web Audio API props
  audioContext: AudioContext | null;
  audioStartTime: number | null;
  selectedLightId: number | null; // Add selectedLightId prop
}

// Helper easing function
function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
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
  isBeatAnimationEnabled,
  // Destructure Web Audio props
  audioContext,
  audioStartTime,
  selectedLightId, // Destructure selectedLightId
}: GltfExploreButtonProps) {
  
  const { scene } = useGLTF('/object.gltf');
  const groupRef = useRef<THREE.Group>(null!); // Ref for the main group for context menu logic
  const animationGroupRef = useRef<THREE.Group>(null!); // Ref for the inner group to apply animations
  // Get clock from useThree as a fallback or for other animations if needed
  const { clock } = useThree(); 

  // Store default scale and position for smooth transitions
  const defaultScale = useMemo(() => new THREE.Vector3(1, 1, 1), []);
  const defaultPosition = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  // Temporary vectors for calculations
  const targetPosition = useMemo(() => new THREE.Vector3(), []);
  const targetScaleVec = useMemo(() => new THREE.Vector3(), []);

  // --- Refs for Spin Animation State ---
  const spinTriggerTimeRef = useRef<number | null>(null);
  const spinStartRotationYRef = useRef<number>(0);
  const spinDuration = useRef<number>(0.4); // Duration of the spin (adjust as needed)
  const spinChance = 0.25; // 25% chance to spin on 4th beat
  // Ref to track the time of the last successful spin trigger for cooldown
  const lastSpinTriggerTimeRef = useRef<number | null>(null);
  const spinCooldown = 5; // Minimum seconds between spins

  // Animation and rotation logic within useFrame
  useFrame((state, delta) => {
    if (!animationGroupRef.current) return;

    // Initialize damping factors with default
    let currentPositionDamp = 0.15;
    let currentScaleDamp = 0.15;
    let rotationDampFactor = 0.25; // Default damping for mouse-look rotation

    // --- Base Bobbing Animation (using three clock again) ---
    const bobFrequency = 1.5;
    const bobAmplitude = 0.05;
    const currentBobY = Math.sin(clock.elapsedTime * bobFrequency) * bobAmplitude;

    // --- Target Rotation Initialization ---
    const targetRotationX = normalizedMousePosition.y * 0.2; // X rotation is always based on mouse Y
    // Initialize with current rotation as default
    let finalTargetRotationY: number = animationGroupRef.current.rotation.y;

    // --- Beat/Spin Calculation (only if audio is ready and animation enabled) ---
    let beatScaleMultiplier = 1;
    let beatZOffset = 0;
    let isSpinning = false; // Flag to check if currently spinning

    // Check if a spin is currently in progress
    if (spinTriggerTimeRef.current !== null && audioContext) {
      isSpinning = true;
      const currentAudioTime = audioContext.currentTime;
      const elapsedSpinTime = currentAudioTime - spinTriggerTimeRef.current;
      let spinProgress = Math.min(1, elapsedSpinTime / spinDuration.current);
      
      // Apply easing to spin
      const easedSpinProgress = easeInOutCubic(spinProgress);
      
      // Calculate target rotation based on spin progress
      const spinTargetY = spinStartRotationYRef.current + easedSpinProgress * (Math.PI * 2);
      finalTargetRotationY = spinTargetY; // Spin takes priority
      rotationDampFactor = 0.1; // Use faster damping during spin

      // Reset trigger when spin is complete
      if (spinProgress >= 1) {
        spinTriggerTimeRef.current = null;
      }
    }

    // --- Normal Beat & Mouse Look Logic (only if NOT spinning) ---
    let targetMouseLookY = 0; // Initialize mouse look Y
    if (!isSpinning) {
        // Calculate mouse-look Y rotation only when not spinning
        targetMouseLookY = normalizedMousePosition.x * 0.2;
        finalTargetRotationY = targetMouseLookY; // Set final target to mouse look

        // --- Normal Beat Logic (Scale/Offset/Damping) ---
        if (viewState === 'initial' && isBeatAnimationEnabled && audioContext && audioStartTime !== null) {
          const bpm = 122;
          const beatPeriod = 60 / bpm;
          spinDuration.current = beatPeriod * 0.85; // Make spin duration related to beat period
          const beatFrequencyRad = (Math.PI * 2) / beatPeriod;

          const currentAudioTime = audioContext.currentTime;
          const elapsedAudioTime = currentAudioTime - audioStartTime;
          const beatCount = Math.floor(elapsedAudioTime / beatPeriod);

          // --- Check for 4th Beat Spin Trigger ---
          // Check beat count > 0 to avoid triggering on the very first frame if random hits
          if (beatCount > 0 && beatCount % 4 === 3 && Math.random() < spinChance) {
            // --- Add Cooldown Check ---
            if (lastSpinTriggerTimeRef.current === null || currentAudioTime - lastSpinTriggerTimeRef.current >= spinCooldown) {
              // Trigger spin! (Cooldown passed)
              spinTriggerTimeRef.current = currentAudioTime;
              spinStartRotationYRef.current = animationGroupRef.current.rotation.y; // Store current Y rotation
              // Update the last successful trigger time for cooldown
              lastSpinTriggerTimeRef.current = currentAudioTime;
            }
            // Don't calculate beat scale/offset when triggering a spin or during cooldown
          } else {
            // --- Calculate Normal Beat Animation (Scale/Offset) ---
            const beatPhase = (elapsedAudioTime % beatPeriod) * beatFrequencyRad;
            const pulse = (Math.cos(beatPhase) + 1) / 2;
            const easedPulse = pulse === 1 ? 1 : 1 - Math.pow(2, -10 * pulse);

            beatScaleMultiplier = 1 + easedPulse * 0.25;
            beatZOffset = easedPulse * 0.5;

            // Determine Damping for normal beat
            const expandDamp = 0.2;
            const contractDamp = 0.08;
            currentPositionDamp = beatPhase >= Math.PI ? contractDamp : expandDamp;
            currentScaleDamp = beatPhase >= Math.PI ? contractDamp : expandDamp;
          }
        }
    } // End of !isSpinning block

    // --- Combine Target Position (Bobbing + Beat Offset) ---
    targetPosition.set(0, currentBobY + beatZOffset, 0); // Apply bobbing and Z offset if any
    // Note: The beat Z offset happens along the local Z axis relative to rotation.
    // If we want it world Z, we need more complex vector math.
    // Let's apply Z offset *before* rotation damping for simplicity for now.
    // Update: Applying Z offset to the position directly might be less intuitive than
    // moving the group along its local Z. Let's revert position Z offset and apply later if needed.
    targetPosition.set(0, currentBobY, 0); // Only bobbing for now

    // --- Combine Target Scale ---
    targetScaleVec.set(beatScaleMultiplier, beatScaleMultiplier, beatScaleMultiplier);

    // --- Apply Damping ---
    // Damp position towards target (bobbing only for now)
    easing.damp3(animationGroupRef.current.position, targetPosition, currentPositionDamp, delta);

    // Damp scale towards target (beat scale or default 1)
    easing.damp3(animationGroupRef.current.scale, targetScaleVec, currentScaleDamp, delta);

    // Damp rotation towards target (mouse look OR spin)
    easing.dampE(
      animationGroupRef.current.rotation,
      [targetRotationX, finalTargetRotationY, 0], // Use the final calculated Y target
      rotationDampFactor, // Use conditional damping factor
      delta // Frame delta time
    );

    // --- Apply Z offset translation *after* rotation ---
    // This makes the object move along its current facing direction (local Z)
    if (!isSpinning && beatZOffset !== 0) {
      const localZVector = new THREE.Vector3(0, 0, 1);
      localZVector.applyQuaternion(animationGroupRef.current.quaternion); // Get world direction of local Z
      localZVector.multiplyScalar(beatZOffset * 0.1); // Scale offset amount (reduce effect)
      // Damp this translation separately? Or just add? Let's try adding for now.
      // This direct addition isn't ideal, damping would be better.
      // For a quick effect, let's try a small direct nudge (may look jittery)
      // animationGroupRef.current.position.add(localZVector.multiplyScalar(delta)); // Needs refinement
      // Let's omit the Z offset for now to keep spin clean.
    }

  });

  // Modified handleClick to handle Inspect Mode
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    console.log("[GltfExploreButton] handleClick fired."); // Log entry
    // Prevent default click action from bubbling up
    event.stopPropagation(); 

    // Log the state of modes
    console.log(`[GltfExploreButton] Modes - isInspectMode: ${isInspectMode}, isLightPlacementMode: ${isLightPlacementMode}, isDebugMode: ${isDebugMode}`);

    // --- Inspect Mode Logic --- 
    if (isInspectMode) {
      console.log("[Inspect Mode] Condition met. Processing click..."); // Log entering inspect logic
      const clickedObject = event.object; // The specific mesh clicked
      const intersection = event.intersections[0]; // Get the first intersection for more data

      let info: object | string = `Clicked: ${clickedObject.name || 'Unnamed Object'}`;

      // Check if it's a Mesh with a Standard Material
      if (clickedObject instanceof THREE.Mesh && clickedObject.material instanceof THREE.MeshStandardMaterial) {
        const material = clickedObject.material;
        info = {
          meshName: clickedObject.name || 'Unnamed Mesh',
          materialName: material.name || 'Unnamed Material',
          materialType: material.type,
          color: `#${material.color.getHexString()}`,
          metalness: material.metalness.toFixed(2),
          roughness: material.roughness.toFixed(2),
          // --- Check for Bump Map --- 
          bumpMap: material.bumpMap 
            ? `Applied (${material.bumpMap.name || material.bumpMap.source?.data?.src || 'Unknown Texture'})` 
            : 'None',
          bumpScale: material.bumpMap ? material.bumpScale.toFixed(2) : 'N/A',
          // --- Add other relevant properties --- 
          visible: clickedObject.visible,
          position: `(${clickedObject.position.x.toFixed(2)}, ${clickedObject.position.y.toFixed(2)}, ${clickedObject.position.z.toFixed(2)})`,
          // Add intersection point if available
          intersectionPoint: intersection 
            ? `(${intersection.point.x.toFixed(2)}, ${intersection.point.y.toFixed(2)}, ${intersection.point.z.toFixed(2)})`
            : 'N/A',
        };
        console.log("[Inspect Mode] Inspected Part Info:", info);
      } else {
        // Basic info for non-standard meshes or groups
        info = {
            name: clickedObject.name || 'Unnamed Object',
            type: clickedObject.type,
            position: `(${clickedObject.position.x.toFixed(2)}, ${clickedObject.position.y.toFixed(2)}, ${clickedObject.position.z.toFixed(2)})`,
        };
      }

      setInspectedPartInfo(info);
      console.log("[Inspect Mode] setInspectedPartInfo called with:", info); // Log info being set
      return; // Don't proceed to other click logic if inspecting
    }

    // --- Light Placement Mode Logic --- (Prevent normal click)
    if (isLightPlacementMode) {
        console.log("[Light Placement] Click prevented, use Right-Click.");
        return; 
    }

    // --- Debug Mode Logic --- (Prevent normal click)
    if (isDebugMode) {
      console.log("[Debug Mode] Normal GLTF click prevented.");
      return;
    }

    // --- Normal Click Logic (Transition View) --- 
    console.log("[GltfExploreButton] Executing normal click logic (setViewState)..."); // Log normal action
    setViewState('cardSelection');
  };

  const handleContextMenu = (event: ThreeEvent<MouseEvent>) => {
    console.log("[GltfExploreButton] handleContextMenu fired."); // Log entry
    console.log("[GltfExploreButton] isLightPlacementMode:", isLightPlacementMode); // Log mode status

    if (isLightPlacementMode) {
      event.stopPropagation();
      event.nativeEvent.preventDefault(); // Use nativeEvent for preventDefault
      
      // Get the world intersection point
      const worldPoint = event.point;
      console.log("[GltfExploreButton] World Intersection Point:", worldPoint);
      
      // Call the function passed from parent to add the light using WORLD position
      console.log("[GltfExploreButton] Calling addPlacedLight with world point...");
      addPlacedLight([worldPoint.x, worldPoint.y, worldPoint.z]); // Pass world coordinates
    }
    // Do nothing if not in light placement mode (allow default context menu)
    console.log("[GltfExploreButton] Context menu default allowed (not in placement mode or error).");
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
      // Add onPointerMissed to clear inspection when clicking background (optional)
      onPointerMissed={() => {
          if (isInspectMode) {
              console.log("[Inspect Mode] Clicked background, clearing info.");
              setInspectedPartInfo(null); 
          }
      }}
    >
      {/* Inner group for animations */}
      <group ref={animationGroupRef}>
        <primitive object={scene} />
      </group>
      
      {/* REMOVE direct rendering of placed lights */}
      {/* The PlacedLightController in DesktopScene now handles this */}
      {/* {placedLights.map(light => (...))} */}

    </group>
  );
} 