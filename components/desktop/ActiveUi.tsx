"use client";

import { CardType } from "@/app/definitions";
import { Dispatch, SetStateAction, useState, useEffect, useMemo, useCallback } from "react";
import { BiPound, BiDollar, BiEuro } from "react-icons/bi";
import { SiMaterialdesignicons } from "react-icons/si";
import { IoIosArrowRoundBack, IoIosArrowRoundForward } from "react-icons/io";
import { RxDimensions } from "react-icons/rx";
import NumberFlow from "@number-flow/react";
import { TfiClose } from "react-icons/tfi";
import { Instrument_Sans } from "next/font/google";
import { motion, AnimatePresence } from "framer-motion";

const instrument = Instrument_Sans({
  weight: "400",
  variable: "--font-instrument",
  subsets: ["latin"],
});

interface ActiveUiProps {
  cardArr: CardType[];
  setCardArr: Dispatch<SetStateAction<CardType[]>>;
  active: number | null;
  setActive: Dispatch<SetStateAction<number | null>>;
  flipCard: (cardId: number, isFlipped: boolean) => void;
}

export default function ActiveUi({
  cardArr,
  setCardArr,
  active,
  setActive,
  flipCard,
}: ActiveUiProps) {
  const [hasSeenIndicator, setHasSeenIndicator] = useState(false);
  const [activeCurrency, setActiveCurrency] = useState({ name: "usd", value: 8.43, symbol: "$" });

  const currencies = [
    { name: "usd", icon: <BiDollar />, value: 8.43, symbol: "$" },
    { name: "gbp", icon: <BiPound />, value: 6.53, symbol: "£" },
    { name: "eur", icon: <BiEuro />, value: 7.79, symbol: "€" },
  ];

  const activeCard = useMemo(() => {
    return cardArr.find((card) => card.id === active) || null;
  }, [cardArr, active]);

  const selectedVariantIndex = activeCard?.selectedVariantIndex ?? 0;
  const selectedVariant = useMemo(() => {
    return activeCard?.colorVariations[selectedVariantIndex];
  }, [activeCard, selectedVariantIndex]);

  const handleClose = useCallback(() => {
    if (activeCard) {
      console.log(`[DESELECT] Closing active view for card ${activeCard.id}`);
      
      // CRITICAL: Get the overlay element and immediately disable pointer events
      // This is the key fix - disable pointer events on the container BEFORE any animation starts
      const overlayElement = document.getElementById('active-ui-overlay');
      if (overlayElement) {
        overlayElement.style.pointerEvents = 'none';
      }
      
      // FUNDAMENTAL FIX: Trigger events to ensure interactive state is properly restored
      // 1. First, immediately enable interaction before any state changes
      window.dispatchEvent(new CustomEvent('card_interaction_enabled'));
      
      // 2. Force the raycaster to update (helps ThreeJS register clicks)
      window.dispatchEvent(new CustomEvent('force_raycaster_update'));
      
      // 3. Then set state changes with zero delay - ALWAYS reset to not flipped
      // Cards MUST return to front side when deselected for consistency
      window.requestAnimationFrame(() => {
        setActive(null);
        
        // ALWAYS reset cards to front state when deselecting
        // This ensures consistent behavior each time a card is selected
        if (activeCard.isFlipped) {
          console.log(`[DESELECT] Flipping card ${activeCard.id} back to front`);
          flipCard(activeCard.id, false);
        }
      });
    }
  }, [activeCard, flipCard, setActive]);

  // FUNDAMENTAL FIX: Direct handling of flipping when active card changes
  useEffect(() => {
    // Create a tracking variable for this effect instance
    let isUpdating = false;
    
    // This effect runs whenever the active state changes
    if (active !== null && activeCard) {
      console.log(`[ACTIVE CHANGE] Card ${active} now active (isFlipped: ${activeCard.isFlipped}, directFlip: ${window.__directFlipCard === active})`);
      
      // Check if this activation should trigger a flip (set by wheel navigation, keyboard, or click)
      if (window.__directFlipCard === active) {
        console.log(`[DIRECT FLIP] Auto-flipping newly activated card ${active} (isCurrentlyFlipped: ${activeCard.isFlipped})`);
        isUpdating = true;
        
        // CRITICAL FIX: Use nested timeouts to ensure we have multiple chances to apply the flip
        // This gives us more reliability especially with wheel navigation
        setTimeout(() => {
          if (!isUpdating) return; // Check if this effect is still relevant
          
          // Double-check the current state to ensure we're still dealing with the right card
          if (window.__directFlipCard === active && !activeCard.isFlipped) {
            console.log(`[FLIP-1] Setting card ${active} to flipped state`);
            flipCard(active, true);
            
            // After successful flip, clear the directFlip flag
            window.__directFlipCard = null;
          } else {
            // Give one more chance in case of race condition
            setTimeout(() => {
              if (!isUpdating) return;
              
              // Final check to catch any missed flips
              const currentCard = cardArr.find(card => card.id === active);
              if (currentCard && !currentCard.isFlipped && window.__directFlipCard === active) {
                console.log(`[FLIP-2] Last chance flip for card ${active}`);
                flipCard(active, true);
              }
              
              // Always clear the directFlip flag at this point
              if (window.__directFlipCard === active) {
                window.__directFlipCard = null;
              }
            }, 50);
          }
        }, 50);
      }
    }
    
    // Cleanup function to prevent stale updates
    return () => {
      isUpdating = false;
    };
  }, [active, activeCard, flipCard, cardArr]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (active === null) return;

      if (!hasSeenIndicator) setHasSeenIndicator(true);

      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        const nextActive = active % 11 + 1;
        console.log(`[KEY NAV] Arrow Right/Up pressed. Changing active card: ${active} -> ${nextActive}`);
        
        // First reset the flipped state of the currently active card
        if (activeCard) flipCard(active, false);
        
        // Set the direct flip flag for the new card
        window.__directFlipCard = nextActive;
        
        // Then set the new active card
        setActive(nextActive);
        
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        const prevActive = active === 1 ? 11 : active - 1;
        console.log(`[KEY NAV] Arrow Left/Down pressed. Changing active card: ${active} -> ${prevActive}`);
        
        // First reset the flipped state of the currently active card
        if (activeCard) flipCard(active, false);
        
        // Set the direct flip flag for the new card
        window.__directFlipCard = prevActive;
        
        // Then set the new active card
        setActive(prevActive);
        
      } else if (e.key === "Escape") {
        console.log(`[KEY NAV] Escape pressed. Closing active view.`);
        handleClose();
      } else if (e.key === "f" || e.key === "F") {
        // Add keyboard shortcut to flip card
        console.log(`[KEY NAV] F key pressed. Flipping active card.`);
        if (activeCard) {
          flipCard(activeCard.id, !activeCard.isFlipped);
        }
      }
    };

    // CRITICAL FIX: Enhanced flip event handler with more reliable processing
    const handleFlipActiveCard = (e: CustomEvent) => {
      // Wait until the next frame to ensure the active card has been updated
      requestAnimationFrame(() => {
        if (active !== null && activeCard) {
          console.log(`[FLIP] Flipping active card ${activeCard.id} (fromSelection: ${e.detail?.fromSelection})`);
          
          // Check if this flip was triggered as part of a selection
          const fromSelection = e.detail?.fromSelection;
          const targetCardId = e.detail?.id;
          
          // Ensure we're flipping the correct card (the one that was selected)
          if (targetCardId && targetCardId === active) {
            // If this is from a selection, ensure we flip to back side
            // This creates a consistent flipping effect when selecting cards
            if (fromSelection) {
              // Always flip to back side (true) when selecting
              flipCard(activeCard.id, true);
            } else {
              // Normal toggle flip when clicking an already active card
              flipCard(activeCard.id, !activeCard.isFlipped);
            }
          }
        }
      });
    };

    // Handle wheel events in active view
    const handleWheel = (_e: WheelEvent) => { // eslint-disable-line @typescript-eslint/no-unused-vars
      if (active === null) return;
      
      // Wheel scrolling in active view is handled in DesktopScene
      // This is just for display purposes to update the indicator
      if (!hasSeenIndicator) setHasSeenIndicator(true);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("flip_active_card", handleFlipActiveCard as EventListener);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("flip_active_card", handleFlipActiveCard as EventListener);
    };
  }, [active, activeCard, flipCard, setActive, handleClose, hasSeenIndicator]);

  const handlePage = (activeId: number) => {
    if (active && activeCard) {
      // First reset the flipped state of the previously active card 
      // This ensures consistent behavior - cards always start unflipped
      flipCard(active, false);
      
      // Set the direct flip flag for the new card
      // This will trigger the card to be flipped to back when it becomes active
      window.__directFlipCard = activeId;
      
      // Set the new active card immediately without deactivating first
      // This prevents the camera from briefly transitioning to default position
      setActive(activeId);
      
      console.log(`[PAGE] Switched from card ${active} to ${activeId}`);
    }
  };

  const handleVariantClick = (index: number) => {
    if (active !== null) {
      setCardArr((prev) =>
        prev.map((card) =>
          card.id === active ? { ...card, selectedVariantIndex: index } : card
        )
      );
    }
  };

  return (
    <AnimatePresence mode="sync">
      {active !== null && (
        <div
          id="active-ui-overlay"
          className="absolute h-full w-full z-30 p-10 lg:p-14 flex pointer-events-auto"
          onClick={() => setHasSeenIndicator(true)}
        >
          {/* Background Gradient */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ 
              opacity: 0,
              pointerEvents: "none"
            }}
            transition={{ 
              duration: 0.5,
              exit: { duration: 0.2 }
            }}
            className="absolute inset-0"
            style={{ 
              background: "linear-gradient(to right, #bdd7ee 27%, transparent 40%)",
              zIndex: -1
            }}
          />
          
          {/* INDICATOR */}
          {!hasSeenIndicator && (
            <motion.div
              initial={{ opacity: 0, x: "-50%", y: 20 }}
              animate={{ opacity: 0.5, y: 0 }}
              exit={{ opacity: 0, pointerEvents: "none" }}
              transition={{ duration: 0.3 }}
              className="absolute top-6 left-1/2 border bg-black/90 border-black/20 text-black/40 p-2 rounded-lg shadow-lg flex gap-2 items-center"
            >
              <div className="flex gap-1">
                <div className="text-2xl justify-center flex items-center border border-white/50 text-white p-1 size-8 rounded-lg">
                  <IoIosArrowRoundBack />
                </div>
                <div className="text-2xl justify-center flex items-center border border-white/50 text-white p-1 size-8 rounded-lg">
                  <IoIosArrowRoundForward />
                </div>
              </div>
            </motion.div>
          )}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ 
              opacity: 0, 
              y: -20, 
              pointerEvents: "none",
              transition: { duration: 0.2, delay: 0 }
            }}
            transition={{ delay: 0, duration: 0.3, exit: { duration: 0.2, delay: 0 } }}
            className={`${instrument.className} h-full w-full flex justify-between`}
            style={{
              willChange: "transform, opacity",
            }}
          >
            {/* LEFT */}
            <motion.div className="flex flex-col justify-between h-full w-1/4">
              <motion.h2
                key={activeCard?.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="text-4xl lg:text-4xl "
              >
                {activeCard?.name}
              </motion.h2>
              <motion.div
                key={activeCard?.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ delay: active ? 0.5 : 0, duration: 0.3 }}
                className="max-h-[66.6666%] overflow-scroll text-xs lg:text-sm leading-tight flex pr-3"
              >
                {activeCard?.info}
              </motion.div>
            </motion.div>
            
            {/* Pagination - Moved to center */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ delay: active ? 0.6 : 0, duration: 0.3 }}
              className="absolute bottom-10 lg:bottom-14 left-1/2 transform -translate-x-[100%] -ml-20 flex gap-2 items-center"
            >
              {[...Array(cardArr.length)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => handlePage(i + 1)}
                  className={`border rounded-full size-2 border-black/30 ${activeCard?.id === i + 1 ? "bg-neutral-800" : "bg-none"}`}
                />
              ))}
            </motion.div>

            {/* MIDDLE */}
            {activeCard && (
              <motion.button
                disabled={!active}
                onClick={() =>
                  flipCard(activeCard.id, !activeCard.isFlipped)
                }
                className="h-[32.5rem] w-[18.5rem] rounded-2xl self-center outline-none"
                style={{ 
                  pointerEvents: 'auto',  // CRITICAL: Ensure pointer events work properly
                  cursor: 'pointer' 
                }}
              />
            )}

            {/* RIGHT */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              className="flex flex-col justify-between h-full w-1/4"
            >
              <motion.button onClick={handleClose} className="size-8 lg:size-12 flex justify-center ml-auto">
                <TfiClose className="size-10" />
              </motion.button>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="flex flex-col w-full h-2/3 lg:p-4 relative"
              >
                <ul className="flex flex-col gap-6 w-full justify-between items-center h-full">
                  <li className="flex justify-between w-full px-2 lg:px-6">
                    <RxDimensions className="size-[1.5rem] lg:size-[2rem]" />
                    <div className="text-xs lg:text-base text-end">
                      <p>2.0in x 3.5in</p>
                      <p>5.08cm x 8.89cm</p>
                    </div>
                  </li>

                  <li className="flex w-full justify-center gap-6">
                    {activeCard?.colorVariations.map((variant, index) => (
                      <motion.button
                        key={variant.colorName}
                        onClick={() => handleVariantClick(index)}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        transition={{ delay: 0.1, duration: 0.3 }}
                        style={{ backgroundColor: variant.cardColor }}
                        className={`rounded-full border-black/10 border-2 size-6 lg:size-10 ${selectedVariantIndex === index ? "ring-2 ring-black" : ""
                          }`}
                        aria-label={`${variant.colorName} color${selectedVariant && selectedVariant.colorName === variant.colorName ? ' (selected)' : ''}`}
                      />
                    ))}
                  </li>

                  <li className="flex justify-between w-full px-2 lg:px-6 text-xs lg:text-base text-end">
                    <SiMaterialdesignicons className="size-[1rem] lg:size-[1.4rem]" />
                    <p>
                      Matte paper
                    </p>
                  </li>

                  <li className="text-3xl lg:text-5xl font-medium flex justify-between w-full items-end p-1 relative">
                    <div className="translate-y-20">
                      <NumberFlow value={activeCurrency.value} prefix={activeCurrency.symbol} />
                    </div>
                    <div className="flex flex-row text-xs lg:text-xl my-1 translate-y-16">
                      {currencies.map((currency) => (
                        <button
                          key={currency.name}
                          onClick={() => setActiveCurrency(currency)}
                          className={`${activeCurrency.name === currency.name ? "opacity-100" : "opacity-40"}`}
                        >
                          {currency.icon}
                        </button>
                      ))}
                    </div>
                  </li>
                </ul>
              </motion.div>
              {activeCard?.inStock ? (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                  onClick={() => setActive(null)}
                  className="group h-12 w-full rounded-full border-neutral-800 border overflow-hidden"
                >
                  <div className="flex flex-col group-hover:-translate-y-12 transition duration-300">
                    <div className="h-12 flex justify-center items-center">Buy now</div>
                    <div className="bg-black text-white h-12 flex justify-center items-center">Buy now</div>
                  </div>
                </motion.button>
              ) : (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                  className="h-12 w-full rounded-full border-black/20 text-black/40 border hover:cursor-not-allowed"
                >
                  Out of stock
                </motion.button>
              )}
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}