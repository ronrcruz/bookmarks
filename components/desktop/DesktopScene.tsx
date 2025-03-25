import { Canvas } from "@react-three/fiber";
import Experience from "./Experience";
import LoadingScreen from "./LoadingScreen";
import ActiveUi from "./ActiveUi";
import { Dispatch, SetStateAction, useState, useEffect, useRef, useMemo, useCallback } from "react";
import { CardType } from "@/app/definitions";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";

// Add proper global interface to TypeScript
declare global {
  interface Window {
    __directFlipCard: number | null;
    __raycasterCleanup?: () => void;
    __processingWheelEvent?: boolean;
  }
}

interface DesktopSceneProps {
  cardArr: CardType[];
  setCardArr: Dispatch<SetStateAction<CardType[]>>
  active: number | null;
  setActive: Dispatch<SetStateAction<number | null>>;
  isLoaded: boolean;
  setIsLoaded: Dispatch<SetStateAction<boolean>>;
  flipCard: (cardId: number, isFlipped: boolean) => void;
}

export default function DesktopScene({
  cardArr,
  setCardArr,
  active,
  setActive,
  isLoaded,
  setIsLoaded,
  flipCard,
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

  // Extract complex dependency expression
  const scrollSnapDependencies = {
    isHoveringLeft, 
    isHoveringRight, 
    getCurrentCardIndex, 
    getCardPositions, 
    cardArr, 
    setHoverLocked,
    setTargetScrollPosition,
    setIsActivelyScrolling
  };

  // Define the startScrollInterval function with useCallback - moved after dependencies are defined
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  
  // Track mouse position to determine if in arrow zone
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isLoaded && active === null) {
      const arrowZoneWidth = 180; // IMPROVED: Increased from 120px for larger hover areas
      const x = e.clientX;
      const width = window.innerWidth;
      
      // Update cursor position for hover detection
      setCursorPosition({ x: e.clientX, y: e.clientY });
      
      // Check if mouse is in left or right arrow zone
      if (x < arrowZoneWidth || x > width - arrowZoneWidth) {
        setInArrowZone(true);
        setShowLeftArrow(true);
        setShowRightArrow(true);
      } else {
        setInArrowZone(false);
        // Only unlock hover when we're not actively scrolling
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
        // Prevent default browser scroll behavior
        e.preventDefault();
        
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
    flipCard
  ]);

  // Add keyboard navigation for inactive view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keys in the inactive (idle) view
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

  return (
    <div className="relative w-full h-full">
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
        <ActiveUi
          active={active}
          setActive={setActive}
          cardArr={cardArr}
          setCardArr={setCardArr}
          flipCard={flipCard}
        />
        {!isLoaded && <LoadingScreen onLoaded={() => setIsLoaded(true)} />}

        {/* Background blocking divs for arrow click zones */}
        {showUI && shouldShowArrows && (
          <>
            {/* Left blocking zone */}
            <div 
              className={`absolute left-0 top-0 h-full transition-opacity duration-300 ease-in-out ${
                isHoveringLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              style={{ 
                width: '160px', 
                zIndex: 39, 
                pointerEvents: isHoveringLeft ? 'auto' : 'none'
              }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            />
            
            {/* Right blocking zone */}
            <div 
              className={`absolute right-0 top-0 h-full transition-opacity duration-300 ease-in-out ${
                isHoveringRight ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              style={{ 
                width: '160px', 
                zIndex: 39, 
                pointerEvents: isHoveringRight ? 'auto' : 'none'
              }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            />
          </>
        )}

        {/* Left Arrow */}
        {showUI && shouldShowArrows && (
          <div 
            className={`absolute left-6 top-1/2 -translate-y-1/2 z-40 transition-opacity duration-300 ease-in-out ${
              showLeftArrow ? 'opacity-90' : 'opacity-0'
            } ${scrollPosition <= maxScrollLeft + 0.1 ? 'pointer-events-none opacity-30' : 'hover:opacity-100'}`}
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
            style={{ pointerEvents: 'auto' }}
          >
            <div 
              className="flex items-center justify-center w-16 h-16 rounded-full bg-white/90 shadow-lg cursor-pointer backdrop-blur-sm border border-white/20 hover:bg-white transition-all duration-200"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              <IoIosArrowBack size={34} className="text-gray-700" />
            </div>
          </div>
        )}

        {/* Right Arrow */}
        {showUI && shouldShowArrows && (
          <div 
            className={`absolute right-6 top-1/2 -translate-y-1/2 z-40 transition-opacity duration-300 ease-in-out ${
              showRightArrow ? 'opacity-90' : 'opacity-0'
            } ${scrollPosition >= maxScrollRight - 0.1 ? 'pointer-events-none opacity-30' : 'hover:opacity-100'}`}
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
            style={{ pointerEvents: 'auto' }}
          >
            <div 
              className="flex items-center justify-center w-16 h-16 rounded-full bg-white/90 shadow-lg cursor-pointer backdrop-blur-sm border border-white/20 hover:bg-white transition-all duration-200"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              <IoIosArrowForward size={34} className="text-gray-700" />
            </div>
          </div>
        )}

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
          camera={{ position: [0, 2, 8], fov: 30, near: 1, far: 100 }}
          // CRITICAL FIX: Add ref to the Canvas element
          ref={canvasRef}
          // Add capture phase event handler for blocking clicks
          onClick={(e) => {
            if ((isHoveringLeft || isHoveringRight || arrowInteraction) && active === null) {
              e.stopPropagation();
              e.preventDefault();
            }
          }}
          // CRITICAL FIX: Override events behavior to ensure clicks are always prioritized
          onCreated={(state) => {
            // Force raycaster to have a high near value to ensure close objects are prioritized
            if (state.raycaster) {
              state.raycaster.near = 0.1;
              state.raycaster.far = 1000;
            }
            
            // Create a blocking mechanism that doesn't require overriding the intersectObjects method
            // Set up an intersect filter that runs before any selection happens
            const originalSetFromCamera = state.raycaster.setFromCamera;
            state.raycaster.setFromCamera = function(coords, camera) {
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
          />
        </Canvas>
      </div>
    </div>
  );
}