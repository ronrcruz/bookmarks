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
  const [isScrolling, setIsScrolling] = useState(false);
  const [hoverLocked, setHoverLocked] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  
  // Track the last active card
  const lastActiveCardRef = useRef<number | null>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const CARD_WIDTH = 1.2; // Width of each card + spacing
  
  // Update window size on resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate viewport and scrolling parameters
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
  }, [cardArr.length, windowWidth, CARD_WIDTH]);
  
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
  
  // Track active state changes to capture the card ID when entering active view
  useEffect(() => {
    if (active !== null) {
      // Store the active card when entering active view
      lastActiveCardRef.current = active;
      console.log(`Storing active card ID: ${active}`);
    }
  }, [active]);
  
  // This effect specifically handles when we exit the active view
  useEffect(() => {
    // Only run when transitioning from active to inactive
    if (active === null && lastActiveCardRef.current !== null) {
      console.log(`Exiting active view, last card was: ${lastActiveCardRef.current}`);
      
      // Find the index of the previously active card
      const lastCardIndex = cardArr.findIndex(card => card.id === lastActiveCardRef.current);
      
      if (lastCardIndex !== -1) {
        // Calculate the position that centers this card
        const centerPosition = (lastCardIndex - (cardArr.length - 1) / 2) * CARD_WIDTH;
        
        console.log(`Setting scroll position to center card ${lastCardIndex} at position ${centerPosition}`);
        
        // Force both current and target positions to ensure immediate effect
        setScrollPosition(centerPosition);
        setTargetScrollPosition(centerPosition);
      }
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
      setIsScrolling(false);
      setHoverLocked(false);
      
      // Only reset scroll position when ENTERING active view
      if (active !== null) {
        // When entering active view, reset to center
        setScrollPosition(0);
        setTargetScrollPosition(0);
      }
      
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    }
  }, [isLoaded, active]);

  // Handle continuous scrolling on hover
  useEffect(() => {
    if (!isLoaded || active !== null) return;
    
    if (isHoveringLeft || isHoveringRight) {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
      
      // Set up continuous scrolling
      scrollIntervalRef.current = setInterval(() => {
        if (isHoveringLeft) {
          setTargetScrollPosition(prev => Math.max(maxScrollLeft, prev - 0.1));
          setIsScrolling(true);
          setHoverLocked(true); // Only lock hover while actively scrolling
        } else if (isHoveringRight) {
          setTargetScrollPosition(prev => Math.min(maxScrollRight, prev + 0.1));
          setIsScrolling(true);
          setHoverLocked(true); // Only lock hover while actively scrolling
        }
      }, 16); // Approximately 60fps
    } else {
      // Clear interval when not hovering
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
      
      // Snap to nearest card
      const nearestCardPosition = Math.round(targetScrollPosition / CARD_WIDTH) * CARD_WIDTH;
      setTargetScrollPosition(Math.min(maxScrollRight, Math.max(maxScrollLeft, nearestCardPosition)));
      
      // Immediately unlock hover when scrolling stops
      setIsScrolling(false);
      setHoverLocked(false);
    }
    
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    };
  }, [isHoveringLeft, isHoveringRight, isLoaded, active, maxScrollLeft, maxScrollRight, targetScrollPosition, CARD_WIDTH]);

  // Smooth animation for scrolling
  useEffect(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    const animateScroll = () => {
      setScrollPosition(prev => {
        const diff = targetScrollPosition - prev;
        if (Math.abs(diff) < 0.01) {
          return targetScrollPosition;
        }
        return prev + diff * 0.1; // Smooth easing
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
        setShowLeftArrow(true);
        setShowRightArrow(true);
      }
    }
  };
  
  // Always show arrows if we have more than 3 cards
  const shouldShowArrows = cardArr.length > 3;
  
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