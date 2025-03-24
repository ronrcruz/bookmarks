"use client"

import { Dispatch, SetStateAction, useMemo, useRef } from "react"
import Card from "./Card"
import { ScrollControls } from "@react-three/drei"
import { CardType } from "@/app/definitions"
import { useFrame, useThree } from "@react-three/fiber"
import { easing } from "maath"
import * as THREE from "three"

interface ExperienceProps {
  cardArr: CardType[];
  active: number | null;
  setActive: Dispatch<SetStateAction<number | null>>;
  isLoaded: boolean
}

export default function Experience({ cardArr, active, setActive, isLoaded }: ExperienceProps) {
  const { scene, camera } = useThree();
  const currentBottomColor = useRef(new THREE.Color("#bdd7ee"));
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);

  // Make the scene transparent
  useMemo(() => {
    scene.background = null;
  }, [scene]);

  useFrame((state, delta) => {
    const targetIntensity = active !== null ? 3 : 2;

    if (ambientLightRef.current) {
      easing.damp(ambientLightRef.current, "intensity", targetIntensity, 0.3, delta);
    }

    const activeCard = cardArr.find((card) => card.id === active);
    const selectedVariant =
      activeCard && active !== null
        ? activeCard.colorVariations[activeCard.selectedVariantIndex]
        : null;
    const targetBottomColor =
      active !== null && selectedVariant ? selectedVariant.bgColor : "#bdd7ee";

    easing.dampC(currentBottomColor.current, targetBottomColor, 0.5, delta);

    // Camera positioning
    if (!isLoaded) {
      easing.damp3(state.camera.position, [state.camera.position.x, 20, 0], 2.0, delta);
    } else if (active) {
      easing.damp3(state.camera.position, [state.camera.position.x, 9.5, 0], 1.2, delta);
    } else {
      easing.damp3(state.camera.position, [0, 1.9, 10], 0.15, delta);
    }
    camera.lookAt(0, 0, 0);
  });

  return (
    <ScrollControls pages={2} horizontal={false}>
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
          cardPos={i - (cardArr.length - 1) / 2}
          active={active}
          setActive={setActive}
          isLoaded={isLoaded}
          cards={cardArr}
        />
      )}
    </ScrollControls>
  )
}