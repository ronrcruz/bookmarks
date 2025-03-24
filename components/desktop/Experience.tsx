"use client";

import { Dispatch, SetStateAction, useEffect, useMemo, useRef } from "react";
import Card from "./Card";
import { Environment, OrbitControls, ContactShadows, Cylinder, GradientTexture } from "@react-three/drei";
import { CardType } from "@/app/definitions";
import { useFrame, useThree } from "@react-three/fiber";
import { easing } from "maath";
import * as THREE from "three";

interface ExperienceProps {
  cardArr: CardType[];
  active: number | null;
  setActive: Dispatch<SetStateAction<number | null>>;
  isLoaded: boolean;
  scrollPosition: number;
  inArrowZone: boolean;
  hoverLocked: boolean;
  cursorPosition: { x: number, y: number };
}

export default function Experience({
  cardArr,
  active,
  setActive,
  isLoaded,
  scrollPosition,
  inArrowZone,
  hoverLocked,
  cursorPosition,
}: ExperienceProps) {
  const { scene, camera } = useThree();
  const currentBottomColor = useRef(new THREE.Color("#bdd7ee"));
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const targetOpacity = useRef(1);
  const opacityDelay = useRef(0);
  const directionalLightRef = useRef<THREE.DirectionalLight | null>(null);

  // Make the scene transparent
  useMemo(() => {
    scene.background = null;
  }, [scene]);

  useEffect(() => {
    targetOpacity.current = isLoaded && !active ? 0 : 1;
    opacityDelay.current = 0;
  }, [active, isLoaded]);

  useFrame((state, delta) => {
    // Keep ambient light intensity consistent between active and inactive views
    const targetIntensity = 2; // Same intensity regardless of active state
    if (ambientLightRef.current) {
      easing.damp(ambientLightRef.current, "intensity", targetIntensity, 0.3, delta);
    }

    // Keep directional light position consistent between views
    const lightPositionZ = 6; // Same position regardless of active state
    if (directionalLightRef.current) {
      easing.damp3(
        directionalLightRef.current.position,
        [10, 6, lightPositionZ],
        0.3,
        delta
      );
    }
    
    // Smooth camera animation for active/inactive states
    if (!isLoaded) {
      easing.damp3(camera.position, [camera.position.x, 30, 0], 2.0, delta);
    } else if (active !== null) {
      // Smooth camera animation to active view position
      easing.damp3(camera.position, [0, 2.5, 20], 1.5, delta);
    } else {
      // Smooth camera animation to idle view position
      easing.damp3(camera.position, [0, 2, 8], 0.95, delta);
    }
    
    const activeCard = cardArr.find((card) => card.id === active);
    const selectedVariant =
      activeCard && active !== null
        ? activeCard.colorVariations[activeCard.selectedVariantIndex]
        : null;
    const targetBottomColor =
      active !== null && selectedVariant ? selectedVariant.bgColor : "#bdd7ee";

    easing.dampC(currentBottomColor.current, targetBottomColor, 0.5, delta);
    
    opacityDelay.current += delta;
  });

  return (
    <>
      <OrbitControls enableRotate={false} enableZoom={false} enablePan={false} />
      <ambientLight ref={ambientLightRef} intensity={0} />
      <directionalLight
        castShadow
        intensity={1}
        position={[10, 6, 6]}
        shadow-mapSize={[1028, 1028]}
        ref={directionalLightRef}
      />
      
      {/* Additional light to ensure consistent illumination in both views */}
      <directionalLight
        castShadow
        intensity={0.7}
        position={[-5, 5, 5]}
        shadow-mapSize={[1028, 1028]}
      />
      
      <Environment
        environmentIntensity={1}
        preset={"city"}
        // Keep environment rotation consistent between active and inactive views
        environmentRotation={[0, 0, 0]}
      />

      <group>
        {cardArr.map((card, i) => {
          return (
            <Card
              key={card.id}
              card={card}
              id={card.id}
              cardPos={i - (cardArr.length - 1) / 2}
              cardIndex={i}
              cardArr={cardArr}
              active={active}
              setActive={setActive}
              isLoaded={isLoaded}
              scrollPosition={scrollPosition}
              inArrowZone={inArrowZone}
              hoverLocked={hoverLocked}
              cursorPosition={cursorPosition}
            />
          );
        })}
      </group>

      {/* Contact shadows for the cards */}
      <ContactShadows
        position={[0, -1.75 / 2, 0]}
        scale={12}
        resolution={512}
        opacity={6}
        far={1}
        // Ensure consistent shadows regardless of active state
        blur={3}
      />
    </>
  );
}