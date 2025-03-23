"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, useMemo, useState, Dispatch, SetStateAction, useEffect } from "react";
import * as THREE from "three";
import { easing } from "maath";
import { useTexture, Decal } from "@react-three/drei";
import { CardType } from "@/app/definitions";
import { useThree } from "@react-three/fiber";

const createRoundedRectShape = (width: number, height: number, radius: number): THREE.Shape => {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, -height / 2 + radius);
  shape.lineTo(-width / 2, height / 2 - radius);
  shape.quadraticCurveTo(-width / 2, height / 2, -width / 2 + radius, height / 2);
  shape.lineTo(width / 2 - radius, height / 2);
  shape.quadraticCurveTo(width / 2, height / 2, width / 2, height / 2 - radius);
  shape.lineTo(width / 2, -height / 2 + radius);
  shape.quadraticCurveTo(width / 2, -height / 2, width / 2 - radius, -height / 2);
  shape.lineTo(-width / 2 + radius, -height / 2);
  shape.quadraticCurveTo(-width / 2, -height / 2, -width / 2, -height / 2 + radius);
  return shape;
};

interface CardProps {
  card: CardType;
  id: number;
  cardPos: number;
  cardIndex: number;
  cardArr: CardType[];
  active: number | null;
  setActive: Dispatch<SetStateAction<number | null>>;
  isLoaded: boolean;
  scrollPosition: number;
  inArrowZone: boolean;
  hoverLocked: boolean;
  cursorPosition: { x: number, y: number };
}

const Card = ({
  card,
  id,
  cardPos,
  cardIndex,
  cardArr,
  active,
  setActive,
  isLoaded,
  scrollPosition,
  inArrowZone,
  hoverLocked,
  cursorPosition,
}: CardProps) => {
  const [hover, setHover] = useState(false);
  const isPointerOverRef = useRef(false); // Track if pointer is over the card
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const roundedRectShape = createRoundedRectShape(1.0, 1.75, 0.1);
  const geometry = new THREE.ExtrudeGeometry(roundedRectShape, { depth: 0.02, bevelEnabled: false });
  const initialPos = useMemo(() => new THREE.Vector3(cardPos * 1.2, 0, 0), [cardPos]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const { camera } = useThree();
  const lastActiveStateRef = useRef<boolean>(false); // Track if this card was previously active
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isTransitioningRef = useRef<boolean>(false); // Track if this card is in transition
  const isReturningToIdleRef = useRef<boolean>(false); // Track if we're returning from active to idle view
  const lastPositionRef = useRef<THREE.Vector3>(new THREE.Vector3()); // Track last position for velocity
  const velocityRef = useRef<THREE.Vector3>(new THREE.Vector3()); // Track velocity during transitions
  const wasScrollingRef = useRef<boolean>(false); // Track if we were scrolling when deselecting

  const selectedVariant = card.colorVariations[card.selectedVariantIndex];
  const [bookmark] = useTexture(["/bookmark.png"]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const rotationRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Track when we have an active card in the scene - shared across instances
  const [lastActiveRef] = useState(() => {
    // Use a singleton reference that's shared across all card instances
    if (!(window as any).__lastActiveCardId) { // eslint-disable-line @typescript-eslint/no-explicit-any
      (window as any).__lastActiveCardId = { current: null }; // eslint-disable-line @typescript-eslint/no-explicit-any
    }
    return (window as any).__lastActiveCardId; // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  // Reset hover state when entering arrow zone or when hover is locked during scrolling
  useEffect(() => {
    if (inArrowZone || hoverLocked) {
      setHover(false);
    } else if (isPointerOverRef.current && !active) {
      // If hover lock is released and pointer is already over the card, show hover effect
      setHover(true);
    }
  }, [inArrowZone, hoverLocked, active]);

  // Update hover state when scroll state changes
  useEffect(() => {
    // If we're now locked or in arrow zone but the pointer is over the card,
    // we need to remove the hover state
    if ((hoverLocked || inArrowZone) && isPointerOverRef.current) {
      setHover(false);
    }
    // If we're no longer locked or in arrow zone and pointer is over the card,
    // we can restore the hover state
    else if (!hoverLocked && !inArrowZone && isPointerOverRef.current && !active) {
      setHover(true);
    }
  }, [hoverLocked, inArrowZone, active]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Update hover state when scrolling changes card positions
  useEffect(() => {
    if (active !== null && active !== id) return; // Skip during active view for non-active cards
    
    // Allow hover checking for ALL cards when returning to idle view
    if (isReturningToIdleRef.current || !active) {
      // Function to check if cursor is over this card in 3D space
      const checkCursorOverCard = () => {
        if (!groupRef.current) return false;
        
        // Get card's current world position
        const cardWorldPos = new THREE.Vector3();
        groupRef.current.getWorldPosition(cardWorldPos);
        
        // Convert from world to screen coordinates
        const cardScreenPos = cardWorldPos.clone();
        cardScreenPos.project(camera);
        
        // Convert to pixel coordinates
        const cardX = (cardScreenPos.x + 1) * window.innerWidth / 2;
        const cardY = (-cardScreenPos.y + 1) * window.innerHeight / 2;
        
        // Card dimensions in pixels (approximate based on card size and camera)
        const cardWidth = 180; // Adjusted for better card size approximation
        const cardHeight = 315; // Adjusted for better card size approximation
        
        // Check if cursor is over this card
        const isOver = 
          cursorPosition.x > cardX - cardWidth/2 && 
          cursorPosition.x < cardX + cardWidth/2 && 
          cursorPosition.y > cardY - cardHeight/2 && 
          cursorPosition.y < cardY + cardHeight/2;
        
        return isOver;
      };
      
      // Update hover state based on cursor position IF NOT LOCKED
      // CRITICAL CHANGE: Allow hover even during idle transition but respect locks
      if (!hoverLocked && !inArrowZone) {
        const isOver = checkCursorOverCard();
        isPointerOverRef.current = isOver;
        setHover(isOver);
      }
    }  
  }, [scrollPosition, active, hoverLocked, inArrowZone, cursorPosition, camera, id]);

  bookmark.minFilter = THREE.LinearFilter;
  bookmark.magFilter = THREE.LinearFilter;
  bookmark.anisotropy = 16;
  bookmark.generateMipmaps = true;

  const pointerOver = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    // Always track when pointer is over, even when we can't display hover effect
    isPointerOverRef.current = true;
    // Only show hover effect if not locked and not scrolling
    // We specifically allow hover when not active (deselected or never selected)
    if (!active && !inArrowZone && !hoverLocked) {
      setHover(true);
    }
  };
  
  const pointerOut = () => {
    isPointerOverRef.current = false;
    if (!active) setHover(false);
  };

  const click = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    
    // ONLY CHANGE: Make cards immediately clickable after deselection
    // Allow clicks in ANY of these conditions:
    // 1. Normal condition (!hoverLocked && !inArrowZone)
    // 2. During the return-to-idle animation (isReturningToIdleRef.current && active === null)
    // 3. Immediately after deselection (lastActiveRef.current !== null && active === null)
    if (
      (!hoverLocked && !inArrowZone) || 
      (isReturningToIdleRef.current && active === null) ||
      (lastActiveRef.current !== null && active === null)
    ) {
      setActive(id);
      setHover(false);
    }
  };

  useEffect(() => {
    const pointerMove = (e: MouseEvent) => {
      if (active === id) {
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = -(e.clientY / window.innerHeight) * 2 + 1;
        setMousePos({ x, y });
      }
    };
    window.addEventListener("mousemove", pointerMove);
    return () => window.removeEventListener("mousemove", pointerMove);
  }, [active, id]);

  // Track when card becomes active or inactive for transitions
  useEffect(() => {
    const isActive = active === id;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const wasPreviouslyActive = lastActiveStateRef.current;
    
    // IMPORTANT: Force reset hover state on ANY active state change
    setHover(false);
    
    // Update last active state
    lastActiveStateRef.current = isActive;
    
    // When ANY card is deselected (active changes from a value to null)
    // Mark ALL cards for smooth transition back to idle view
    if (active === null && lastActiveRef.current !== null) {
      console.log(`[CARD ${id}] Detected row returning to idle, lastActiveId: ${lastActiveRef.current}`);
      
      // CRITICAL: Force clear any existing animation timeouts first
      // This prevents animation conflicts from previous deselection cycles
      window.clearTimeout((window as any).__cardAnimationTimeout); // eslint-disable-line @typescript-eslint/no-explicit-any
      window.clearTimeout((window as any).__cardHoverEnableTimeout); // eslint-disable-line @typescript-eslint/no-explicit-any
      
      // Set transition flag for ALL cards
      isReturningToIdleRef.current = true;
      
      // Save current position at deselection time for smoother transitions
      if (groupRef.current) {
        lastPositionRef.current.copy(groupRef.current.position);
      }
      
      // Update scrolling state at deselection time
      wasScrollingRef.current = Math.abs(velocityRef.current.x) > 0.5;
      
      // NEW: Enable hover immediately (don't wait for animation to complete)
      // Store this timeout separately so we can control it independently
      (window as any).__cardHoverEnableTimeout = setTimeout(() => { // eslint-disable-line @typescript-eslint/no-explicit-any
        // Set __lastDeselectionTime so hover works immediately
        (window as any).__lastDeselectionTime = Date.now(); // eslint-disable-line @typescript-eslint/no-explicit-any
        console.log(`[CARD ${id}] Hover enabled immediately after deselection`);
      }, 50); // Very short delay to allow initial transition to begin
      
      // Use consistent timing for ALL animation operations
      const ANIMATION_DURATION = 750; // Longer duration to ensure animation completes
      
      // Clear transition flag after animation completes
      // Store the timeout ID globally so we can clear it if needed
      (window as any).__cardAnimationTimeout = setTimeout(() => { // eslint-disable-line @typescript-eslint/no-explicit-any
        // Only clear flags if we're still in the same animation cycle
        if (active === null) {
          isReturningToIdleRef.current = false;
          wasScrollingRef.current = false;
          
          // Also reset the global lastActiveRef
          lastActiveRef.current = null;
          
          console.log(`[CARD ${id}] Animation cycle complete, cleared flags`);
        }
      }, ANIMATION_DURATION);
    }
    
    // Store last active ID globally
    if (isActive) {
      lastActiveRef.current = id;
      // Clear the returning to idle flag if a new card is selected
      isReturningToIdleRef.current = false;
    }
  }, [active, id, lastActiveRef]);

  // Add effect to ensure hover isn't stuck
  useEffect(() => {
    if (active !== null) return;
    
    // If no card is active, check if we need to reset hover
    const checkTimer = setTimeout(() => {
      if (!isPointerOverRef.current) {
        setHover(false);
      }
    }, 100);
    
    return () => clearTimeout(checkTimer);
  }, [active, hover]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Store last position to calculate velocity
      if (lastPositionRef.current.x === 0 && lastPositionRef.current.y === 0 && lastPositionRef.current.z === 0) {
        lastPositionRef.current.copy(groupRef.current.position);
      }
      
      // Calculate current velocity 
      velocityRef.current.subVectors(groupRef.current.position, lastPositionRef.current).divideScalar(delta);
      
      // Update last position
      lastPositionRef.current.copy(groupRef.current.position);
      
      // Detect if we're scrolling based on velocity
      if (Math.abs(velocityRef.current.x) > 1.0) {
        wasScrollingRef.current = true;
      }
      
      let targetPosition: [number, number, number];
      let smoothTime: number;
      let targetRotation: [number, number, number];
      let intensity: number;

      if (active === id) {
        // Center the selected card at origin (0,0,0) regardless of its original position
        targetPosition = [0, 1.95, windowWidth < 780 ? 6 : 15];
        smoothTime = 0.4;
        intensity = 0.25;
        const rotationX = mousePos.y * intensity;
        const rotationY = mousePos.x * intensity;
        
        targetRotation = [
          -rotationX,
          card.isFlipped ? Math.PI - rotationY : -rotationY,
          0,
        ];
        
        // Original animation for the active card
        easing.damp3(
          groupRef.current.position,
          targetPosition,
          0.4,
          delta
        );
        
        easing.dampE(
          groupRef.current.rotation,
          targetRotation,
          0.35,
          delta
        );
        
        // Debug: track this card's active position
        if (meshRef.current) {
          console.log(`CARD ${id} (ACTIVE) target position: [${targetPosition}], current: [${groupRef.current.position.x.toFixed(2)}, ${groupRef.current.position.y.toFixed(2)}, ${groupRef.current.position.z.toFixed(2)}]`);
        }
      } else {
        // Calculate horizontal position based on scroll position regardless of hover state
        let xPosition = initialPos.x;
        const zOffset = active !== null ? -2 : 0;
        
        // If a card is active and this card is not active
        if (active !== null && active !== id) {
          // Find the index of the active card
          const activeCardIndex = cardArr.findIndex((c: CardType) => c.id === active);
          const activeCardPos = activeCardIndex - (cardArr.length - 1) / 2;
          
          // Calculate how much the row needs to shift to center the active card's original position
          const rowOffset = -activeCardPos * 1.2;
          
          // Determine which side of the active card this card is on
          if (cardIndex < activeCardIndex) {
            // All cards to the left of active card move left
            xPosition = initialPos.x - 1.8 + rowOffset;
          } else if (cardIndex > activeCardIndex) {
            // All cards to the right of active card move right
            xPosition = initialPos.x + 1.8 + rowOffset;
          }
          
          // Debug: track inactive card positions during active mode
          if (id === lastActiveRef.current) {
            console.log(`CARD ${id} (PREVIOUSLY ACTIVE) target position: [${xPosition}, ${initialPos.y}, ${initialPos.z + zOffset}]`);
          }
        } else if (active === null) {
          // Apply scroll offset when in idle view
          xPosition = initialPos.x - scrollPosition;
          
          // Debug: track card returning to idle position
          if (id === lastActiveRef.current) {
            console.log(`CARD ${id} (RETURNING TO IDLE) target position: [${xPosition}, ${initialPos.y}, ${initialPos.z}], scroll: ${scrollPosition}`);
          }
        }
        
        // Set y position based on hover state, but always use the calculated x position
        if (hover) {
          targetPosition = [xPosition, 0.5, initialPos.z + zOffset];
          smoothTime = 0.1; // Keep hover transition responsive
        } else {
          targetPosition = [xPosition, initialPos.y, initialPos.z + zOffset];
          // Slightly faster animation for all scrolling motions
          smoothTime = 0.08; // Reduced from 0.1 for snappier scrolling
        }
        
        targetRotation = [0, card.isFlipped ? Math.PI : 0, 0];
        
        // Animation logic for unselected cards
        if (active !== null) {
          // When a card is active, use smooth animations for the ROW of cards
          // This is the EXPANSION animation
          easing.damp3(
            groupRef.current.position,
            targetPosition,
            0.4,
            delta
          );
          
          easing.dampE(
            groupRef.current.rotation,
            targetRotation,
            0.35,
            delta
          );
        } else if (isReturningToIdleRef.current) {
          // When returning to idle (after deselection), use smooth animation for the ROW
          // This is the CONTRACTION animation
          
          // CRITICAL FIX: Always ensure we're using the current scroll position
          // to calculate the correct target position during the transition
          targetPosition[0] = initialPos.x - scrollPosition;
          
          // Calculate distance to travel
          const currentPos = groupRef.current.position;
          const distance = Math.sqrt(
            Math.pow(currentPos.x - targetPosition[0], 2) + 
            Math.pow(currentPos.y - targetPosition[1], 2) + 
            Math.pow(currentPos.z - targetPosition[2], 2)
          );
          
          // Get velocity magnitude
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const velocityMag = Math.abs(velocityRef.current.x);
          
          // Calculate adaptive smoothing factor based on distance
          // CRITICAL: Use more consistent smoothing factors that won't cause jerky animations
          let adaptiveFactor = 0.12; // Default ease factor - more conservative
          
          // Special case for previously active card - smoother transition always
          if (id === lastActiveRef.current) {
            adaptiveFactor = 0.10;
          } 
          // For other cards, use distance-based adaptive smoothing with a tighter range
          else if (distance > 3) {
            // For cards that need to travel further, use smoother animation
            // but with less adjustment range to prevent inconsistent behaviors
            adaptiveFactor = Math.max(0.09, 0.12 - (distance * 0.005));
          }
          
          // CRITICAL: Use damp3 for ALL position components during deselection
          // Never use direct positioning during transitions
          easing.damp3(
            groupRef.current.position,
            targetPosition,
            adaptiveFactor,
            delta
          );
          
          easing.dampE(
            groupRef.current.rotation,
            targetRotation,
            0.25,
            delta
          );
        } else {
          // Normal scrolling behavior
          
          // CRITICAL: Check if we just recently finished a deselection animation
          // to prevent sudden snapping at the end of the animation
          const timeSinceDeselection = Date.now() - ((window as any).__lastDeselectionTime || 0); // eslint-disable-line @typescript-eslint/no-explicit-any
          
          if (timeSinceDeselection < 1000) { // Within 1 second of deselection completion
            // Continue using smooth animation for a brief period after deselection ends
            easing.damp3(
              groupRef.current.position,
              targetPosition,
              0.15,
              delta
            );
          } else {
            // Normal scrolling behavior (direct x positioning) after transition period
            groupRef.current.position.x = targetPosition[0];
            easing.damp(groupRef.current.position, 'y', targetPosition[1], smoothTime, delta);
            easing.damp(groupRef.current.position, 'z', targetPosition[2], smoothTime, delta);
          }
          
          easing.dampE(
            groupRef.current.rotation,
            targetRotation,
            0.25,
            delta
          );
        }
      }

      if (!isLoaded) {
        easing.damp3(state.camera.position, [state.camera.position.x, 30, 0], 2.0, delta);
      } else {
        if (active) {
          // Debug: track camera position during active mode
          console.log(`CAMERA (ACTIVE) target: [0, 2.5, 20], current: [${state.camera.position.x.toFixed(2)}, ${state.camera.position.y.toFixed(2)}, ${state.camera.position.z.toFixed(2)}]`);
          
          // Use a slower transition for active view camera (increased from 0.65 to 1.5)
          // This creates a more cinematic effect when transitioning to the active card view
          easing.damp3(state.camera.position, [0, 2.5, 20], 1.5, delta);
        } else {
          // Keep camera positioned to have all cards in view, with slower transition
          // Debug: track camera position during return to idle
          console.log(`CAMERA (IDLE) target: [0, 2, 8], current: [${state.camera.position.x.toFixed(2)}, ${state.camera.position.y.toFixed(2)}, ${state.camera.position.z.toFixed(2)}]`);
          
          // Use a smoother transition when returning to idle view to prevent jerking
          easing.damp3(state.camera.position, [0, 2, 8], 0.95, delta);
        }
      }
    }
  });

  return (
    <group ref={groupRef} position={initialPos} rotation={[0, 0, 0]}>
      {/* BASE CARD */}
      <mesh
        onPointerOver={pointerOver}
        onPointerOut={pointerOut}
        ref={meshRef}
        geometry={geometry}
        receiveShadow
        castShadow
        onClick={click}
      >
        <meshStandardMaterial 
          color={selectedVariant.cardColor} 
          roughness={0.7}
          metalness={0.0}
        />

        {/* FRONT ILLUSTRATION */}
        <Decal receiveShadow={active ? false : true} position={[0.02, 0, 0]} scale={[1, 1.75, 0.1]}>
          <meshStandardMaterial
            polygonOffset
            polygonOffsetFactor={-1}
            map={bookmark}
            roughness={0.8}
            metalness={0.0}
            side={THREE.DoubleSide}
          />
        </Decal>

        {/* BACK ILLUSTRATION */}
        <Decal
          receiveShadow={active ? false : true}
          position={[0, 0, -0.04]}
          scale={[1, 1.75, 0.1]}
          rotation={[0, Math.PI, 0]}
        >
          <meshStandardMaterial
            polygonOffset
            polygonOffsetFactor={-1}
            map={bookmark}
            roughness={0.8}
            metalness={0.0}
            side={THREE.DoubleSide}
          />
        </Decal>
      </mesh>
    </group>
  );
};

export default Card;