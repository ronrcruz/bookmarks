"use client";

import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const MOVE_SPEED = 5;
const VERTICAL_SPEED = 3; // Speed for R/F keys
const ROTATION_SPEED = Math.PI / 2; // Base speed for arrow key rotation (radians per second)
const ROLL_SPEED = Math.PI / 2; // Radians per second for Q/E keys

export default function DebugKeyboardControls() {
  const { camera } = useThree();
  const keys = useRef<{ [key: string]: boolean }>({});

  // Movement vectors
  const moveForward = useRef(new THREE.Vector3());
  const moveRight = useRef(new THREE.Vector3());
  const velocity = useRef(new THREE.Vector3());

  // REMOVED: Rotation helpers (using direct quaternion manipulation now)
  // const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ')); 
  // const vec = useRef(new THREE.Vector3());

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent browser scrolling with arrow keys/space etc. if needed
      // if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      //   event.preventDefault();
      // }
      keys.current[event.code] = true;
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      keys.current[event.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // REMOVED: Initialize Euler angles 
    // euler.current.setFromQuaternion(camera.quaternion);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Removed camera.quaternion dependency

  useFrame((state, delta) => {
    velocity.current.set(0, 0, 0);
    const effectiveRotationSpeed = ROTATION_SPEED * delta;
    const effectiveRollSpeed = ROLL_SPEED * delta;
    const effectiveVerticalSpeed = VERTICAL_SPEED * delta;

    // --- Movement ---
    camera.getWorldDirection(moveForward.current); // Get current forward direction
    moveRight.current.crossVectors(camera.up, moveForward.current).normalize(); // Get current right direction

    // Forward/Backward (W/S)
    if (keys.current['KeyW']) velocity.current.add(moveForward.current);
    if (keys.current['KeyS']) velocity.current.sub(moveForward.current);

    // Strafe Left/Right (A/D) - REVERSED LOGIC
    if (keys.current['KeyA']) velocity.current.add(moveRight.current); // ADD right for 'A'
    if (keys.current['KeyD']) velocity.current.sub(moveRight.current); // SUBTRACT right for 'D'

    // Apply WASD velocity
    if (velocity.current.lengthSq() > 0) { // Use lengthSq for efficiency
        velocity.current.normalize().multiplyScalar(MOVE_SPEED * delta);
        camera.position.add(velocity.current);
    }
    
    // Up/Down (R/F) - Use World Y axis for simplicity
    if (keys.current['KeyR']) {
        camera.position.y += effectiveVerticalSpeed;
    }
    if (keys.current['KeyF']) {
        camera.position.y -= effectiveVerticalSpeed;
    }

    // --- Rotation ---
    let deltaPitch = 0;
    let deltaYaw = 0;
    let deltaRoll = 0;

    // Pitch (Arrow Up/Down)
    if (keys.current['ArrowUp']) deltaPitch -= effectiveRotationSpeed;
    if (keys.current['ArrowDown']) deltaPitch += effectiveRotationSpeed;

    // Yaw (Arrow Left/Right)
    if (keys.current['ArrowLeft']) deltaYaw += effectiveRotationSpeed;
    if (keys.current['ArrowRight']) deltaYaw -= effectiveRotationSpeed;

    // Roll (Q/E)
    if (keys.current['KeyQ']) deltaRoll += effectiveRollSpeed;
    if (keys.current['KeyE']) deltaRoll -= effectiveRollSpeed;

    // Apply rotations using direct quaternion manipulation for stability
    const rotQuat = new THREE.Quaternion();
    const axisX = new THREE.Vector3(1, 0, 0); // Local X for pitch
    const axisY = new THREE.Vector3(0, 1, 0); // World Y for yaw
    const currentForward = new THREE.Vector3(); // Local Z for roll
    camera.getWorldDirection(currentForward);
    currentForward.normalize();
    
    // Apply Yaw rotation around world Y first (premultiply)
    if (deltaYaw !== 0) {
        rotQuat.setFromAxisAngle(axisY, deltaYaw);
        camera.quaternion.premultiply(rotQuat);
    }
    
    // Apply Pitch rotation around local X (multiply)
    if (deltaPitch !== 0) {
        rotQuat.setFromAxisAngle(axisX, deltaPitch);
        camera.quaternion.multiply(rotQuat); 
    }

    // Apply Roll rotation around local Z (forward vector) (multiply)
     if (deltaRoll !== 0) {
        rotQuat.setFromAxisAngle(currentForward, deltaRoll);
        camera.quaternion.multiply(rotQuat); 
    }

  });

  return null; // This component doesn't render anything
} 