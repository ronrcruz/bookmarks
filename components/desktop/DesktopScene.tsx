import { Canvas } from "@react-three/fiber";
import Experience from "./Experience";
import LoadingScreen from "./LoadingScreen";
import ActiveUi from "./ActiveUi";
import { Dispatch, SetStateAction, useState, useEffect, useRef, useMemo } from "react";
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
  const [isActivelyScrolling, setIsActivelyScrolling] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  
  // Track the last active card
  const lastActiveCardRef = useRef<number | null>(null);
  // Track if we just exited active view to prevent snapping
  const justExitedActiveViewRef = useRef(false);
  // Track the position where the active card would be in the idle view
  const activeCardPositionRef = useRef(0);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const CARD_WIDTH = 1.2; // Width of each card + spacing
  
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
  }, [cardArr, scrollPosition, windowWidth, CARD_WIDTH]);
  
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
  
  // Store the active card ID when entering active view or changing between active cards
  useEffect(() => {
    if (active !== null) {
      // Store the active card when entering active view or changing between cards
      const prevActiveCard = lastActiveCardRef.current;
      
      // Update last active card reference
      lastActiveCardRef.current = active;
      console.log(`Active card changed: ${prevActiveCard} -> ${active}`);
      
      // Calculate and store where this card would be positioned in the idle view
      const activeCardIndex = cardArr.findIndex(card => card.id === active);
      if (activeCardIndex !== -1) {
        // Calculate card's position in the idle row
        const cardPosition = (activeCardIndex - (cardArr.length - 1) / 2) * CARD_WIDTH;
        
        // Update the active card position reference to the current card's position
        activeCardPositionRef.current = cardPosition;
        console.log(`[POSITION TRACKING] Storing active card ${active} position: ${cardPosition.toFixed(2)}, activeCardIndex: ${activeCardIndex}`);
      }
      
      // Clear the just exited flag to ensure smooth navigation between active cards
      justExitedActiveViewRef.current = false;
    } else if (lastActiveCardRef.current !== null) {
      // We just exited active view - we'll use the stored position
      console.log(`[POSITION TRACKING] Exiting active view, last card was: ${lastActiveCardRef.current} at stored position ${activeCardPositionRef.current.toFixed(2)}`);
      justExitedActiveViewRef.current = true;
      
      // Set target scroll position to center on the last active card
      setTargetScrollPosition(activeCardPositionRef.current);
      console.log(`[POSITION TRACKING] Setting targetScrollPosition to ${activeCardPositionRef.current.toFixed(2)}`);
      
      // Reset after a delay to allow scrolling to settle
      setTimeout(() => {
        justExitedActiveViewRef.current = false;
        console.log(`[ANIMATION STATE] Reset justExitedActiveViewRef to false`);
      }, 400);
    }
  }, [active, cardArr, CARD_WIDTH]);
  
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

  // Define the startScrollInterval function
  const startScrollInterval = () => {
    if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
    
    // Set scrolling state to prevent snapping during active scrolling
    setIsActivelyScrolling(true);
    
    scrollIntervalRef.current = setInterval(() => {
      if (isHoveringLeft) {
        setTargetScrollPosition(prev => Math.max(maxScrollLeft, prev - 0.1));
        setHoverLocked(true); // Lock hover while actively scrolling
      } else if (isHoveringRight) {
        setTargetScrollPosition(prev => Math.min(maxScrollRight, prev + 0.1));
        setHoverLocked(true); // Lock hover while actively scrolling
      }
    }, 16); // Approximately 60fps
  };

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
          // Slight delay before snapping to make it feel more natural
          setTimeout(() => {
            setIsActivelyScrolling(false);
            handleScrollStop();
          }, 150);
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
  }, [isHoveringLeft, isHoveringRight, active, maxScrollLeft, maxScrollRight]);

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
          console.log(`[ANIMATION COMPLETE] Scroll animation completed at ${targetScrollPosition.toFixed(2)}`);
          return targetScrollPosition;
        }
        
        // Use different easing rate based on whether we just exited active view
        // Use a smoother easing factor for better feel
        const easeFactor = justExitedActiveViewRef.current ? 0.15 : 0.08;
        console.log(`[ANIMATION] Using easeFactor: ${easeFactor}, justExitedActiveView: ${justExitedActiveViewRef.current}`);
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
  
  // When user stops scrolling, snap to nearest card
  const handleScrollStop = () => {
    if (active !== null || justExitedActiveViewRef.current || isActivelyScrolling) {
      justExitedActiveViewRef.current = false;
      return;
    }

    // Find the nearest card position to snap to
    // Calculate positions relative to the center, not from position 0
    const centerOffset = ((cardArr.length - 1) / 2) * CARD_WIDTH;
    const cardPositions = cardArr.map((_, index) => (index - (cardArr.length - 1) / 2) * CARD_WIDTH);
    
    // Find the card closest to the current scroll position
    const closestCardIndex = cardPositions.reduce((prevIndex, position, currentIndex) => {
      return Math.abs(position - scrollPosition) < Math.abs(cardPositions[prevIndex] - scrollPosition)
        ? currentIndex
        : prevIndex;
    }, 0);

    const nearestCardPosition = cardPositions[closestCardIndex];

    // Only snap if we're not already very close to a card position
    if (Math.abs(nearestCardPosition - scrollPosition) > 0.01) {
      // Create a smoother, more natural animation by using a custom easing
      // First quickly move close to the target, then slow down for a smooth finish
      const currentPosition = scrollPosition;
      const targetPosition = Math.min(maxScrollRight, Math.max(maxScrollLeft, nearestCardPosition));
      
      setTargetScrollPosition(targetPosition);
    }
    
    // Immediately unlock hover when scrolling stops
    setHoverLocked(false);
    setIsActivelyScrolling(false);
  }
  
  // Add debug for scroll changes
  useEffect(() => {
    console.log(`[SCROLL] Updated scrollPosition: ${scrollPosition.toFixed(2)}, targetScrollPosition: ${targetScrollPosition.toFixed(2)}`);
  }, [scrollPosition, targetScrollPosition]);
  
  return (
    <div className="h-full w-full relative" 
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (active === null) {
          setShowLeftArrow(false);
          setShowRightArrow(false);
          setIsHoveringLeft(false);
          setIsHoveringRight(false);
          setInArrowZone(false);
        }
      }}>
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

      <Canvas className="fixed z-20" shadows flat dpr={[1, 1.5]} camera={{ position: [0, 2, 8], fov: 30, near: 1, far: 30 }}>
        <Experience
          cardArr={cardArr}
          active={active}
          setActive={setActive}
          isLoaded={isLoaded}
          scrollPosition={scrollPosition}
          inArrowZone={inArrowZone}
          hoverLocked={hoverLocked}
        />
      </Canvas>
    </div>
  );
}