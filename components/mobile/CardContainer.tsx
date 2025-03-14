"use client";

import { Canvas } from "@react-three/fiber";
import { useState, useEffect, useRef, Dispatch, SetStateAction } from "react";
import Card from "./Card";
import { CardType } from "@/app/definitions";
import { PerspectiveCamera, OrbitControls } from "@react-three/drei";

interface CardsContainerProps {
  cards: CardType[];
  isLoaded: boolean;
  active: number | null;
  setActive: Dispatch<SetStateAction<number | null>>;
}

const CardsContainer = ({ cards, isLoaded, active, setActive }: CardsContainerProps) => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const lastScrollPosition = useRef(scrollPosition);

  // Handle touch and mouse events for scrolling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (active !== null) return; // Don't scroll when a card is active
      e.preventDefault();
      const newPosition = lastScrollPosition.current + e.deltaY * 0.01;
      setScrollPosition(clampScrollPosition(newPosition, cards.length));
      lastScrollPosition.current = clampScrollPosition(newPosition, cards.length);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (active !== null) return;
      touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (active !== null || touchStartX.current === null) return;
      const touchDelta = touchStartX.current - e.touches[0].clientX;
      const sensitivity = 0.01;
      const newPosition = lastScrollPosition.current + touchDelta * sensitivity;
      setScrollPosition(clampScrollPosition(newPosition, cards.length));
      touchStartX.current = e.touches[0].clientX;
      lastScrollPosition.current = clampScrollPosition(newPosition, cards.length);
    };

    const handleTouchEnd = () => {
      touchStartX.current = null;
      snapToNearestCard();
    };

    // Snap to the nearest card position when scrolling stops
    const snapToNearestCard = () => {
      const nearestCardPosition = Math.round(scrollPosition);
      setScrollPosition(clampScrollPosition(nearestCardPosition, cards.length));
      lastScrollPosition.current = clampScrollPosition(nearestCardPosition, cards.length);
    };

    // Function to clamp scroll position within valid range
    const clampScrollPosition = (position: number, cardsCount: number) => {
      return Math.max(0, Math.min(cardsCount - 1, position));
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("touchstart", handleTouchStart);
    container.addEventListener("touchmove", handleTouchMove);
    container.addEventListener("touchend", handleTouchEnd);

    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [active, cards.length, scrollPosition]);

  return (
    <div
      ref={containerRef}
      className="w-full h-screen touch-none"
      style={{ overscrollBehavior: "none" }}
    >
      <Canvas>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
        <PerspectiveCamera makeDefault position={[0, 3, 7]} fov={50} />

        {cards.map((card, index) => (
          <Card
            key={index}
            card={card}
            id={index}
            cardPos={index}
            color={card.cardColor}
            active={active}
            setActive={setActive}
            isLoaded={isLoaded}
            totalCards={cards.length}
            scrollPosition={scrollPosition}
          />
        ))}

        <OrbitControls
          enabled={active !== null}
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>

      {/* Optional indicator for scroll position */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
        {cards.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full ${Math.abs(index - scrollPosition) < 0.5 ? 'bg-white' : 'bg-gray-500'
              }`}
            onClick={() => {
              setScrollPosition(index);
              lastScrollPosition.current = index;
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default CardsContainer;