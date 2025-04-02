"use client"

import { Dispatch, SetStateAction, useEffect, useMemo, useRef, useState, useCallback } from "react"
import Card from "./Card"
import { ScrollControls } from "@react-three/drei"
import { CardType, DeviceOrientationEventConstructor } from "@/app/definitions"
import { useFrame, useThree } from "@react-three/fiber"
import { easing } from "maath"
import * as THREE from "three"

// Re-import ViewState type
type ViewState = 'initial' | 'cardSelection';

interface ExperienceProps {
  cardArr: CardType[];
  active: number | null;
  setActive: Dispatch<SetStateAction<number | null>>;
  isLoaded: boolean;
  viewState: ViewState; // Add viewState prop
}

export default function Experience({ 
  cardArr, 
  active, 
  setActive, 
  isLoaded, 
  viewState // Destructure viewState
}: ExperienceProps) {
  const { scene, camera } = useThree();
  const currentBottomColor = useRef(new THREE.Color("#cccccc"));
  const gradientCanvas = useRef(document.createElement("canvas"));
  const gradientTexture = useRef(new THREE.CanvasTexture(gradientCanvas.current));
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const [orientation, setOrientation] = useState<{ beta: number | null; gamma: number | null }>({
    beta: null,
    gamma: null,
  });
  const [listenerActive, setListenerActive] = useState(false);

  const requestOrientationPermission = async () => {
    if (typeof DeviceOrientationEvent !== "undefined") {
      const DeviceOrientationEventTyped = DeviceOrientationEvent as DeviceOrientationEventConstructor;
      if (typeof DeviceOrientationEventTyped.requestPermission === "function") {
        try {
          const permission = await DeviceOrientationEventTyped.requestPermission();
          if (permission === "granted") {
            setListenerActive(true);
          }
        } catch (error) {
          console.error("Error requesting orientation permission:", error);
        }
      } else {
        setListenerActive(true);
      }
    }
  };

  useEffect(() => {
    if (active !== null && !listenerActive) {
      requestOrientationPermission();
    }
  }, [active, listenerActive]);

  useEffect(() => {
    if (listenerActive) {
      const handleOrientation = (event: DeviceOrientationEvent) => {
        if (event.beta !== null && event.gamma !== null) {
          setOrientation({ beta: event.beta, gamma: event.gamma });
        }
      };
      window.addEventListener("deviceorientation", handleOrientation);
      return () => window.removeEventListener("deviceorientation", handleOrientation);
    }
  }, [listenerActive]);

  useMemo(() => {
    gradientCanvas.current.width = 256;
    gradientCanvas.current.height = 256;
    gradientTexture.current = new THREE.CanvasTexture(gradientCanvas.current);
    gradientTexture.current.minFilter = THREE.LinearFilter;
    gradientTexture.current.magFilter = THREE.LinearFilter;
    scene.background = gradientTexture.current;
  }, [scene]);

  // Calculate card position with memoization
  const getCardPosition = useCallback((index: number) => {
    return index - (cardArr.length - 1) / 2;
  }, [cardArr.length]);

  useFrame((state, delta) => {
    const targetIntensity = active !== null ? 3 : 2;

    if (ambientLightRef.current) {
      easing.damp(ambientLightRef.current, "intensity", targetIntensity, 0.3, delta);
    }

    const activeCard = cardArr.find((card) => card.id === active);

    // BACKGROUND GRADIENT ANIMATION
    const selectedVariant =
      activeCard && active !== null
        ? activeCard.colorVariations[activeCard.selectedVariantIndex]
        : null;
    const targetBottomColor =
      active !== null && selectedVariant ? selectedVariant.bgColor : "#cccccc";

    easing.dampC(currentBottomColor.current, targetBottomColor, 0.5, delta);

    const ctx = gradientCanvas.current.getContext("2d");
    if (ctx) {
      const gradient = ctx.createLinearGradient(0, 0, 0, gradientCanvas.current.height);
      gradient.addColorStop(0, "#cccccc");
      gradient.addColorStop(0.7, currentBottomColor.current.getStyle());

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, gradientCanvas.current.width, gradientCanvas.current.height);
    }

    gradientTexture.current.needsUpdate = true;

    // ~~CAMERA POSITIONING~~ // REMOVED
    // if (!isLoaded) {
    //   easing.damp3(state.camera.position, [state.camera.position.x, 20, 0], 2.0, delta);
    // } else if (active) {
    //   easing.damp3(state.camera.position, [state.camera.position.x, 9.5, 0], 0.35, delta);
    // } else {
    //   easing.damp3(state.camera.position, [0, 1.9, 10], 0.15, delta);
    // }
    // camera.lookAt(0, 0, 0); // lookAt is handled by CameraAnimator
  });

  return (
    <ScrollControls pages={2} horizontal={false}>
      {/* Wrap content in a group controlled by viewState */}
      <group visible={viewState === 'cardSelection'}>
        <ambientLight ref={ambientLightRef} intensity={1} />
        <directionalLight castShadow intensity={1} position={[10, 3, 6]} shadow-mapSize={[1028, 1028]}></directionalLight>
        <directionalLight castShadow intensity={1} position={[-10, 3, 6]} shadow-mapSize={[1028, 1028]}></directionalLight>
        <directionalLight castShadow intensity={0.7} position={[0, 0, cardArr.length]} shadow-mapSize={[1028, 1028]}></directionalLight>

        {cardArr.map((card, i) =>
          <Card
            card={card}
            key={card.id}
            id={card.id}
            index={i}
            cardPos={getCardPosition(i)}
            active={active}
            setActive={setActive}
            isLoaded={isLoaded}
            cards={cardArr}
            orientation={orientation}
            requestPermission={requestOrientationPermission}
            viewState={viewState} // Pass viewState down to Card
          />
        )}
      </group>
    </ScrollControls>
  )
}