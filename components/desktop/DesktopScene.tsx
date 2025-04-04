import { Canvas } from "@react-three/fiber";
import Experience from "./Experience";
import LoadingScreen from "./LoadingScreen";
import ActiveUi from "./ActiveUi";
import { Dispatch, SetStateAction, useState, useEffect, useRef, useMemo, useCallback } from "react";
import { CardType } from "@/app/definitions";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import { useThree, useFrame } from "@react-three/fiber";
import { easing } from "maath";
import GltfExploreButton from "@/components/shared/GltfExploreButton";
import { TransformControls, SpotLight } from "@react-three/drei";
import DebugKeyboardControls from "@/components/debug/DebugKeyboardControls";
import DebugStateBridge from "@/components/debug/DebugStateBridge";
import { DebugMenu } from "@/components/debug/DebugMenu";
import { SpawnedGltf } from "@/components/shared/SpawnedGltf";
import MusicToggle from "@/components/shared/MusicToggle";
import BeatToggle from "@/components/shared/BeatToggle";
import { InspectInfoDisplay } from "@/components/debug/InspectInfoDisplay";
import { MouseLightControls } from "@/components/debug/MouseLightControls";
// Import React for React.memo
import React from "react";
// Import the new component
import { SelectedLightEditor } from "@/components/debug/SelectedLightEditor";
// Import the shared interface
import { BumpMapConfig } from "@/components/shared/SpawnedGltf"; 

// Add proper global interface to TypeScript
declare global {
  interface Window {
    __directFlipCard: number | null;
    __raycasterCleanup?: () => void;
    __processingWheelEvent?: boolean;
  }
}

// Define possible view states from app/page.tsx
type ViewState = 'initial' | 'cardSelection';

interface DesktopSceneProps {
  cardArr: CardType[];
  setCardArr: Dispatch<SetStateAction<CardType[]>>
  active: number | null;
  setActive: Dispatch<SetStateAction<number | null>>;
  isLoaded: boolean;
  setIsLoaded: Dispatch<SetStateAction<boolean>>;
  flipCard: (cardId: number, isFlipped: boolean) => void;
  viewState: ViewState;
  setViewState: Dispatch<SetStateAction<ViewState>>;
}

// Export the PlacedLight interface
export interface PlacedLight {
  id: number;
  position: [number, number, number];
  // Add type property
  type: 'point' | 'spot' | 'directional';
  // Core properties (some might not apply to all types, but keep for simplicity)
  intensity: number;
  distance: number; // Less relevant for directional
  color: string;
  // SpotLight specific (optional)
  angle?: number;
  penumbra?: number;
  // DirectionalLight uses rotation (handled by TransformControls) 
  // Target might be needed for SpotLight if not aiming at origin
  // targetPosition?: [number, number, number]; // Add later if needed
}

// --- Define PlacedLightController OUTSIDE DesktopScene ---
interface PlacedLightControllerProps {
  lights: PlacedLight[];
  selectedId: number | null;
  onLightMove: (id: number, newPosition: THREE.Vector3) => void;
  // Add transformMode prop
  transformMode: 'translate' | 'rotate';
}

const PlacedLightController = React.memo(({ 
  lights, 
  selectedId, 
  onLightMove,
  transformMode, // Destructure transformMode
}: PlacedLightControllerProps) => {
  // console.log("[PlacedLightController] Rendering/Re-rendering..."); // Keep commented
  const lightRefs = useRef<Map<number, THREE.Light>>(new Map());
  const transformControlsRef = useRef<any>(null); 
  
  // Effect to attach/detach TransformControls
  useEffect(() => {
      const controls = transformControlsRef.current;
      // Calculate selectedLightObject INSIDE the effect
      const selectedLightObject = selectedId === null ? null : lightRefs.current.get(selectedId) ?? null;
      
      console.log("[Effect] Running Attach/Detach. Selected ID:", selectedId, "Found Object:", selectedLightObject);

      if (controls) {
          if (selectedLightObject) {
              // Check if controls are already attached to the correct object
              if (controls.object !== selectedLightObject) {
                  console.log("[PlacedLightController] Attaching TransformControls to light:", selectedId);
                  controls.attach(selectedLightObject);
              }
              controls.visible = true; // Ensure visible if attached
          } else {
              if (controls.object) {
                  console.log("[PlacedLightController] Detaching TransformControls.");
                  controls.detach();
              }
              controls.visible = false;
          }
      } else {
           console.warn("[PlacedLightController Attach Effect] transformControlsRef.current is null.");
      }
  // Depend on selectedId AND lights array
  }, [selectedId, lights]); 

  const handleDragChange = useCallback(() => {
    if (transformControlsRef.current && transformControlsRef.current.object) {
      const light = transformControlsRef.current.object as THREE.Light;
      const lightId = lights.find(l => lightRefs.current.get(l.id) === light)?.id;
      if (lightId !== undefined) {
         onLightMove(lightId, light.position.clone());
      }
    }
  }, [lights, onLightMove]); 

  return (
    <>
      {lights.map(light => {
        // Render correct light type based on light.type
        switch (light.type) {
          case 'spot':
            return (
              <spotLight
                key={light.id}
                // Cast ref callback element type if needed, though usually inferred
                ref={(el: THREE.SpotLight | null) => { 
                    if (el) lightRefs.current.set(light.id, el);
                    else if (lightRefs.current.has(light.id)) lightRefs.current.delete(light.id);
                }}
                position={light.position}
                intensity={light.intensity} 
                distance={light.distance}   
                color={light.color}
                angle={light.angle ?? Math.PI / 4} // Use saved or default
                penumbra={light.penumbra ?? 0.1} // Use saved or default
                decay={2}
                castShadow // Spotlights should cast shadow
                // target might need setting if rotation is used via transformControls
              />
            );
          case 'directional':
            return (
              <directionalLight
                key={light.id}
                // Cast ref callback element type if needed
                ref={(el: THREE.DirectionalLight | null) => { 
                    if (el) lightRefs.current.set(light.id, el);
                    else if (lightRefs.current.has(light.id)) lightRefs.current.delete(light.id);
                }}
                position={light.position}
                intensity={light.intensity}
                color={light.color}
                castShadow // Directional lights cast shadow
                // Rotation will be controlled by TransformControls
              />
            );
          case 'point': // Fallback to point light
          default:
            return (
              <pointLight
                key={light.id}
                // Cast ref callback element type if needed
                ref={(el: THREE.PointLight | null) => { 
                    if (el) lightRefs.current.set(light.id, el);
                    else if (lightRefs.current.has(light.id)) lightRefs.current.delete(light.id);
                }}
                position={light.position}
                intensity={light.intensity} 
                distance={light.distance}   
                color={light.color}         
                decay={2}
              />
            );
        }
      })}
      
      {/* TransformControls attaches to Object3D, so base Light type is fine */}
      <TransformControls 
          ref={transformControlsRef}
          mode={transformMode} 
          onObjectChange={handleDragChange}
          visible={false} 
          enabled={selectedId !== null} 
      />
    </>
  );
}); 

PlacedLightController.displayName = 'PlacedLightController';
// --- End Placed Light Controller Definition ---

// --- Re-add SpawnedObject interface definition ---
interface SpawnedObject {
  id: number;
  url: string;
  position?: [number, number, number]; 
  bumpMapConfig?: BumpMapConfig; // Uses the imported type now
}
// --- End Re-add ---

export default function DesktopScene({
  cardArr,
  setCardArr,
  active,
  setActive,
  isLoaded,
  setIsLoaded,
  flipCard,
  viewState,
  setViewState,
}: DesktopSceneProps) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [targetScrollPosition, setTargetScrollPosition] = useState(0);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [showUI, setShowUI] = useState(false);
  const [isHoveringLeft, setIsHoveringLeft] = useState(false);
  const [isHoveringRight, setIsHoveringRight] = useState(false);
  const [inArrowZone, setInArrowZone] = useState(false);
  const [hoverLocked, setHoverLocked] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isActivelyScrolling, setIsActivelyScrolling] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isWheelScrolling, setIsWheelScrolling] = useState(false);
  // Track cursor position for hover updates during scrolling
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  // Store current background color
  const [bottomColor, setBottomColor] = useState("#bdd7ee");
  // Track if arrow is clicked for faster scrolling
  const [arrowClicked, setArrowClicked] = useState(false);
  // Flag to completely block card selection when interacting with arrows
  const [arrowInteraction, setArrowInteraction] = useState(false);
  const [isDebugMode, setIsDebugMode] = useState<boolean>(false);
  // Add state to hold debug info strings
  const [debugInfo, setDebugInfo] = useState({ position: '', rotation: '' });
  // Add state for normalized mouse position for the initial button interaction
  const [normalizedMousePosition, setNormalizedMousePosition] = useState({ x: 0, y: 0 });
  // Add state to trigger camera Z rotation reset
  const [resetZRotationTrigger, setResetZRotationTrigger] = useState(0);
  // Add state for light placement mode and placed lights
  const [isLightPlacementMode, setIsLightPlacementMode] = useState<boolean>(false);
  const [placedLights, setPlacedLights] = useState<PlacedLight[]>([]);
  const nextLightId = useRef(1); // To generate unique IDs
  // State for beat animation toggle
  const [isBeatAnimationEnabled, setIsBeatAnimationEnabled] = useState<boolean>(true);
  // State for music playback
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false);
  // Ref for the audio element
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Track the last active card
  const lastActiveCardRef = useRef<number | null>(null);
  // Remove all special position tracking
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const CARD_WIDTH = 1.2; // Width of each card + spacing
  
  // Track selected variant index changes
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const selectedVariantRef = useRef<number>(0);
  
  // Ref to Canvas element for direct DOM manipulation
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Add state for debug wall
  const [showDebugWall, setShowDebugWall] = useState<boolean>(false);
  const debugWallRef = useRef<THREE.Mesh>(null); // Ref for the wall mesh
  
  // Add state for placed light controls
  const [placedLightIntensity, setPlacedLightIntensity] = useState<number>(2);
  const [placedLightDistance, setPlacedLightDistance] = useState<number>(1);
  const [placedLightColor, setPlacedLightColor] = useState<string>("#ffffff");

  // Add state for camera save/recall
  const [savedCameraPos1, setSavedCameraPos1] = useState<THREE.Vector3 | null>(null);
  const [savedCameraQuat1, setSavedCameraQuat1] = useState<THREE.Quaternion | null>(null);
  const [savedCameraPos2, setSavedCameraPos2] = useState<THREE.Vector3 | null>(null);
  const [savedCameraQuat2, setSavedCameraQuat2] = useState<THREE.Quaternion | null>(null);
  const [saveCameraTrigger, setSaveCameraTrigger] = useState(0);
  const [saveSlotTarget, setSaveSlotTarget] = useState<1 | 2>(1);
  const [recallCameraTrigger, setRecallCameraTrigger] = useState(0);
  const [recallSlotTarget, setRecallSlotTarget] = useState<1 | 2>(1);
  
  // Add state for inspect mode
  const [isInspectMode, setIsInspectMode] = useState<boolean>(false);
  const [inspectedPartInfo, setInspectedPartInfo] = useState<object | string | null>(null);

  // Add state for selected placed light ID
  const [selectedLightId, setSelectedLightId] = useState<number | null>(null);

  // Add state for TransformControls mode
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate'>('translate');

  // Update state for spawned GLTF objects
  const [spawnedObjects, setSpawnedObjects] = useState<SpawnedObject[]>([]);
  const nextSpawnedObjectId = useRef(1);

  // Add state for bump map status feedback
  const [bumpMapStatus, setBumpMapStatus] = useState<string>("Bump map not applied.");

  // --- State for Mouse Light ---
  const [isMouseLightActive, setIsMouseLightActive] = useState<boolean>(false);
  const [mouseLightPosition, setMouseLightPosition] = useState<THREE.Vector3>(() => new THREE.Vector3(0, 2, 5)); 
  const [mouseLightIntensity, setMouseLightIntensity] = useState<number>(1.5); // Add state for intensity
  const [mouseLightColor, setMouseLightColor] = useState<string>("#ffffaa"); // Add state for color

  // --- Web Audio API State ---
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [audioSourceNode, setAudioSourceNode] = useState<AudioBufferSourceNode | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState<boolean>(false);
  const [audioStartTime, setAudioStartTime] = useState<number | null>(null); // Start time within AudioContext timeline
  const audioLoadCalled = useRef(false); // Ensure load is called only once

  // --- End Web Audio API State ---

  // Calculate all card positions for wheel scrolling - memoized to avoid recreation
  const getCardPositions = useCallback(() => {
    return cardArr.map((_, index) => (index - (cardArr.length - 1) / 2) * CARD_WIDTH);
  }, [cardArr, CARD_WIDTH]);

  // Get the current card index based on scroll position - memoized to avoid recreation
  const getCurrentCardIndex = useCallback(() => {
    const cardPositions = getCardPositions();
    return cardPositions.reduce((closestIndex, position, currentIndex) => {
      return Math.abs(position - scrollPosition) < Math.abs(cardPositions[closestIndex] - scrollPosition)
        ? currentIndex
        : closestIndex;
    }, 0);
  }, [getCardPositions, scrollPosition]);
  
  // Update window size on resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Calculate visible cards and scroll limits
  const { visibleCards, maxScrollLeft, maxScrollRight } = useMemo(() => {
    // Calculate how many cards can fit in the viewport
    // Use a more conservative estimate - we want to show arrows even if cards technically fit
    const visibleCardsCount = Math.max(3, Math.min(5, Math.floor(windowWidth / 250)));
    
    // Calculate how far we can scroll in each direction
    if (cardArr.length <= 3) { // Only hide arrows for very few cards
      return {
        visibleCards: visibleCardsCount,
        maxScrollLeft: 0,
        maxScrollRight: 0
      };
    } else {
      // Calculate center point of the row (allowing scroll in both directions)
      const centerOffset = ((cardArr.length - 1) / 2) * CARD_WIDTH;
      
      // Allow scrolling to see the first card centered
      const leftmostPosition = -centerOffset;
      
      // Allow scrolling to see the last card centered + 2 more cards
      // Add 2 card widths to the right scroll limit to see two more cards
      const rightmostPosition = centerOffset - (visibleCardsCount - 1) * CARD_WIDTH / 2 + (2 * CARD_WIDTH);
      
      return {
        visibleCards: visibleCardsCount,
        maxScrollLeft: leftmostPosition, 
        maxScrollRight: rightmostPosition
      };
    }
  }, [cardArr, windowWidth, CARD_WIDTH]);
  
  // Log values for debugging
  useEffect(() => {
    console.log({
      visibleCards,
      maxScrollLeft,
      maxScrollRight,
      cardCount: cardArr.length,
      windowWidth,
      shouldShowArrows: cardArr.length > 3
    });
  }, [visibleCards, maxScrollLeft, maxScrollRight, cardArr.length, windowWidth]);
  
  // Basic logic to track active card changes
  useEffect(() => {
    if (active !== null) {
      lastActiveCardRef.current = active;
    } else {
      lastActiveCardRef.current = null;
    }
  }, [active]);
  
  // Automatically show arrows when idle view is active
  useEffect(() => {
    if (isLoaded && active === null) {
      setShowUI(true);
    } else {
      setShowUI(false);
      // Reset scrolling state when leaving idle view
      setIsHoveringLeft(false);
      setIsHoveringRight(false);
      setInArrowZone(false);
      
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    }
  }, [isLoaded, active]);

  // Animation loop for smooth scrolling
  useEffect(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    const animateScroll = () => {
      setScrollPosition(prev => {
        const diff = targetScrollPosition - prev;
        
        // CRITICAL FIX: More graceful handling of tiny differences
        // Prevents abrupt stopping that could cause card jumping
        if (Math.abs(diff) < 0.001) {
          // When scrolling stops naturally, ensure we unlock hover
          setHoverLocked(false);
          return targetScrollPosition;
        }
        
        // IMPROVED: Faster ease factor for more responsive scrolling
        // This makes the animation quicker while still maintaining smoothness
        const easeFactor = active === null ? 0.2 : 0.1; // Increased from 0.1 for inactive view
        
        // Unlock hover during animations
        setHoverLocked(false);
        
        return prev + diff * easeFactor;
      });
      
      animationFrameRef.current = requestAnimationFrame(animateScroll);
    };
    
    animationFrameRef.current = requestAnimationFrame(animateScroll);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [targetScrollPosition, setHoverLocked, active]);
  
  // Track mouse position to determine if in arrow zone or for initial button interaction
  const handleMouseMove = (e: React.MouseEvent) => {
    // Update raw cursor position (used elsewhere, keep this)
    setCursorPosition({ x: e.clientX, y: e.clientY });

    // --- ALWAYS Update Normalized Position for Raycasting --- 
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = -(e.clientY / window.innerHeight) * 2 + 1; // Invert Y
      setNormalizedMousePosition({ x: normX, y: normY });
    // --- END NORMALIZED UPDATE --- 

    // Conditional logic based on view state
    if (viewState === 'initial') {
      // Reset arrow/scroll related states if moving mouse in initial view
      setShowLeftArrow(false);
      setShowRightArrow(false);
      setInArrowZone(false);
      setIsHoveringLeft(false);
      setIsHoveringRight(false);
      setHoverLocked(false);
    } else if (viewState === 'cardSelection' && isLoaded && active === null) {
      // Existing logic for card selection arrow zones
      const arrowZoneWidth = 180; 
      const x = e.clientX;
      const width = window.innerWidth;
      
      if (x < arrowZoneWidth || x > width - arrowZoneWidth) {
        setInArrowZone(true);
        setShowLeftArrow(true);
        setShowRightArrow(true);
      } else {
        setInArrowZone(false);
        if (!isHoveringLeft && !isHoveringRight) {
          setHoverLocked(false);
        }
        setShowLeftArrow(true);
        setShowRightArrow(true);
      }
    }
  };
  
  // Always show arrows if we have more than 3 cards
  const shouldShowArrows = cardArr.length > 3;
  
  // Simple wheel handler with no special cases
  useEffect(() => {
    const containerRef = document.getElementById('card-container');
    
    if (containerRef) {
      const handleWheelEvent = (e: WheelEvent) => {
        // --- CHECK FOR DEBUG MENU SCROLL --- 
        // Check if the event target or its parents are the debug menu
        let targetElement = e.target as HTMLElement | null;
        while (targetElement) {
          if (targetElement.id === 'debug-menu-container') {
            // Event originated inside the debug menu, allow default scroll
            console.log("[Wheel Event] Allowing scroll for debug menu.");
            return; 
          }
          targetElement = targetElement.parentElement;
        }
        // --- END DEBUG MENU CHECK ---

        // If not scrolling the debug menu, prevent default page scroll
        e.preventDefault();
        
        // Guard: Only allow wheel events in card selection view
        if (viewState !== 'cardSelection') return;

        // Handle wheel events based on current view
        if (!isLoaded) {
          return;
        }
        
        // Active view: navigate between cards
        if (active !== null) {
          // CRITICAL FIX: Debounce rapid wheel events to prevent race conditions
          // If we're actively processing a wheel event, ignore additional ones
          if (window.__processingWheelEvent) {
            return;
          }
          window.__processingWheelEvent = true;
          
          const direction = e.deltaY > 0 ? 1 : -1;
          const activeIndex = cardArr.findIndex(card => card.id === active);
          
          // Calculate the next card index with wrap-around
          let nextIndex = activeIndex + direction;
          if (nextIndex < 0) nextIndex = cardArr.length - 1;
          if (nextIndex >= cardArr.length) nextIndex = 0;
          
          // Navigate to the next card
          console.log(`[WHEEL NAV] Scrolling in active view: ${activeIndex} -> ${nextIndex} (currentCard: ${active}, nextCard: ${cardArr[nextIndex].id})`);
          
          // CRITICAL FIX: Get both current and next cards
          const currentActiveCard = cardArr[activeIndex];
          const nextActiveCard = cardArr[nextIndex];
          
          // CRITICAL FIX: Always reset the current card's flip state unconditionally
          // This makes wheel navigation consistent with keyboard navigation
          console.log(`[WHEEL NAV] Always resetting flip state of current card ${active} (isFlipped: ${currentActiveCard.isFlipped})`);
          flipCard(active, false);
          
          // Clear any existing directFlip flags to prevent interference
          window.__directFlipCard = null;
          
          // Execute the navigation in a requestAnimationFrame to ensure DOM updates
          requestAnimationFrame(() => {
            // Set up for flipping the new card explicitly 
            console.log(`[WHEEL NAV] Setting directFlip for card ${nextActiveCard.id}`);
            window.__directFlipCard = nextActiveCard.id;
            
            // Set the new active card after the flip is set up
            setActive(nextActiveCard.id);
            
            // CRITICAL FIX: Set a timeout to release the wheel event processing lock
            // This gives the system enough time to process the state change
            setTimeout(() => {
              window.__processingWheelEvent = false;
            }, 100);
          });
          
          return;
        }
        
        // Idle view: scroll through the row
        const direction = e.deltaY > 0 ? 1 : -1;
        
        // IMPROVED: Scale scroll amount based on deltaY magnitude for more responsive wheel scrolling
        // For small scrolls, move 1 card. For larger scrolls, move up to 3 cards at once
        const scrollAmount = Math.min(3, Math.max(1, Math.ceil(Math.abs(e.deltaY) / 100)));
        const scaledDirection = direction * scrollAmount;
        
        // Get current position data
        const cardPositions = getCardPositions();
        const currentIndex = getCurrentCardIndex();
        
        // Calculate target position with scaled movement
        const targetIndex = Math.max(0, Math.min(cardArr.length - 1, currentIndex + scaledDirection));
        const targetPosition = cardPositions[targetIndex];
        
        console.log(`[WHEEL] Scrolling ${scrollAmount} cards from ${currentIndex} to ${targetIndex}`);
        
        // Set the target position
        setTargetScrollPosition(targetPosition);
      };
      
      // Changed to non-passive to allow preventDefault()
      containerRef.addEventListener('wheel', handleWheelEvent, { passive: false });
      
      return () => {
        containerRef.removeEventListener('wheel', handleWheelEvent);
      };
    }
  }, [
    isLoaded, 
    active, 
    getCardPositions, 
    getCurrentCardIndex, 
    cardArr,
    setTargetScrollPosition,
    setActive,
    flipCard,
    viewState
  ]);

  // Add keyboard navigation for inactive view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow Enter key in initial view (handled separately)
      if (e.key === 'Enter' && viewState === 'initial') return;

      // Guard: Only handle other keys in card selection view
      if (viewState !== 'cardSelection') return;
      
      // Only handle keys in the inactive (idle) view when selecting cards
      if (!isLoaded || active !== null) {
        return;
      }
      
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        // Prevent default behavior (like page scrolling)
        e.preventDefault();
        
        // Determine direction based on key
        const direction = e.key === 'ArrowRight' ? 1 : -1;
        
        // Get current position data
        const cardPositions = getCardPositions();
        const currentIndex = getCurrentCardIndex();
        
        // Calculate target position
        const targetIndex = Math.max(0, Math.min(cardArr.length - 1, currentIndex + direction));
        const targetPosition = cardPositions[targetIndex];
        
        console.log(`[KEY NAV] Arrow ${e.key} pressed. Scrolling from index ${currentIndex} to ${targetIndex}`);
        
        // Set the target position
        setTargetScrollPosition(targetPosition);
      }
      // Add Enter key selection
      else if (e.key === 'Enter') {
        e.preventDefault();
        
        // Get the current centered card
        const currentIndex = getCurrentCardIndex();
        const selectedCard = cardArr[currentIndex];
        
        if (selectedCard) {
          console.log(`[KEY NAV] Enter pressed. Selecting card: ${selectedCard.id} (${selectedCard.name})`);
          
          // Set up for flipping after activation
          window.__directFlipCard = selectedCard.id;
          
          // Set the active card
          setActive(selectedCard.id);
        }
      }
    };
    
    // Add event listener for keyboard navigation
    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isLoaded,
    active,
    getCardPositions,
    getCurrentCardIndex,
    cardArr,
    setTargetScrollPosition,
    setActive
  ]);

  // Cleanup for all scroll-related timers and animations
  useEffect(() => {
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, []);

  // In DesktopScene.tsx where active card changes (handleKeyDown or handlePage)
  useEffect(() => {
    if (active !== null) {
      // When active card changes, update scrollPosition to match
      const activeIndex = cardArr.findIndex(card => card.id === active);
      const newPosition = (activeIndex - (cardArr.length - 1) / 2) * 1.2;
      setTargetScrollPosition(newPosition);
    } else {
      // When returning to idle view (active becomes null)
      // This is where we need to trigger the smooth row animation
      
      // We don't need to do anything special here, as each card component
      // will detect the transition from active to null and set its own
      // isReturningToIdleRef flag to trigger smooth animation
    }
  }, [active, cardArr]);

  // When active changes to null (card is deselected), unlock hover immediately
  useEffect(() => {
    if (active === null) {
      setHoverLocked(false);
    }
  }, [active]);

  // Extract the variant indices to a variable for the dependency array
  const variantIndicesString = cardArr.map(card => card.selectedVariantIndex).join(',');
  
  // Update bottom color based on selected card and its variants
  useEffect(() => {
    const activeCard = cardArr.find((card) => card.id === active);
    if (active !== null && activeCard) {
      const currentVariantIndex = activeCard.selectedVariantIndex;
      
      // Get the variant color
      const selectedVariant = activeCard.colorVariations[currentVariantIndex];
      
      // Update the bottom color with the variant's background color
      setBottomColor(selectedVariant.bgColor);
    } else {
      setBottomColor("#bdd7ee"); // Default blue color
    }
  }, [active, cardArr, variantIndicesString]);

  // Listen for deselection event to immediately ensure container is clickable
  useEffect(() => {
    // CRITICAL FIX: Listen for animation events and ensure card container is always clickable
    const handleInteractionEnabled = () => {
      const cardContainer = document.getElementById('card-container');
      if (cardContainer) {
        // Force card container to always be clickable 
        cardContainer.style.pointerEvents = 'auto';
        
        // Force z-index to ensure it's on top
        cardContainer.style.zIndex = '25';
      }
    };

    window.addEventListener('card_interaction_enabled', handleInteractionEnabled);
    
    return () => {
      window.removeEventListener('card_interaction_enabled', handleInteractionEnabled);
    };
  }, []);

  // FAILSAFE: Ensure flipping always happens on selection
  useEffect(() => {
    let timeoutId: number | null = null;
    let isActive = true; // Track if this effect is still active
    
    // Monitor active changes and ensure direct flip happens
    if (active !== null && window.__directFlipCard === active) {
      console.log(`[FAILSAFE] Active card ${active} has directFlip flag set, preparing to check flip state`);
      
      // Get the currently active card
      const activeCard = cardArr.find(card => card.id === active);
      
      // CRITICAL FIX: Multi-stage failsafe for reliable wheel navigation
      // Use a series of timeouts with increasing delays
      
      // First chance - quick check
      timeoutId = window.setTimeout(() => {
        if (!isActive) return;
        
        if (window.__directFlipCard === active && activeCard && !activeCard.isFlipped) {
          console.log(`[FAILSAFE-1] Quick check flip for card ${active}`);
          flipCard(active, true);
        }
      }, 100);
      
      // Second chance - medium delay
      window.setTimeout(() => {
        if (!isActive) return;
        
        // Re-fetch the card to get current state
        const currentCard = cardArr.find(card => card.id === active);
        if (window.__directFlipCard === active && currentCard && !currentCard.isFlipped) {
          console.log(`[FAILSAFE-2] Medium check flip for card ${active}`);
          flipCard(active, true);
        }
      }, 250);
      
      // Last chance - longer delay
      window.setTimeout(() => {
        if (!isActive) return;
        
        // Final check with fresh data
        const finalCard = cardArr.find(card => card.id === active);
        if (window.__directFlipCard === active && finalCard && !finalCard.isFlipped) {
          console.log(`[FAILSAFE-3] Final check flip for card ${active}`);
          flipCard(active, true);
        }
        
        // Always clear the flag at this point
        if (window.__directFlipCard === active) {
          console.log(`[FAILSAFE] Clearing directFlip flag for ${active}`);
          window.__directFlipCard = null;
        }
      }, 400);
    }
    
    return () => {
      isActive = false;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [active, flipCard, cardArr]);

  // Define a proper interface for handled events
  interface ExtendedEvent extends Event {
    __handled?: boolean;
  }
  
  // CRITICAL BACKUP: Global click handler as a last resort
  useEffect(() => {
    // Only attach global click handler when in inactive view
    if (active !== null || !isLoaded) return;

    const handleCardContainerClick = (e: MouseEvent) => {
      // Only process in inactive view
      if (active !== null) return;
      
      // Guard: Only run this fallback click handler in the card selection view
      if (viewState !== 'cardSelection') return;

      // Cast to extended event type
      const extendedEvent = e as unknown as ExtendedEvent;
      
      // CRITICAL FIX: Block selection completely during arrow interactions
      if (isHoveringLeft || isHoveringRight || arrowInteraction) {
        console.log(`[GLOBAL CLICK] Blocked selection during arrow interaction`);
        e.stopPropagation();
        extendedEvent.__handled = true;
        return;
      }
      
      // Don't override Three.js raycaster with our own selection logic
      // This global handler should only be a fallback if Three.js fails
      
      // Check if the event has already been processed by a card component
      if (extendedEvent.__handled) {
        console.log(`[GLOBAL CLICK] Event already handled by a card component`);
        return;
      }
      
      // Get current position data
      const currentIndex = getCurrentCardIndex();
      
      // Just select the current centered card as a fallback
      const cardId = cardArr[currentIndex].id;
      console.log(`[GLOBAL CLICK] Fallback selection for card ${cardId}`);
      
      // Set up for flipping
      window.__directFlipCard = cardId;
      
      // Set the active state
      setActive(cardId);
    };
    
    const cardContainer = document.getElementById('card-container');
    if (cardContainer) {
      // Use a delayed low-priority click listener to allow Three.js to handle clicks first
      cardContainer.addEventListener('click', handleCardContainerClick, { capture: false });
    }
    
    return () => {
      if (cardContainer) {
        cardContainer.removeEventListener('click', handleCardContainerClick, { capture: false });
      }
    };
  }, [active, isLoaded, getCurrentCardIndex, cardArr, setActive, isHoveringLeft, isHoveringRight, arrowInteraction]);

  // Add a direct DOM event listener for capturing arrow clicks before they reach Three.js
  useEffect(() => {
    if (!canvasRef.current || active !== null || !isLoaded) return;
    
    // Capture the ref value to use in cleanup
    const canvas = canvasRef.current;
    
    // This handler will run before Three.js processes the click
    const handleCanvasClick = (e: MouseEvent) => {
      // Cast to extended event type
      const extendedEvent = e as unknown as ExtendedEvent;
      
      if (isHoveringLeft || isHoveringRight || arrowInteraction) {
        console.log('[CANVAS] Blocked click during arrow interaction');
        e.stopPropagation();
        e.preventDefault();
        extendedEvent.__handled = true;
        return false;
      }
    };
    
    // Add in capture phase to intercept before Three.js
    canvas.addEventListener('click', handleCanvasClick, { capture: true });
    
    return () => {
      // Use the captured ref value in cleanup
      canvas.removeEventListener('click', handleCanvasClick, { capture: true });
    };
  }, [active, isLoaded, isHoveringLeft, isHoveringRight, arrowInteraction]);

  // Define the startScrollInterval function with useCallback
  const startScrollInterval = useCallback(() => {
    if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
    
    // Set scrolling state to prevent snapping during active scrolling
    setIsActivelyScrolling(true);
    
    // Track current card and time of last scroll
    let currentCardIndex = getCurrentCardIndex();
    let lastScrollTime = Date.now();
    
    scrollIntervalRef.current = setInterval(() => {
      // Only scroll if enough time has passed since last scroll (throttle)
      const now = Date.now();
      // Use a faster scrolling interval when arrow is clicked
      const scrollThrottle = arrowClicked ? 5 : 15; // Even faster when clicked
      if (now - lastScrollTime < scrollThrottle) return;
      
      if (isHoveringLeft) {
        // Move directly to previous card
        const nextIndex = Math.max(0, currentCardIndex - (arrowClicked ? 2 : 1)); // Move 2 cards at once when clicked
        if (nextIndex !== currentCardIndex) {
          const cardPositions = getCardPositions();
          const targetPosition = cardPositions[nextIndex];
          setTargetScrollPosition(targetPosition);
          setHoverLocked(true);
          currentCardIndex = nextIndex;
          lastScrollTime = now;
        }
      } else if (isHoveringRight) {
        // Move directly to next card
        const nextIndex = Math.min(cardArr.length - 1, currentCardIndex + (arrowClicked ? 2 : 1)); // Move 2 cards at once when clicked
        if (nextIndex !== currentCardIndex) {
          const cardPositions = getCardPositions();
          const targetPosition = cardPositions[nextIndex];
          setTargetScrollPosition(targetPosition);
          setHoverLocked(true);
          currentCardIndex = nextIndex;
          lastScrollTime = now;
        }
      }
    }, 25); // IMPROVED: Reduced from 40ms for smoother animation
  }, [
    arrowClicked,
    cardArr,
    getCurrentCardIndex,
    getCardPositions,
    isHoveringLeft,
    isHoveringRight,
    setHoverLocked,
    setIsActivelyScrolling,
    setTargetScrollPosition
  ]);
  
  // Handle scroll stopping and snapping to the nearest card - memoized to avoid recreation
  const handleScrollStop = useCallback(() => {
    // Don't snap when a card is active
    if (active !== null) {
      return;
    }
    
    // Find the nearest card position to snap to
    const cardPositions = getCardPositions();
    
    // Find the card closest to the current scroll position
    const closestCardIndex = cardPositions.reduce((prevIndex, position, currentIndex) => {
      return Math.abs(position - scrollPosition) < Math.abs(cardPositions[prevIndex] - scrollPosition)
        ? currentIndex
        : prevIndex;
    }, 0);

    const nearestCardPosition = cardPositions[closestCardIndex];

    // Always snap to nearest card position for more predictable navigation
    const targetPosition = Math.min(maxScrollRight, Math.max(maxScrollLeft, nearestCardPosition));
    setTargetScrollPosition(targetPosition);
    
    // CRITICAL FIX: Signal the snap completion to synchronize all cards
    // Wait a brief moment to ensure the scroll animation has fully started
    setTimeout(() => {
      // Dispatch an event that all cards can listen for to synchronize
      window.dispatchEvent(new CustomEvent('scroll_snap_complete'));
    }, 50);
    
    // Immediately unlock hover when scrolling stops
    setHoverLocked(false);
    setIsActivelyScrolling(false);
    setIsWheelScrolling(false);
  }, [
    active,
    scrollPosition,
    getCardPositions,
    maxScrollRight,
    maxScrollLeft,
    setTargetScrollPosition,
    setHoverLocked,
    setIsActivelyScrolling,
    setIsWheelScrolling
  ]);

  // Start/stop scroll interval when hovering over arrows
  useEffect(() => {
    if ((isHoveringLeft || isHoveringRight) && !active) {
      startScrollInterval();
    } else {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
        
        // Reset hover lock immediately when not hovering over arrows
        setHoverLocked(false);
        
        // Only trigger snap when user stops hovering over arrows
        if (!isHoveringLeft && !isHoveringRight) {
          // Trigger snapping immediately for better responsiveness
          setIsActivelyScrolling(false);
          handleScrollStop();
        }
      }
    }
    
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
        setHoverLocked(false); // Always ensure hover lock is released on cleanup
      }
    };
  }, [isHoveringLeft, isHoveringRight, active, handleScrollStop, setHoverLocked, startScrollInterval]);

  // Toggle Debug Mode with Backtick key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === '`') {
        // Use function form to get correct state for logging and update
        setIsDebugMode((prev: boolean) => {
          console.log(`Debug mode ${!prev ? 'enabled' : 'disabled'}`);
          return !prev;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []); // Empty dependency array

  // Handle Enter key press to transition from initial view
  useEffect(() => {
    const handleEnterKey = (event: KeyboardEvent) => {
      // Only trigger if Enter is pressed and we are in the initial view
      if (event.key === 'Enter' && viewState === 'initial') {
        console.log("[KEY NAV] Enter pressed in initial view. Transitioning...");
        setViewState('cardSelection');
      }
    };

    // Add event listener only when the component is mounted and viewState is initial
    if (viewState === 'initial') {
      window.addEventListener('keydown', handleEnterKey);
    }

    // Cleanup function to remove the listener
    return () => {
      window.removeEventListener('keydown', handleEnterKey);
    };
  }, [viewState, setViewState]); // Re-run effect if viewState changes

  // Initialize Audio Context (only on client-side)
  const initAudioContext = useCallback(() => {
    if (typeof window !== 'undefined' && !audioContext) {
      const newContext = new window.AudioContext();
      console.log("[Audio] Context created, state:", newContext.state);
        setAudioContext(newContext);
      return newContext;
    }
    return audioContext;
  }, [audioContext]);

  // Function to load audio file
  const loadAudio = useCallback(async (context: AudioContext | null) => {
    if (!context || audioBuffer || audioLoadCalled.current) return;

    audioLoadCalled.current = true; // Mark as load attempted
    setIsAudioLoading(true);
    console.log("[Audio] Starting load...");

    try {
      const response = await fetch('/Deep in It.mp3');
      const arrayBuffer = await response.arrayBuffer();
      const decodedBuffer = await context.decodeAudioData(arrayBuffer);
      console.log("[Audio] Load successful!");
      setAudioBuffer(decodedBuffer);
    } catch (error) {
      console.error("[Audio] Error loading or decoding audio:", error);
      audioLoadCalled.current = false; // Allow retry if load failed
    } finally {
      setIsAudioLoading(false);
    }
  }, [audioBuffer]); // Dependencies: Only audioBuffer

  // Toggle playback using Web Audio API
  const togglePlayback = useCallback(() => {
    if (!audioContext || !audioBuffer) {
        console.warn("[Audio Toggle] Context or buffer not ready.");
      return;
    }

      if (audioContext.state === 'suspended') {
        audioContext.resume(); // Attempt to resume if suspended
    }

    if (isMusicPlaying) {
        // Stop playback
        if (audioSourceNode) {
            console.log("[Audio Toggle] Stopping playback.");
            audioSourceNode.stop();
            setAudioSourceNode(null); // Clear the source node
            setAudioStartTime(null); // Reset start time
        }
    } else {
        // Start playback
        console.log("[Audio Toggle] Starting playback.");
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        const startTime = audioContext.currentTime;
        source.start(startTime);
        setAudioSourceNode(source);
        setAudioStartTime(startTime); // Record start time

        source.onended = () => {
            console.log("[Audio Toggle] Playback ended.");
            // Only reset if this specific source node finished naturally
            setAudioSourceNode(currentSource => (currentSource === source ? null : currentSource));
            setAudioStartTime(null);
            setIsMusicPlaying(false); // Ensure state reflects ended playback
        };
    }
  }, [audioContext, audioBuffer, isMusicPlaying, audioSourceNode]);

  // Combined function to handle the toggle click (init, load, toggle)
  const handleMusicToggleClick = useCallback(() => {
    let currentContext = audioContext;
    // 1. Initialize Context if needed
    if (!currentContext) {
      currentContext = initAudioContext(); // Initialize and get the context
      if (!currentContext) return; // Exit if context creation failed (shouldn't happen)
    }

    // 2. Load Audio if needed (only if context exists and not already loaded/loading)
    if (currentContext && !audioBuffer && !audioLoadCalled.current && !isAudioLoading) {
      loadAudio(currentContext); // Start loading
      // Don't proceed to toggle yet, wait for load
      console.log("[Toggle Click] Audio not loaded, triggering load.")
      return; // Let load complete first
    }

    // 3. Resume Context if suspended (often needed after user interaction)
    if (currentContext && currentContext.state === 'suspended') {
      console.log("[Toggle Click] Resuming suspended context.");
      currentContext.resume().catch(err => console.error("Resume failed on toggle:", err));
      // It might take a moment to resume, but we can proceed optimistically
    }

    // 4. Toggle Playback State *after* potential loading/resuming
    if (audioBuffer) { // Only toggle if buffer is actually loaded
        console.log("[Toggle Click] Toggling playback state.");
        togglePlayback(); // Call the playback logic
        setIsMusicPlaying(prev => !prev); // Update the state AFTER calling toggle
    } else if (isAudioLoading) {
        console.log("[Toggle Click] Audio is still loading...");
    } else {
        console.warn("[Toggle Click] Cannot toggle: Audio buffer not available.");
      }
  }, [audioContext, initAudioContext, audioBuffer, loadAudio, isAudioLoading, togglePlayback]);

  // Effect to link music state to beat state (no change needed here)
  useEffect(() => {
    if (!isMusicPlaying) {
      setIsBeatAnimationEnabled(false); // Turn off beat if music is off
    } else {
      setIsBeatAnimationEnabled(true); // Turn ON beat if music is on
    }
  }, [isMusicPlaying]);

  // Cleanup effect for audio context and source node
  useEffect(() => {
    // Return a cleanup function
    return () => {
      console.log("Cleaning up audio context and source...");
      if (audioSourceNode) {
        try { audioSourceNode.stop(); } catch(e) {/* ignore */}
        setAudioSourceNode(null);
      }
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().then(() => console.log("AudioContext closed."))
          .catch(err => console.error("Failed to close AudioContext:", err));
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on unmount

  // Function to add a placed light (using current global settings as defaults)
  const addPlacedLight = useCallback((worldPosition: [number, number, number]) => {
    const newLight: PlacedLight = {
      id: nextLightId.current++,
      position: worldPosition,
      type: 'point', // Default type
      intensity: placedLightIntensity,
      distance: placedLightDistance,
      color: placedLightColor,
      angle: Math.PI / 4, // Default angle (SpotLight)
      penumbra: 0.1, // Default penumbra (SpotLight)
    };
    setPlacedLights(prev => [...prev, newLight]);
    console.log("[Debug] Added light:", newLight);
  }, [placedLightIntensity, placedLightDistance, placedLightColor]); 

  // Function to spawn a test light at a fixed position (using defaults)
  const spawnTestLight = useCallback(() => {
      const newLight: PlacedLight = {
          id: nextLightId.current++,
          position: [2, 2, 2], 
          type: 'point', // Default type
          intensity: placedLightIntensity,
          distance: placedLightDistance,
          color: placedLightColor,
          angle: Math.PI / 4, // Default angle
          penumbra: 0.1, // Default penumbra
      };
      console.log(`[Debug] Spawning test light:`, newLight);
      setPlacedLights((prevLights) => [...prevLights, newLight]);
  }, [placedLightIntensity, placedLightDistance, placedLightColor]); 

  // Define GLTF button position for reference
  const gltfButtonPosition: [number, number, number] = [0, 10.26, -9.34];

  // Handlers for UI buttons
  const handleSaveCamera = (slot: 1 | 2) => {
    setSaveSlotTarget(slot);
    setSaveCameraTrigger(c => c + 1); // Increment trigger
    console.log(`Requesting save for camera slot ${slot}`);
  };

  const handleRecallCamera = (slot: 1 | 2) => {
    setRecallSlotTarget(slot);
    setRecallCameraTrigger(c => c + 1); // Increment trigger
    console.log(`Requesting recall for camera slot ${slot}`);
  };

  // --- Camera Animation Logic ---
  const CameraAnimator = () => {
    // --- Exit early if in Debug Mode ---
    if (isDebugMode) {
      return null; // Don't run any camera animation logic if debug controls are active
    }
    // --- End Exit Early ---

    const { camera } = useThree();
    // Define target positions for different states
    const initialTargetPos = useMemo(() => new THREE.Vector3(-0.05, 9.93, 11.35), []);
    const cardSelectPos = useMemo(() => new THREE.Vector3(0, 2, 8), []);
    const activeCardPos = useMemo(() => new THREE.Vector3(0, 2.5, 20), []); // From original Experience logic

    // --- Helper objects (reusable) ---
    const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
    const lookAtTarget = useMemo(() => new THREE.Vector3(0, 0, 0), []);
    const identityQuaternion = useMemo(() => new THREE.Quaternion(), []); // Identity
    // Add temporary quaternion for per-frame calculation
    const currentTargetQuat = useMemo(() => new THREE.Quaternion(), []);

    useFrame((state, delta) => {
      let targetPos: THREE.Vector3;
      // Use single smoothTime again
      let smoothTime = 0.5; 

      // Determine target position and smooth time
      if (viewState === 'initial') {
        targetPos = initialTargetPos;
        smoothTime = 0.5;
      } else { // viewState === 'cardSelection'
        if (active !== null) { // Active card view
          targetPos = activeCardPos;
          smoothTime = 0.3; // Faster transition
        } else { // Card selection row view (inactive)
          targetPos = cardSelectPos; 
          smoothTime = 0.4; // Tuned for snappier transition FROM initial OR active view
        }
      }

      // --- Damp Position ---
      easing.damp3(
        camera.position, // Target object
        targetPos,       // Target value (Vector3)
        smoothTime,      // Use consistent smooth time
        delta            // Frame delta time
      );

      // --- Damp Rotation towards PER-FRAME calculated Target Quaternion ---
      if (viewState === 'initial') {
        // Damp towards identity (zero rotation)
        easing.dampQ(
            camera.quaternion,
            identityQuaternion,
            smoothTime, // Use consistent smooth time
            delta
        );
      } else {
        // Calculate target lookAt rotation based on CURRENT position
        tempMatrix.lookAt(camera.position, lookAtTarget, camera.up);
        currentTargetQuat.setFromRotationMatrix(tempMatrix);
        
        // Damp towards the calculated rotation
        easing.dampQ(
            camera.quaternion, 
            currentTargetQuat, // Use the quaternion calculated this frame
            smoothTime, // Use consistent smooth time
            delta
        );
      }

      // No need for manual updateProjectionMatrix with damping
    });

    return null; // This component doesn't render anything itself
  };
  // --- End Camera Animation Logic ---

  // --- Component to Update Debug Info State from within Canvas ---
  const DebugInfoUpdater = () => {
    const { camera } = useThree();
    const positionRef = useRef('');
    const rotationRef = useRef('');

    useFrame(() => {
      const pos = camera.position;
      const rot = camera.rotation;

      const newPositionStr = `Position: { x: ${pos.x.toFixed(2)}, y: ${pos.y.toFixed(2)}, z: ${pos.z.toFixed(2)} }`;
      const newRotationStr = `Rotation: { x: ${(rot.x * 180 / Math.PI).toFixed(1)}°, y: ${(rot.y * 180 / Math.PI).toFixed(1)}°, z: ${(rot.z * 180 / Math.PI).toFixed(1)}° }`;

      let changed = false;
      let newInfo = { position: '', rotation: '' };

      if (newPositionStr !== positionRef.current) {
        positionRef.current = newPositionStr;
        newInfo.position = newPositionStr;
        changed = true;
      }
      if (newRotationStr !== rotationRef.current) {
        rotationRef.current = newRotationStr;
        newInfo.rotation = newRotationStr;
        changed = true;
      }

      if (changed) {
        // Explicitly type prev
        setDebugInfo((prev: { position: string; rotation: string }) => ({ 
          position: newInfo.position || prev.position, 
          rotation: newInfo.rotation || prev.rotation 
        }));
      }
    });

    return null; // Does not render anything itself
  };
  // --- End Debug Info Updater ---

  // --- Component to Reset Camera Z Rotation ---
  const CameraResetter = ({ trigger }: { trigger: number }) => {
    const { camera } = useThree();

    useEffect(() => {
      if (trigger > 0) { // Only run on trigger change, not initial render
        console.log("[CameraResetter] Resetting camera Z rotation.");
        camera.rotation.z = 0;
        // Optionally, update projection matrix if needed, though usually not for just rotation
        // camera.updateProjectionMatrix(); 
      }
    }, [trigger, camera]); // Depend on trigger and camera

    return null; // Does not render anything itself
  };
  // --- End Camera Resetter ---

  // --- Function to remove a placed light ---
  const removePlacedLight = useCallback((idToRemove: number) => {
    setPlacedLights(prev => prev.filter(light => light.id !== idToRemove));
    console.log(`[Debug] Removed light with id: ${idToRemove}`);
  }, []);

  // Function to spawn a GLTF object
  const spawnGltf = (url: string, position?: [number, number, number]) => {
    const newObject: SpawnedObject = {
      id: nextSpawnedObjectId.current++,
      url,
      position: position ?? [0, 1.5, 0], // Default spawn position slightly above ground
      // No bump map initially
    };
    setSpawnedObjects((prev) => [...prev, newObject]);
  };

  // Function to TOGGLE bump map on the FIRST spawned iPhone 11
  const toggleBumpMapOnFirstIphone = () => {
    let targetId: number | null = null;
    let didApply = false;
    let didRemove = false;

    setSpawnedObjects(prevObjects => {
      let updated = false; // Flag to ensure we only update the first match
      const newObjects = prevObjects.map(obj => {
        if (!updated && obj.url === '/iphone11.glb') {
          updated = true; 
          targetId = obj.id;
          
          // Check if bump map is currently applied
          if (obj.bumpMapConfig) {
            // It's applied, so remove it
            console.log(`Removing bump map config from spawned object ID: ${obj.id}`);
            didRemove = true;
            return {
              ...obj,
              bumpMapConfig: undefined, // Set to undefined to remove
            };
          } else {
            // It's not applied, so add it
            console.log(`Applying bump map config to spawned object ID: ${obj.id}`);
            didApply = true;
            return {
              ...obj,
              // Update the config here
              bumpMapConfig: {
                textureUrl: '/scratch_mask.png',
                // materialName: 'UKcVVyjRJKyQpxF', // REMOVE or comment out
                bumpScale: -0.02, // Use negative scale for concave scratches
              },
            };
          }
        }
        return obj; // Return unmodified objects if not the target
      });

      // --- Update Status Message --- 
      if (targetId !== null) {
        if (didApply) {
            setBumpMapStatus(`Scratch map APPLIED to iPhone ID: ${targetId}`); // Update text
        } else if (didRemove) {
            setBumpMapStatus(`Scratch map REMOVED from iPhone ID: ${targetId}`); // Update text
        }
      } else if (prevObjects.some(o => o.url === '/iphone11.glb')) {
         setBumpMapStatus("No iPhone found that needed toggling."); 
      } else {
         setBumpMapStatus("No iPhone spawned to toggle map on.");
      }
      // --- End Status Update --- 

      return newObjects; // Return the potentially modified array
    });

    // Fallback status update if no objects existed initially
    if (spawnedObjects.length === 0) {
        setBumpMapStatus("No objects spawned yet.");
    }
  };

  // Toggle function for Mouse Light
  const toggleMouseLight = useCallback(() => {
    setIsMouseLightActive(prev => !prev);
  }, []);

  // --- Mouse Light Controller Component (runs inside Canvas) ---
  const MouseLightController = ({ isActive, setPosition }: { isActive: boolean; setPosition: Dispatch<SetStateAction<THREE.Vector3>> }) => {
    const { raycaster, scene, camera, size } = useThree();
    const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []); // Ground plane at Y=0
    const intersectionPoint = useMemo(() => new THREE.Vector3(), []);

    useFrame(() => {
      if (!isActive) return; 
      
      // COMMENT OUT continuous logs
      // console.log("[MouseLightController] useFrame running..."); 

      const mouseCoords = new THREE.Vector2(normalizedMousePosition.x, normalizedMousePosition.y);
      // console.log("[MouseLightController] Mouse Coords:", mouseCoords); 
      raycaster.setFromCamera(mouseCoords, camera);
      
      if (raycaster.ray.intersectPlane(plane, intersectionPoint)) {
        intersectionPoint.y += 0.5; 
        // console.log("[MouseLightController] Intersection Point:", intersectionPoint); 
        setPosition(intersectionPoint.clone()); 
      } else {
        // console.log("[MouseLightController] No intersection with ground plane.");
      }
    });

    // Keep the activation/deactivation log
    // ... useEffect log ...

    return null; 
  };
  // --- End Mouse Light Controller ---

  // --- Function to update a specific light's position ---
  const updateLightPosition = useCallback((id: number, newPosition: THREE.Vector3) => {
      setPlacedLights(prevLights => 
          prevLights.map(light => 
              light.id === id ? { ...light, position: [newPosition.x, newPosition.y, newPosition.z] } : light
          )
      );
  }, []);

  // --- Function to update a specific light property (color, intensity, distance) ---
  const updatePlacedLightProperty = useCallback((id: number, property: keyof PlacedLight, value: any) => {
      setPlacedLights(prevLights => 
          prevLights.map(light => {
              if (light.id === id) {
                  console.log(`[Debug] Updating light ${id}: setting ${property} to`, value);
                  return { ...light, [property]: value };
              }
              return light;
          })
      );
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* ~~ Render Initial View conditionally with exit animation ~~ REMOVED */}
      {/* <AnimatePresence> */}
      {/*   {viewState === 'initial' && isLoaded && <InitialView setViewState={setViewState} />} */}
      {/* </AnimatePresence> */}

      {/* Framer Motion Gradient Background */}
      <AnimatePresence>
        <motion.div 
          key={bottomColor}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 z-10"
          style={{
            background: `linear-gradient(to bottom, #ffffff 0%, #ffffff 10%, ${bottomColor} 100%)`,
            pointerEvents: 'none'
          }}
        />
      </AnimatePresence>

      <div 
        id="card-container"
        style={{ 
          // CRITICAL: Force optimizations for the container to ensure it responds immediately
          willChange: "transform, opacity",
          zIndex: active === null ? '25' : '20' // Always prioritize in inactive view
        }}
        className={`h-full w-full relative overflow-hidden ${active === null ? 'pointer-events-auto' : ''}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          if (active === null) {
            setShowLeftArrow(false);
            setShowRightArrow(false);
            setIsHoveringLeft(false);
            setIsHoveringRight(false);
            setInArrowZone(false);
            setArrowInteraction(false);
          }
        }}
      >
        {/* Loading screen remains outside animation */}
        {!isLoaded && <LoadingScreen onLoaded={() => setIsLoaded(true)} />}

        {/* Animated container for Card Selection UI elements */}
        <AnimatePresence>
          {viewState === 'cardSelection' && (
            <motion.div
              key="cardSelectionUI"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.1, duration: 0.5 } }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30"
              style={{ pointerEvents: 'none' }}
            >
              {/* Active UI (needs pointer events) */}
              <div style={{ pointerEvents: 'auto' }}>
                <ActiveUi
                  active={active}
                  setActive={setActive}
                  cardArr={cardArr}
                  setCardArr={setCardArr}
                  flipCard={flipCard}
                />
              </div>

              {/* Conditionally render Arrows and Blocking Divs within the animated container */}
              {showUI && shouldShowArrows && (
                <>
                  {/* Left blocking zone */}
                  <div 
                    className={`absolute left-0 top-0 h-full transition-opacity duration-300 ease-in-out ${
                      isHoveringLeft ? 'opacity-100' : 'opacity-0' // Keep pointer-events logic here
                    }`}
                    style={{ 
                      width: '160px', 
                      zIndex: 39, 
                      pointerEvents: isHoveringLeft ? 'auto' : 'none' // Manage pointer events
                    }}
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                  />
                  {/* Right blocking zone */}
                  <div 
                    className={`absolute right-0 top-0 h-full transition-opacity duration-300 ease-in-out ${
                      isHoveringRight ? 'opacity-100' : 'opacity-0' // Keep pointer-events logic here
                    }`}
                    style={{ 
                      width: '160px', 
                      zIndex: 39, 
                      pointerEvents: isHoveringRight ? 'auto' : 'none' // Manage pointer events
                    }}
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                  />
                  {/* Left Arrow */}
                  <div 
                    className={`absolute left-6 top-1/2 -translate-y-1/2 z-40 transition-opacity duration-300 ease-in-out ${
                      showLeftArrow ? 'opacity-90' : 'opacity-0'
                    } ${scrollPosition <= maxScrollLeft + 0.1 ? 'pointer-events-none opacity-30' : 'hover:opacity-100'}`}
                    style={{ pointerEvents: 'auto' }} // Arrows always need pointer events
                    onMouseEnter={() => {
                      setShowLeftArrow(true);
                      setInArrowZone(true);
                      setArrowInteraction(true);
                      if (scrollPosition > maxScrollLeft + 0.1) {
                        setIsHoveringLeft(true);
                        setIsHoveringRight(false);
                      }
                    }}
                    onMouseLeave={() => {
                      setShowLeftArrow(false);
                      setIsHoveringLeft(false);
                      setArrowClicked(false);
                      // Add a small delay before allowing card interactions again
                      setTimeout(() => setArrowInteraction(false), 100);
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setArrowInteraction(true);
                      if (scrollPosition > maxScrollLeft + 0.1) {
                        setArrowClicked(true);
                      }
                    }}
                    onMouseUp={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setArrowClicked(false);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      // Mark this event as handled to prevent other handlers
                      const nativeEvent = e.nativeEvent as unknown as ExtendedEvent;
                      nativeEvent.__handled = true;
                    }}
                  >
                    <div 
                      className="flex items-center justify-center w-16 h-16 rounded-full bg-white/90 shadow-lg cursor-pointer backdrop-blur-sm border border-white/20 hover:bg-white transition-all duration-200"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                    >
                      <IoIosArrowBack size={34} className="text-gray-700" />
                    </div>
                  </div>
                  {/* Right Arrow */}
                  <div 
                    className={`absolute right-6 top-1/2 -translate-y-1/2 z-40 transition-opacity duration-300 ease-in-out ${
                      showRightArrow ? 'opacity-90' : 'opacity-0'
                    } ${scrollPosition >= maxScrollRight - 0.1 ? 'pointer-events-none opacity-30' : 'hover:opacity-100'}`}
                    style={{ pointerEvents: 'auto' }} // Arrows always need pointer events
                    onMouseEnter={() => {
                      setShowRightArrow(true);
                      setInArrowZone(true);
                      setArrowInteraction(true);
                      if (scrollPosition < maxScrollRight - 0.1) {
                        setIsHoveringRight(true);
                        setIsHoveringLeft(false);
                      }
                    }}
                    onMouseLeave={() => {
                      setShowRightArrow(false);
                      setIsHoveringRight(false);
                      setArrowClicked(false);
                      // Add a small delay before allowing card interactions again
                      setTimeout(() => setArrowInteraction(false), 100);
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setArrowInteraction(true);
                      if (scrollPosition < maxScrollRight - 0.1) {
                        setArrowClicked(true);
                      }
                    }}
                    onMouseUp={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setArrowClicked(false);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      // Mark this event as handled to prevent other handlers
                      const nativeEvent = e.nativeEvent as unknown as ExtendedEvent;
                      nativeEvent.__handled = true;
                    }}
                  >
                    <div 
                      className="flex items-center justify-center w-16 h-16 rounded-full bg-white/90 shadow-lg cursor-pointer backdrop-blur-sm border border-white/20 hover:bg-white transition-all duration-200"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                    >
                      <IoIosArrowForward size={34} className="text-gray-700" />
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <Canvas 
          className="absolute inset-0 z-20" 
          style={{ 
            position: 'absolute', 
            background: 'transparent',
            // CRITICAL FIX: Always keep pointer events enabled to allow rotation in active view
            // But disable pointer events when hovering over arrows
            pointerEvents: (isHoveringLeft || isHoveringRight || arrowInteraction) && active === null ? 'none' : 'auto',
            // Force optimizations to ensure it responds immediately
            willChange: "transform"
          }} 
          shadows 
          flat 
          dpr={[1, 1.5]} 
          camera={{
            position: [-0.05, 9.93, 11.35], // FINAL Initial Position
            fov: 30,
            near: 1,
            far: 100
          }}
          // CRITICAL FIX: Add ref to the Canvas element
          ref={canvasRef}
          // CRITICAL FIX: Override events behavior to ensure clicks are always prioritized
          onCreated={(state: any) => {
            console.log("[Canvas onCreated] Initializing raycaster etc.");
            // Force raycaster to have a high near value to ensure close objects are prioritized
            if (state.raycaster) {
              state.raycaster.near = 0.1;
              state.raycaster.far = 1000;
            }
            
            // Create a blocking mechanism that doesn't require overriding the intersectObjects method
            // Set up an intersect filter that runs before any selection happens
            const originalSetFromCamera = state.raycaster.setFromCamera;
            state.raycaster.setFromCamera = function(coords: THREE.Vector2, camera: THREE.Camera) {
              // First call the original method to set up the raycaster properly
              originalSetFromCamera.call(this, coords, camera);
              
              // If we're in arrow interaction mode, modify the ray's direction slightly
              // to ensure it won't hit anything (pointing away from scene)
              if (isHoveringLeft || isHoveringRight || arrowInteraction) {
                // Point ray far away from any objects to ensure no intersections
                this.ray.direction.set(0, -1000, 0);
              }
            };
            
            // Listen for force_raycaster_update events
            const handleForceRaycasterUpdate = () => {
              if (state.raycaster) {
                // Force update the raycaster - create a proper THREE.Vector2
                const mouse = new THREE.Vector2(
                  (cursorPosition.x / window.innerWidth) * 2 - 1,
                  -(cursorPosition.y / window.innerHeight) * 2 + 1
                );
                state.raycaster.setFromCamera(mouse, state.camera);
              }
            };
            
            window.addEventListener('force_raycaster_update', handleForceRaycasterUpdate);
            
            // Store cleanup function without modifying the state object
            const cleanup = () => {
              window.removeEventListener('force_raycaster_update', handleForceRaycasterUpdate);
            };
            
            // Add cleanup function to window for access later
            window.__raycasterCleanup = cleanup;
          }}
        >
          {/* Always render Experience, pass viewState down */}
          <Experience
            cardArr={cardArr}
            active={active}
            setActive={setActive}
            isLoaded={isLoaded}
            scrollPosition={scrollPosition}
            inArrowZone={inArrowZone}
            hoverLocked={hoverLocked}
            cursorPosition={cursorPosition}
            flipCard={flipCard}
            viewState={viewState}
            isDebugMode={isDebugMode}
            // Pass audio timing info
            audioContext={audioContext}
            audioStartTime={audioStartTime}
          />
          {/* Add the camera animator component */}
          <CameraAnimator />
          
          {/* Replace ExploreButton with GltfExploreButton */}
          <GltfExploreButton 
              setViewState={setViewState} 
              position={gltfButtonPosition} 
              isLightPlacementMode={isLightPlacementMode} 
              addPlacedLight={addPlacedLight}
              placedLights={placedLights}
              // Pass light control props
              lightIntensity={placedLightIntensity}
              lightDistance={placedLightDistance}
              lightColor={placedLightColor}
              // Pass inspect mode props
              isInspectMode={isInspectMode}
              setInspectedPartInfo={setInspectedPartInfo}
              // Pass normalized mouse position for initial view interaction
              normalizedMousePosition={normalizedMousePosition}
              // Ensure setIsInspectMode is passed
              setIsInspectMode={setIsInspectMode}
              // Pass debug mode state
              isDebugMode={isDebugMode}
              // Pass viewState
              viewState={viewState}
              // Pass animation toggle state
              isBeatAnimationEnabled={isBeatAnimationEnabled}
              // Pass audio timing info
              audioContext={audioContext}
              audioStartTime={audioStartTime}
              selectedLightId={selectedLightId}
          />
          
          {/* Conditionally render Debug Wall */}
          {showDebugWall && (
            <mesh 
              ref={debugWallRef} 
              position={[gltfButtonPosition[0], gltfButtonPosition[1], gltfButtonPosition[2] + 1.5]} // Place 1.5 units in front of button
            >
              <boxGeometry args={[5, 5, 0.2]} /> {/* Example size */} 
              <meshStandardMaterial color="#cccccc" side={THREE.DoubleSide} />
            </mesh>
          )}

          {/* Conditionally render TransformControls */}
          {showDebugWall && debugWallRef.current && (
            <TransformControls 
              object={debugWallRef.current} 
              mode="translate" // Allow translation only
            />
          )}

          {/* Conditionally enable NEW DebugKeyboardControls */}
          {isDebugMode && <DebugKeyboardControls />}

          {/* Component inside Canvas to update the state */}
          <DebugInfoUpdater /> 

          {/* Component inside Canvas to reset camera Z rotation */}
          <CameraResetter trigger={resetZRotationTrigger} />

          {/* Add the DebugStateBridge inside Canvas */}
          <DebugStateBridge
            isDebugMode={isDebugMode}
            saveCameraTrigger={saveCameraTrigger}
            saveSlotTarget={saveSlotTarget}
            recallCameraTrigger={recallCameraTrigger}
            recallSlotTarget={recallSlotTarget}
            setSavedCameraPos1={setSavedCameraPos1}
            setSavedCameraQuat1={setSavedCameraQuat1}
            setSavedCameraPos2={setSavedCameraPos2}
            setSavedCameraQuat2={setSavedCameraQuat2}
            savedCameraPos1={savedCameraPos1}
            savedCameraQuat1={savedCameraQuat1}
            savedCameraPos2={savedCameraPos2}
            savedCameraQuat2={savedCameraQuat2}
          />

          {/* Render spawned GLTF objects inside Canvas */}
          {isDebugMode && spawnedObjects.map((obj) => (
            <SpawnedGltf
              key={obj.id}
              url={obj.url}
              position={obj.position}
              bumpMapConfig={obj.bumpMapConfig}
              // Pass inspect mode state and the setter function
              isInspectMode={isInspectMode} 
              onInspect={setInspectedPartInfo} // Pass the state setter directly
            />
          ))}

          {/* Add the new SpotLight */}
          <SpotLight
            position={[8.94, 9.93, 8.13]}
            rotation={[0, 26.6 * (Math.PI / 180), 0]} // Convert Y rotation to radians
            angle={Math.PI / 4} // 45 degrees angle
            intensity={1000} // Bright intensity
            penumbra={0.5} // Soft edges
            castShadow
            // target={/* optional: point to a specific object or position */}
          />

          {/* Add the MouseLightController component */}
          <MouseLightController isActive={isMouseLightActive} setPosition={setMouseLightPosition} />

          {/* Conditionally render the Mouse PointLight */}
          {isMouseLightActive && (
            <pointLight 
              position={mouseLightPosition} 
              intensity={mouseLightIntensity} // Use state variable
              distance={10} 
              color={mouseLightColor} // Use state variable
              decay={2}
            />
          )}

          {/* Render the EXTERNAL PlacedLightController */}
          <PlacedLightController 
             lights={placedLights}
             selectedId={selectedLightId}
             onLightMove={updateLightPosition}
             // Pass transformMode down
             transformMode={transformMode}
          />

        </Canvas>

        {/* Render the NEW Debug Menu OUTSIDE the Canvas */}
        <DebugMenu
          isDebugMode={isDebugMode}
          debugInfo={debugInfo}
          setResetZRotationTrigger={setResetZRotationTrigger}
          isLightPlacementMode={isLightPlacementMode}
          setIsLightPlacementMode={setIsLightPlacementMode}
          showDebugWall={showDebugWall}
          setShowDebugWall={setShowDebugWall}
          handleSaveCamera={handleSaveCamera}
          handleRecallCamera={handleRecallCamera}
          savedCameraPos1={savedCameraPos1}
          savedCameraPos2={savedCameraPos2}
          isInspectMode={isInspectMode}
          setIsInspectMode={setIsInspectMode}
          placedLights={placedLights}
          removePlacedLight={removePlacedLight}
          isMouseLightActive={isMouseLightActive}
          toggleMouseLight={toggleMouseLight}
          selectedLightId={selectedLightId}
          setSelectedLightId={setSelectedLightId}
          spawnGltf={spawnGltf}
          toggleBumpMapOnFirstIphone={toggleBumpMapOnFirstIphone}
          spawnTestLight={spawnTestLight} 
          isBeatAnimationEnabled={isBeatAnimationEnabled}
          setIsBeatAnimationEnabled={setIsBeatAnimationEnabled}
          isMusicPlaying={isMusicPlaying}
          toggleMusic={handleMusicToggleClick}
          bumpMapStatus={bumpMapStatus}
        />

        {/* Render the Inspect Info Display OUTSIDE the Canvas */}
        <InspectInfoDisplay inspectedInfo={inspectedPartInfo} />

        {/* Render the Mouse Light Controls OUTSIDE the Canvas */}
        <MouseLightControls 
          isActive={isMouseLightActive}
          lightPosition={mouseLightPosition}
          lightIntensity={mouseLightIntensity}
          setLightIntensity={setMouseLightIntensity}
          lightColor={mouseLightColor}
          setLightColor={setMouseLightColor}
        />

        {/* Container for UI Toggles in Top Left */} 
        <div className="absolute top-4 left-4 z-50 flex items-center space-x-1">
          <MusicToggle
            isMusicPlaying={isMusicPlaying}
            onToggleClick={handleMusicToggleClick}
          />
          <AnimatePresence>
            {isMusicPlaying && (
              <motion.div
                // Start further left, no width animation
                initial={{ opacity: 0, x: -44 }}
                // Animate to final position
                animate={{ opacity: 1, x: 0 }}
                // Exit back to the left, no width animation
                exit={{ opacity: 0, x: -44 }}
                transition={{ duration: 0.3, ease: "easeInOut" }} // Smooth animation
                // Keep overflow hidden to prevent weirdness during fast state changes
                style={{ overflow: 'hidden' }} 
              >
                <BeatToggle
                  isBeatEnabled={isBeatAnimationEnabled}
                  setIsBeatEnabled={setIsBeatAnimationEnabled}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Render Selected Light Editor */} 
        <SelectedLightEditor 
          selectedLightId={selectedLightId}
          placedLights={placedLights}
          updateLightProperty={updatePlacedLightProperty} 
          // Pass transform mode state and setter
          transformMode={transformMode}
          setTransformMode={setTransformMode}
        />

      </div>
    </div>
  );
}