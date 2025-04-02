import { Canvas } from "@react-three/fiber";
import Experience from "./Experience";
import LoadingScreen from "./LoadingScreen";
import ActiveUi from "./ActiveUi";
import { Dispatch, SetStateAction, useRef } from "react";
import { CardType } from "@/app/definitions";
import { useThree, useFrame } from "@react-three/fiber";
import { easing } from "maath";
import { AnimatePresence } from "framer-motion";
import ExploreButton from "@/components/shared/ExploreButton";

// Define possible view states from app/page.tsx
type ViewState = 'initial' | 'cardSelection';

interface MobileSceneProps {
  cardArr: CardType[]
  active: number | null;
  setCardArr: Dispatch<SetStateAction<CardType[]>>
  setActive: Dispatch<SetStateAction<number | null>>;
  isLoaded: boolean;
  setIsLoaded: Dispatch<SetStateAction<boolean>>;
  flipCard: (cardId: number, isFlipped: boolean) => void;
  viewState: ViewState;
  setViewState: Dispatch<SetStateAction<ViewState>>;
}

export default function MobileScene({ cardArr, active, setActive, isLoaded, setIsLoaded, flipCard, setCardArr, viewState, setViewState }: MobileSceneProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const selectedVariantRef = useRef<number>(0);
  
  // --- Camera Animation Logic ---
  const CameraAnimator = () => {
    const { camera } = useThree();
    const initialCameraY = 10; // Position for the initial view
    const cardSelectionCameraY = 2; // Position for the card selection view

    // Update camera position directly in the render loop using easing.damp
    useFrame((state, delta) => {
      const targetY = viewState === 'initial' ? initialCameraY : cardSelectionCameraY;
      
      // Smoothly animate camera.position.y towards targetY
      easing.damp(
        camera.position, // Target object
        'y',             // Property to animate
        targetY,         // Target value
        0.5,             // Dampening time (adjust for speed)
        delta            // Frame delta time
      );
      
      camera.lookAt(0, 0, 0); // Ensure camera always looks at the center
      camera.updateProjectionMatrix(); // Important when changing camera properties
    });

    return null; // This component doesn't render anything itself
  };
  // --- End Camera Animation Logic ---

  return (
    <div className="h-full w-full relative">
      {/* Only render ActiveUi when cards are being selected */}
      {viewState === 'cardSelection' && (
        <ActiveUi 
          active={active} 
          setActive={setActive} 
          cardArr={cardArr} 
          setCardArr={setCardArr} 
          flipCard={flipCard} 
        />
      )}
      
      {!isLoaded && <LoadingScreen onLoaded={() => setIsLoaded(true)} />}

      <Canvas
        className="fixed inset-0 z-20" // Use inset-0 to fill container
        style={{ background: 'transparent'}} // Ensure canvas is transparent
        shadows
        flat
        dpr={[1, 1.5]}
        // Initial camera position will be animated by CameraAnimator
        camera={{ position: [0, 10, 8], fov: 30, near: 1, far: 30 }}
      >
        {/* Always render Experience, pass viewState down */}
        <Experience 
          cardArr={cardArr} 
          active={active} 
          setActive={setActive} 
          isLoaded={isLoaded} 
          viewState={viewState} // Pass viewState down
        />
        {/* Add the camera animator component */}
        <CameraAnimator />
        {/* Add the 3D Explore Button */}
        <ExploreButton 
          setViewState={setViewState} 
          viewState={viewState} 
          position={[0, 8.5, 6]} // Positioned higher and slightly closer
        />
      </Canvas>
    </div>
  )
}