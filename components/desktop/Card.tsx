"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, useMemo, useState, Dispatch, SetStateAction, useEffect } from "react";
import * as THREE from "three";
import { easing } from "maath";
import { useTexture, Decal } from "@react-three/drei";
import { CardType } from "@/app/definitions";

const createRoundedRectShape = (width: number, height: number, radius: number): THREE.Shape => {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, -height / 2 + radius);
  shape.lineTo(-width / 2, height / 2 - radius);
  shape.quadraticCurveTo(-width / 2, height / 2, -width / 2 + radius, height / 2);
  shape.lineTo(width / 2 - radius, height / 2);
  shape.quadraticCurveTo(width / 2, height / 2, width / 2, height / 2 - radius);
  shape.lineTo(width / 2, -height / 2 + radius);
  shape.quadraticCurveTo(width / 2, -height / 2, width / 2 - radius, -height / 2);
  shape.lineTo(-width / 2 + radius, -height / 2);
  shape.quadraticCurveTo(-width / 2, -height / 2, -width / 2, -height / 2 + radius);
  return shape;
};

interface CardProps {
  card: CardType;
  id: number;
  cardPos: number;
  cardIndex: number;
  cardArr: CardType[];
  active: number | null;
  setActive: Dispatch<SetStateAction<number | null>>;
  isLoaded: boolean;
  scrollPosition: number;
  inArrowZone: boolean;
  hoverLocked: boolean;
}

const Card = ({
  card,
  id,
  cardPos,
  cardIndex,
  cardArr,
  active,
  setActive,
  isLoaded,
  scrollPosition,
  inArrowZone,
  hoverLocked,
}: CardProps) => {
  const [hover, setHover] = useState(false);
  const isPointerOverRef = useRef(false); // Track if pointer is over the card
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const roundedRectShape = createRoundedRectShape(1.0, 1.75, 0.1);
  const geometry = new THREE.ExtrudeGeometry(roundedRectShape, { depth: 0.02, bevelEnabled: false });
  const initialPos = useMemo(() => new THREE.Vector3(cardPos * 1.2, 0, 0), [cardPos]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const selectedVariant = card.colorVariations[card.selectedVariantIndex];
  const [bookmark] = useTexture(["/bookmark.png"]);

  const rotationRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Reset hover state when entering arrow zone or when hover is locked during scrolling
  useEffect(() => {
    if (inArrowZone || hoverLocked) {
      setHover(false);
    } else if (isPointerOverRef.current && !active) {
      // If hover lock is released and pointer is already over the card, show hover effect
      setHover(true);
    }
  }, [inArrowZone, hoverLocked, active]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  bookmark.minFilter = THREE.LinearFilter;
  bookmark.magFilter = THREE.LinearFilter;
  bookmark.anisotropy = 16;
  bookmark.generateMipmaps = true;

  const pointerOver = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    // Always track when pointer is over, even when we can't display hover effect
    isPointerOverRef.current = true;
    // Only show hover effect if not locked
    if (!active && !inArrowZone && !hoverLocked) setHover(true);
  };
  
  const pointerOut = () => {
    isPointerOverRef.current = false;
    if (!active) setHover(false);
  };

  const click = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    // Only allow clicks when not scrolling
    if (!hoverLocked) {
      setActive(id);
      setHover(false);
    }
  };

  useEffect(() => {
    const pointerMove = (e: MouseEvent) => {
      if (active === id) {
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = -(e.clientY / window.innerHeight) * 2 + 1;
        setMousePos({ x, y });
      }
    };
    window.addEventListener("mousemove", pointerMove);
    return () => window.removeEventListener("mousemove", pointerMove);
  }, [active, id]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      let targetPosition: [number, number, number];
      let smoothTime: number;
      let targetRotation: [number, number, number];
      let intensity: number;

      if (active === id) {
        // Center the selected card at origin (0,0,0) regardless of its original position
        targetPosition = [0, 1.95, windowWidth < 780 ? 6 : 15];
        smoothTime = 0.4;
        intensity = 0.25;
        const rotationX = mousePos.y * intensity;
        const rotationY = mousePos.x * intensity;
        
        targetRotation = [
          -rotationX,
          card.isFlipped ? Math.PI - rotationY : -rotationY,
          0,
        ];
      } else {
        // Calculate horizontal position based on scroll position regardless of hover state
        let xPosition = initialPos.x;
        const zOffset = active !== null ? -2 : 0;
        
        // If a card is active and this card is not active
        if (active !== null && active !== id) {
          // Find the index of the active card
          const activeCardIndex = cardArr.findIndex((c: CardType) => c.id === active);
          const activeCardPos = activeCardIndex - (cardArr.length - 1) / 2;
          
          // Calculate how much the row needs to shift to center the active card's original position
          const rowOffset = -activeCardPos * 1.2;
          
          // Determine which side of the active card this card is on
          if (cardIndex < activeCardIndex) {
            // All cards to the left of active card move left
            xPosition = initialPos.x - 1.8 + rowOffset;
          } else if (cardIndex > activeCardIndex) {
            // All cards to the right of active card move right
            xPosition = initialPos.x + 1.8 + rowOffset;
          }
        } else if (active === null) {
          // Apply scroll offset when in idle view
          xPosition = initialPos.x - scrollPosition;
        }
        
        // Set y position based on hover state, but always use the calculated x position
        if (hover) {
          targetPosition = [xPosition, 0.5, initialPos.z + zOffset];
          smoothTime = 0.1;
        } else {
          targetPosition = [xPosition, initialPos.y, initialPos.z + zOffset];
          // Faster animation when returning to the idle view
          smoothTime = active === null ? 0.087 : 0.35;
        }
        
        targetRotation = [0, card.isFlipped ? Math.PI : 0, 0];
      }

      easing.damp3(groupRef.current.position, targetPosition, smoothTime, delta);
      easing.damp3(rotationRef.current, targetRotation, active ? 0.5 : 0.25, delta);
      groupRef.current.rotation.set(rotationRef.current.x, rotationRef.current.y, rotationRef.current.z);

      if (!isLoaded) {
        easing.damp3(state.camera.position, [state.camera.position.x, 30, 0], 2.0, delta);
      } else {
        if (active) {
          // Center camera on the origin point (0,0,0) where the active card is positioned
          easing.damp3(state.camera.position, [0, 2.5, 20], 1.5, delta);
        } else {
          // Keep camera positioned to have all cards in view, with slower transition
          easing.damp3(state.camera.position, [0, 2, 8], 1.215, delta);
        }
      }
    }
  });

  return (
    <group ref={groupRef} position={initialPos} rotation={[0, 0, 0]}>
      {/* BASE CARD */}
      <mesh
        onPointerOver={pointerOver}
        onPointerOut={pointerOut}
        ref={meshRef}
        geometry={geometry}
        receiveShadow
        castShadow
        onClick={click}
      >
        <meshStandardMaterial 
          color={selectedVariant.cardColor} 
          roughness={0.7}
          metalness={0.0}
        />

        {/* FRONT ILLUSTRATION */}
        <Decal receiveShadow={active ? false : true} position={[0.02, 0, 0]} scale={[1, 1.75, 0.1]}>
          <meshStandardMaterial
            polygonOffset
            polygonOffsetFactor={-1}
            map={bookmark}
            roughness={0.8}
            metalness={0.0}
            side={THREE.DoubleSide}
          />
        </Decal>

        {/* BACK ILLUSTRATION */}
        <Decal
          receiveShadow={active ? false : true}
          position={[0, 0, -0.04]}
          scale={[1, 1.75, 0.1]}
          rotation={[0, Math.PI, 0]}
        >
          <meshStandardMaterial
            polygonOffset
            polygonOffsetFactor={-1}
            map={bookmark}
            roughness={0.8}
            metalness={0.0}
            side={THREE.DoubleSide}
          />
        </Decal>
      </mesh>
    </group>
  );
};

export default Card;