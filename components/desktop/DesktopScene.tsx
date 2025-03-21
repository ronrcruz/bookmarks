import { Canvas } from "@react-three/fiber";
import Experience from "./Experience";
import LoadingScreen from "./LoadingScreen";
import ActiveUi from "./ActiveUi";
import { Dispatch, SetStateAction, useState, useEffect, useRef, useMemo, useCallback } from "react";
import { CardType } from "@/app/definitions";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";

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
  
  // Track the last active card
  const lastActiveCardRef = useRef<number | null>(null);
  // Remove all special position tracking
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const CARD_WIDTH = 1.2; // Width of each card + spacing
  
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

  // Define the startScrollInterval function with useCallback - moved after dependencies are defined
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
      if (now - lastScrollTime < 220) return; // Increased from 180ms for smoother scrolling
      
      if (isHoveringLeft) {
        // Move directly to previous card
        const nextIndex = Math.max(0, currentCardIndex - 1);
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
        const nextIndex = Math.min(cardArr.length - 1, currentCardIndex + 1);
        if (nextIndex !== currentCardIndex) {
          const cardPositions = getCardPositions();
          const targetPosition = cardPositions[nextIndex];
          setTargetScrollPosition(targetPosition);
          setHoverLocked(true);
          currentCardIndex = nextIndex;
          lastScrollTime = now;
        }
      }
    }, 40); // Increased from 25ms for smoother animation
  }, [
    isHoveringLeft, 
    isHoveringRight, 
    getCurrentCardIndex, 
    getCardPositions, 
    cardArr.length, 
    setHoverLocked,
    setTargetScrollPosition,
    setIsActivelyScrolling
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
        if (Math.abs(diff) < 0.005) {
          // When scrolling stops naturally, ensure we unlock hover
          setHoverLocked(false);
          return targetScrollPosition;
        }
        
        // Use a consistent easing factor for all animations
        const easeFactor = 0.15;
        
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
  }, [targetScrollPosition]);
  
  // Track mouse position to determine if in arrow zone
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isLoaded && active === null) {
      const arrowZoneWidth = 120; // Width of the area on either side where hover effects are disabled
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
        
        // Only handle wheel events when in idle view
        if (!isLoaded || active !== null) {
          return;
        }
        
        // Basic wheel navigation
        const direction = e.deltaY > 0 ? 1 : -1;
        
        // Get current position data
        const cardPositions = getCardPositions();
        const currentIndex = getCurrentCardIndex();
        
        // Calculate target position
        const targetIndex = Math.max(0, Math.min(cardArr.length - 1, currentIndex + direction));
        const targetPosition = cardPositions[targetIndex];
        
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
    cardArr.length,
    setTargetScrollPosition
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
    }
  }, [active, cardArr]);

  return (
    <div 
      id="card-container"
      className="h-full w-full relative overflow-hidden" 
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (active === null) {
          setShowLeftArrow(false);
          setShowRightArrow(false);
          setIsHoveringLeft(false);
          setIsHoveringRight(false);
          setInArrowZone(false);
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

      {/* Left Arrow */}
      {showUI && shouldShowArrows && (
        <div 
          className={`absolute left-6 top-1/2 -translate-y-1/2 z-30 transition-opacity duration-300 ease-in-out ${
            showLeftArrow ? 'opacity-80' : 'opacity-0'
          } ${scrollPosition <= maxScrollLeft + 0.1 ? 'pointer-events-none opacity-30' : 'hover:opacity-100'}`}
          onMouseEnter={() => {
            setShowLeftArrow(true);
            setInArrowZone(true);
            if (scrollPosition > maxScrollLeft + 0.1) {
              setIsHoveringLeft(true);
              setIsHoveringRight(false);
            }
          }}
          onMouseLeave={() => {
            setShowLeftArrow(false);
            setIsHoveringLeft(false);
          }}
        >
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white/80 shadow-lg cursor-pointer backdrop-blur-sm border border-white/20 hover:bg-white/90 transition-all duration-200">
            <IoIosArrowBack size={28} className="text-gray-700" />
          </div>
        </div>
      )}

      {/* Right Arrow */}
      {showUI && shouldShowArrows && (
        <div 
          className={`absolute right-6 top-1/2 -translate-y-1/2 z-30 transition-opacity duration-300 ease-in-out ${
            showRightArrow ? 'opacity-80' : 'opacity-0'
          } ${scrollPosition >= maxScrollRight - 0.1 ? 'pointer-events-none opacity-30' : 'hover:opacity-100'}`}
          onMouseEnter={() => {
            setShowRightArrow(true);
            setInArrowZone(true);
            if (scrollPosition < maxScrollRight - 0.1) {
              setIsHoveringRight(true);
              setIsHoveringLeft(false);
            }
          }}
          onMouseLeave={() => {
            setShowRightArrow(false);
            setIsHoveringRight(false);
          }}
        >
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white/80 shadow-lg cursor-pointer backdrop-blur-sm border border-white/20 hover:bg-white/90 transition-all duration-200">
            <IoIosArrowForward size={28} className="text-gray-700" />
          </div>
        </div>
      )}

      <Canvas 
        className="absolute inset-0 z-20" 
        style={{ position: 'absolute' }} 
        shadows 
        flat 
        dpr={[1, 1.5]} 
        camera={{ position: [0, 2, 8], fov: 30, near: 1, far: 30 }}
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
        />
      </Canvas>
    </div>
  );
}