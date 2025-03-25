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
  flipCard: (id: number, isFlipped: boolean) => void;
}

// Add typing for the global window object to fix linter error
declare global {
  interface Window {
    // ID of the card that should flip on selection
    __directFlipCard: number | null;
  }
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
  flipCard,
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
  const lastFlipStateRef = useRef<boolean | null>(null); // Track last flip state for debugging

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
      // Add a global animation state tracker to coordinate transitions
      (window as any).__cardAnimationState = { // eslint-disable-line @typescript-eslint/no-explicit-any
        isReturningToIdle: false,
        lastDeselectionTime: 0,
        transitionTime: 750,
        inTransition: false,
        lastTransitionId: null // Track the ID of the card that was last active
      };
    }
    return (window as any).__lastActiveCardId; // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  // Get global animation state for synchronized animations
  const getAnimState = () => (window as any).__cardAnimationState; // eslint-disable-line @typescript-eslint/no-explicit-any

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
    
    // Mark this event as handled to prevent the global click handler from running
    (e as any).__handled = true;
    
    // FUNDAMENTAL FIX: Direct handling without relying on timeouts
    if (active === null) {
      console.log(`[CARD ${id}] Clicked card (inactive view) - immediate activation with flip`);
      
      // Set animation state for smooth transitions
      const animState = getAnimState();
      animState.inTransition = false;
      isReturningToIdleRef.current = false;
      isTransitioningRef.current = false;
      
      // CRITICAL: Set the card to be flipped AND track we're going to flip it
      // Store both the ID and the target flip state (true for selection)
      window.__directFlipCard = id;
      
      // Then activate the card
      setActive(id);
      setHover(false);
      
    } else if (active !== id) {
      console.log(`[CARD ${id}] Clicked card (active view) - switching cards`);
      
      // CRITICAL: Set the card to be flipped
      window.__directFlipCard = id;
      
      // Then switch to this card
      setActive(id);
      setHover(false);
      
    } else if (active === id) {
      // CRITICAL: Toggle the card flip directly when clicking the active card
      console.log(`[CARD ${id}] Clicked active card - flipping directly`);
      
      // Initialize the global tracker to null to ensure other handlers don't interfere
      window.__directFlipCard = null;
      
      // Toggle the flip state directly using the parent's flipCard function
      const flipToState = !card.isFlipped;
      console.log(`Flipping card ${id} to ${flipToState ? 'back' : 'front'} side`);
      
      // Use the parent component's flipCard function directly
      if (typeof flipCard === 'function') {
        flipCard(id, flipToState);
      }
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
    const animState = getAnimState();
    
    // IMPORTANT: Force reset hover state on ANY active state change
    setHover(false);
    
    // Update last active state
    lastActiveStateRef.current = isActive;
    
    // When this card becomes active, check if it needs to be flipped
    if (isActive && window.__directFlipCard === id) {
      console.log(`[CARD ${id}] Became active with directFlip flag set (isFlipped: ${card.isFlipped})`);
      
      // Track our own flip state changes as backup detection
      if (!card.isFlipped) {
        // Set a timeout to check if the flip happened from other handlers
        setTimeout(() => {
          if (active === id && !card.isFlipped && window.__directFlipCard === id) {
            console.log(`[CARD ${id}] Card-level failsafe flip triggered`);
            if (typeof flipCard === 'function') {
              flipCard(id, true);
            }
          }
        }, 150);
      }
    }
    
    // When ANY card is deselected (active changes from a value to null)
    // Mark ALL cards for smooth transition back to idle view
    if (active === null && lastActiveRef.current !== null) {
      console.log(`[CARD ${id}] Detected row returning to idle, lastActiveId: ${lastActiveRef.current}`);
      
      // CRITICAL: Force clear any existing animation timeouts first
      // This prevents animation conflicts from previous deselection cycles
      window.clearTimeout((window as any).__cardAnimationTimeout); // eslint-disable-line @typescript-eslint/no-unused-vars
      window.clearTimeout((window as any).__cardHoverEnableTimeout); // eslint-disable-line @typescript-eslint/no-unused-vars
      window.clearTimeout((window as any).__cardSyncTimeoutId); // eslint-disable-line @typescript-eslint/no-unused-vars
      
      // FUNDAMENTAL FIX: Completely separate the animation state from the interaction state
      // First, make the cards immediately interactive without waiting for any animations
      isTransitioningRef.current = false; // This card is immediately interactive
      
      // Signal globally that all cards should be immediately interactive
      window.dispatchEvent(new CustomEvent('card_interaction_enabled'));
      
      // After making cards interactive, now set up animation states
      // Note we're explicitly keeping these separate from the interaction state
      animState.isReturningToIdle = true;
      animState.lastDeselectionTime = Date.now();
      animState.lastTransitionId = lastActiveRef.current;
      
      // Set transition flag for animation only, not to block interactions
      isReturningToIdleRef.current = true;
      
      // Save current position at deselection time for smoother transitions
      if (groupRef.current) {
        lastPositionRef.current.copy(groupRef.current.position);
      }
      
      // Update scrolling state at deselection time
      wasScrollingRef.current = Math.abs(velocityRef.current.x) > 0.5;

      // CRITICAL FIX: Trigger all animation reset events with proper timing
      (window as any).__cardSyncTimeoutId = setTimeout(() => { // eslint-disable-line @typescript-eslint/no-unused-vars
        // Once animations are done, clean up animation states (interaction remains enabled)
        console.log(`[GLOBAL SYNC] Animation cleanup`);
        animState.isReturningToIdle = false;
        
        // Broadcast final animation cleanup events
        window.dispatchEvent(new CustomEvent('card_animation_reset'));
      }, 800);
    }
    
    // Store last active ID globally
    if (isActive) {
      lastActiveRef.current = id;
      animState.lastTransitionId = id;
      
      // Reset animation states when a new card is activated
      animState.isReturningToIdle = false;
      isReturningToIdleRef.current = false;
      
      // Track active transitions globally
      animState.inTransition = true;
      
      // Clear transition after animation
      setTimeout(() => {
        animState.inTransition = false;
      }, 750);
    }
  }, [active, id, lastActiveRef]);

  // NEW: Listen for global animation reset events to ensure all cards get reset
  useEffect(() => {
    const resetAnimationState = () => {
      isReturningToIdleRef.current = false;
      wasScrollingRef.current = false;
    };
    
    // NEW: Handler for preparing to end the transition
    const prepareTransitionEnd = () => {
      // This is called BEFORE the animation reset, giving cards time to ease into the new state
      isReturningToIdleRef.current = false;
      // But we don't reset velocity or position info yet to maintain smooth motion
    };
    
    // FUNDAMENTAL FIX: Handler to ensure cards are always interactive immediately
    const enableInteraction = () => {
      // CRITICAL: Reset ALL interaction-blocking flags immediately
      isTransitioningRef.current = false;
      isReturningToIdleRef.current = false;
      
      // Force interaction state in the global animation state
      const animState = getAnimState();
      animState.inTransition = false;
      
      // For proper hover effects, check if cursor is over this card
      if (!hoverLocked && !inArrowZone && active === null) {
        if (groupRef.current) {
          // Simple ray test from cursor to card
          const cardWorldPos = new THREE.Vector3();
          groupRef.current.getWorldPosition(cardWorldPos);
          
          // Project to screen space
          const cardScreenPos = cardWorldPos.clone();
          cardScreenPos.project(camera);
          
          // Convert to pixel coordinates
          const cardX = (cardScreenPos.x + 1) * window.innerWidth / 2;
          const cardY = (-cardScreenPos.y + 1) * window.innerHeight / 2;
          
          // Test with appropriate card dimensions
          const cardWidth = 180;
          const cardHeight = 315;
          
          // Check if cursor is over this card
          const isOver = 
            cursorPosition.x > cardX - cardWidth/2 && 
            cursorPosition.x < cardX + cardWidth/2 && 
            cursorPosition.y > cardY - cardHeight/2 && 
            cursorPosition.y < cardY + cardHeight/2;
          
          // Update hover states based on cursor position
          isPointerOverRef.current = isOver;
          setHover(isOver);
        }
      }
      
      // Ensure click interaction takes precedence over all animation states
      if (meshRef.current) {
        // Prioritize this mesh for interaction by setting high renderOrder
        meshRef.current.renderOrder = 1000;
      }
    };
    
    // CRITICAL FIX: Force raycaster update to ensure ThreeJS registers clicks immediately
    const forceRaycasterUpdate = () => {
      // Reset all interaction-blocking flags
      isTransitioningRef.current = false;
      isReturningToIdleRef.current = false;
      
      // Force ThreeJS to update its raycaster and register this object
      if (meshRef.current) {
        // Set extremely high render order to force priority
        meshRef.current.renderOrder = 2000; 
        
        // Force visibility to ensure the raycaster detects it
        meshRef.current.visible = true;
        
        // Force object to be raycast-enabled
        // Get original raycast method from the prototype without directly using __proto__
        const originalRaycast = Object.getPrototypeOf(meshRef.current).raycast;
        if (originalRaycast && typeof originalRaycast === 'function') {
          meshRef.current.raycast = originalRaycast;
        }
      }
    };
    
    // IMPROVED: Add handler for scroll snap events to ensure all cards move in sync
    const syncWithScrollPosition = () => {
      if (groupRef.current && active === null) {
        // If we're already in a stable state, directly update position
        // Otherwise, let the animation system handle it smoothly
        if (!isReturningToIdleRef.current && !getAnimState().inTransition) {
          requestAnimationFrame(() => {
            if (groupRef.current && active === null) {
              const targetX = initialPos.x - scrollPosition;
              groupRef.current.position.x = targetX;
              lastPositionRef.current.copy(groupRef.current.position);
            }
          });
        }
      }
    };
    
    window.addEventListener('card_prepare_transition_end', prepareTransitionEnd);
    window.addEventListener('card_animation_reset', resetAnimationState);
    window.addEventListener('card_interaction_enabled', enableInteraction);
    window.addEventListener('force_raycaster_update', forceRaycasterUpdate);
    window.addEventListener('scroll_snap_complete', syncWithScrollPosition);
    
    return () => {
      window.removeEventListener('card_prepare_transition_end', prepareTransitionEnd);
      window.removeEventListener('card_animation_reset', resetAnimationState);
      window.removeEventListener('card_interaction_enabled', enableInteraction);
      window.removeEventListener('force_raycaster_update', forceRaycasterUpdate);
      window.removeEventListener('scroll_snap_complete', syncWithScrollPosition);
    };
  }, [active, initialPos.x, scrollPosition, hoverLocked, inArrowZone, cursorPosition, camera]);

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
      // Sync with global animation state for consistent behavior
      const animState = getAnimState();
      
      // Store last position to calculate velocity
      if (lastPositionRef.current.x === 0 && lastPositionRef.current.y === 0 && lastPositionRef.current.z === 0) {
        lastPositionRef.current.copy(groupRef.current.position);
      }
      
      // Calculate current velocity 
      velocityRef.current.subVectors(groupRef.current.position, lastPositionRef.current).divideScalar(delta);
      
      // Update last position
      lastPositionRef.current.copy(groupRef.current.position);
      
      // CRITICAL FIX: Calculate target positions consistently for all states
      // eslint-disable-next-line prefer-const
      let targetPosition: [number, number, number];
      let targetRotation: [number, number, number];

      // STEP 1: Calculate X position consistently for all states
      let xPosition: number;
      let yPosition: number;
      let zPosition: number;
      const zOffset = active !== null ? -2 : 0;
      
      if (active === id) {
        // When this card is the active card
        xPosition = 0;
        yPosition = 1.95;
        zPosition = windowWidth < 780 ? 6 : 15;
        
        // Handle rotation for active card
        const intensity = 0.25;
        const rotationX = mousePos.y * intensity;
        const rotationY = mousePos.x * intensity;
        
        // CRITICAL FIX: Add logging for flip state in active card animations
        // This helps debug wheel navigation issues
        const isCurrentlyFlipped = card.isFlipped;
        if (isCurrentlyFlipped !== lastFlipStateRef?.current) {
          console.log(`[CARD ${id}] Flip state changed: ${lastFlipStateRef?.current} -> ${isCurrentlyFlipped}`);
          lastFlipStateRef.current = isCurrentlyFlipped;
        }
        
        targetRotation = [
          -rotationX,
          card.isFlipped ? Math.PI - rotationY : -rotationY,
          0,
        ];
        
        // CRITICAL: Ensure active card has high render order for raycasting
        if (meshRef.current) {
          meshRef.current.renderOrder = 2000;
        }
      } else {
        // Basic rotation for all non-active cards
        targetRotation = [0, card.isFlipped ? Math.PI : 0, 0];
        
        // Reset render order for non-active cards - use cardIndex for consistent ordering
        if (meshRef.current) {
          meshRef.current.renderOrder = 1000 + cardIndex;  
        }
        
        // STEP 2: Determine X position based on view state
        if (active !== null) {
          // When another card is active - row expansion layout
          const activeCardIndex = cardArr.findIndex((c: CardType) => c.id === active);
          const activeCardPos = activeCardIndex - (cardArr.length - 1) / 2;
          const rowOffset = -activeCardPos * 1.2;
          
          if (cardIndex < activeCardIndex) {
            xPosition = initialPos.x - 1.8 + rowOffset;
          } else if (cardIndex > activeCardIndex) {
            xPosition = initialPos.x + 1.8 + rowOffset;
          } else {
            // This should rarely happen, but handle it just in case
            xPosition = initialPos.x + rowOffset;
          }
        } else {
          // When in idle view - use scroll position
          xPosition = initialPos.x - scrollPosition;
        }
        
        // STEP 3: Determine Y position based on hover state
        if (hover) {
          yPosition = 0.5;
        } else {
          yPosition = initialPos.y;
        }
        
        // STEP 4: Determine Z position
        zPosition = initialPos.z + zOffset;
      }
      
      // Set final target position
      // eslint-disable-next-line prefer-const
      targetPosition = [xPosition, yPosition, zPosition];
      
      // STEP 5: UNIFIED ANIMATION SYSTEM - use the same animation for all states
      // This ensures consistent behavior and smooth transitions
      
      // CRITICAL FIX: Use an ease factor that transitions smoothly based on time since deselection
      // This prevents the jump that happens when animation modes change
      let easeFactor = 0.15; // IMPROVED: Increased from 0.1 for more responsive animations
      
      if (active === id) {
        // Active card needs slightly faster response
        easeFactor = 0.4;
      } else if (active !== null) {
        // Row expansion needs slightly faster response
        easeFactor = 0.4;
      } else if (isReturningToIdleRef.current || animState.isReturningToIdle) {
        // Idle transition - use smooth animation
        easeFactor = 0.15; // IMPROVED: Faster transition when returning to idle
        
        // Special case for previously active card - smoother transition
        if (id === lastActiveRef.current || id === animState.lastTransitionId) {
          easeFactor = 0.15; // IMPROVED: Faster transition for previously active card
        }
        
        // Check if we're near the end of the transition
        const timeSinceDeselection = Date.now() - animState.lastDeselectionTime;
        if (timeSinceDeselection > 800 && timeSinceDeselection < 1500) {
          // CRITICAL FIX: Gradually shift ease factor as we approach the end of transition
          // This creates a smooth handoff between animation states
          const ratio = (timeSinceDeselection - 800) / 700; // 0 to 1 as we approach 1500ms
          easeFactor = 0.15 - (ratio * 0.03); // IMPROVED: Smoother transition, but still faster
        }
      } 
      
      // CRITICAL: Always use damp3 for ALL animations in ALL states
      // This ensures consistency and prevents jumping
      easing.damp3(
        groupRef.current.position,
        targetPosition,
        easeFactor,
        delta
      );
      
      // Always use dampE for rotations
      easing.dampE(
        groupRef.current.rotation,
        targetRotation,
        active === id ? 0.35 : 0.3, // IMPROVED: Faster rotation transitions for inactive cards
        delta
      );

      // Handle camera position based on view state
      if (!isLoaded) {
        easing.damp3(state.camera.position, [state.camera.position.x, 30, 0], 2.0, delta);
      } else {
        if (active) {
          easing.damp3(state.camera.position, [0, 2.5, 20], 1.5, delta);
        } else {
          easing.damp3(state.camera.position, [0, 2, 8], 0.95, delta);
        }
      }

      // Add consistent lighting for card in any state
      if (meshRef.current) {
        // Ensure consistent material properties regardless of active state
        if (meshRef.current.material) {
          // Cast to MeshStandardMaterial to access the properties we need
          const material = meshRef.current.material as THREE.MeshStandardMaterial;
          material.roughness = 0.7;
          material.metalness = 0.0;
          material.envMapIntensity = 1;
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
        // renderOrder is now set dynamically in useFrame based on card state
      >
        <meshStandardMaterial 
          color={selectedVariant.cardColor} 
          roughness={0.7}
          metalness={0.0}
          envMapIntensity={1}
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