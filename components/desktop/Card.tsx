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

  const selectedVariant = card.colorVariations[card.selectedVariantIndex];
  const [bookmark] = useTexture(["/bookmark.png"]);

  const rotationRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const lastActiveIdRef = useRef<number | null>(null);

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
    if (active || hoverLocked || inArrowZone) return;
    
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
    
    // Update hover state based on cursor position
    const isOver = checkCursorOverCard();
    isPointerOverRef.current = isOver;
    setHover(isOver);
    
  }, [scrollPosition, active, hoverLocked, inArrowZone, cursorPosition, camera]);

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
    // Only allow clicks when not scrolling
    if (!hoverLocked && !inArrowZone) {
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
    
    // IMPORTANT: Force reset hover state on ANY active state change
    setHover(false);
    
    // Update last active state
    lastActiveStateRef.current = isActive;
    
    // Store last active ID for this card
    if (isActive) {
      lastActiveIdRef.current = id;
    } else if (active === null && lastActiveIdRef.current === id) {
      // This effect runs when active changes from a value to null (card deselection)
      // Force reset hover state and pointer tracking when this specific card is deselected
      setHover(false);
      isPointerOverRef.current = false;
      
      // Log for debugging
      console.log(`[CARD ${id}] Deselected - reset hover state and pointer tracking`);
    }
  }, [active, id]);

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
        
        // Debug: track this card's active position
        if (meshRef.current) {
          console.log(`CARD ${id} (ACTIVE) target position: [${targetPosition}], current: [${groupRef.current.position.x.toFixed(2)}, ${groupRef.current.position.y.toFixed(2)}, ${groupRef.current.position.z.toFixed(2)}]`);
        }
        
        // Update the reference when this card becomes active
        lastActiveIdRef.current = id;
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
          if (id === lastActiveIdRef.current) {
            console.log(`CARD ${id} (PREVIOUSLY ACTIVE) target position: [${xPosition}, ${initialPos.y}, ${initialPos.z + zOffset}]`);
          }
        } else if (active === null) {
          // Apply scroll offset when in idle view
          xPosition = initialPos.x - scrollPosition;
          
          // Debug: track card returning to idle position
          if (id === lastActiveIdRef.current) {
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
      }

      // Apply direct positioning for normal scroll view, but use smooth transitions for the active card view
      if (active !== null) {
        // When any card is active, use smooth animations for all cards
        // This makes the row shift smoothly when a card is selected
        easing.damp3(
          groupRef.current.position,
          targetPosition,
          0.4, // Use slightly slower transition for smoother animation
          delta
        );
        
        // Apply rotation with easing
        easing.dampE(
          groupRef.current.rotation,
          targetRotation,
          0.35,
          delta
        );
      } else {
        // ORIGINAL ANIMATION LOGIC FOR IDLE SCROLL VIEW
        // Direct positioning for x to stay in sync with scrolling,
        // but easing for y and z for smooth vertical and depth transitions
        groupRef.current.position.x = targetPosition[0]; // Direct x positioning - no easing
        easing.damp(groupRef.current.position, 'y', targetPosition[1], smoothTime, delta); // Eased y
        easing.damp(groupRef.current.position, 'z', targetPosition[2], smoothTime, delta); // Eased z
        easing.damp3(rotationRef.current, targetRotation, 0.25, delta);
        groupRef.current.rotation.set(rotationRef.current.x, rotationRef.current.y, rotationRef.current.z);
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