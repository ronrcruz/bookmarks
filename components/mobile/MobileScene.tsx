import { Canvas } from "@react-three/fiber";
import Experience from "./Experience";
import LoadingScreen from "./LoadingScreen";
import ActiveUi from "./ActiveUi";
import { Dispatch, SetStateAction, useState, useEffect, useRef } from "react";
import { CardType } from "@/app/definitions";
import { motion, AnimatePresence } from "framer-motion";

interface MobileSceneProps {
  cardArr: CardType[]
  active: number | null;
  setCardArr: Dispatch<SetStateAction<CardType[]>>
  setActive: Dispatch<SetStateAction<number | null>>;
  isLoaded: boolean;
  setIsLoaded: Dispatch<SetStateAction<boolean>>;
  flipCard: (cardId: number, isFlipped: boolean) => void;
}

export default function MobileScene({ cardArr, active, setActive, isLoaded, setIsLoaded, flipCard, setCardArr }: MobileSceneProps) {
  const [bottomColor, setBottomColor] = useState("#bdd7ee");
  // Track selected variant index changes
  const selectedVariantRef = useRef<number>(0);
  
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
  }, [active, cardArr, cardArr.map(card => card.selectedVariantIndex).join(',')]);

  return (
    <div className="relative h-full w-full">
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
      
      <div className="h-full w-full relative">
        <ActiveUi active={active} setActive={setActive} cardArr={cardArr} setCardArr={setCardArr} flipCard={flipCard} />
        {!isLoaded && <LoadingScreen onLoaded={() => setIsLoaded(true)} />}

        <Canvas
          className="fixed z-20"
          style={{ background: 'transparent' }}
          shadows
          flat
          dpr={[1, 1.5]}
          camera={{ position: [0, 2, 8], fov: 30, near: 1, far: 100 }}
        >
          <Experience cardArr={cardArr} active={active} setActive={setActive} isLoaded={isLoaded} />
        </Canvas>
      </div>
    </div>
  )
}