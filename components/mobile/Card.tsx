"use client";

import { useState, useRef, useEffect, useMemo, Dispatch, SetStateAction } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { easing } from "maath";
import { useTexture, Decal, useScroll } from "@react-three/drei";
import { CardType } from "@/app/definitions";

// Create a rounded rectangle shape for cards
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
  index: number;
  cardPos: number;
  active: number | null;
  setActive: Dispatch<SetStateAction<number | null>>;
  isLoaded: boolean;
  cards: CardType[];
}

const Card = ({
  card,
  id,
  index,
  active,
  setActive,
  // isLoaded,
  cards,
}: CardProps) => {
  // State and refs
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const rotationRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const scroll = useScroll();

  // Constants for positioning
  const dz = 1.75 / 2; // Spacing between cards along z-axis
  const focusZ = 5; // Z-position of the focused card
  const elevationThreshold = 0.4; // Threshold for elevation
  const elevationHeight = 0.7; // Height to elevate the focused card

  const initialPos = useMemo(() => new THREE.Vector3(0, 0, index * dz), [index, dz]);

  // Create card geometry
  const roundedRectShape = createRoundedRectShape(1.0, 1.75, 0.1);
  const geometry = new THREE.ExtrudeGeometry(roundedRectShape, { depth: 0.02, bevelEnabled: false });

  // Get the selected color variant and prepare textures
  const selectedVariant = card.colorVariations[card.selectedVariantIndex];
  const [bookmark] = useTexture(["/bookmark.png"]);

  bookmark.minFilter = THREE.LinearFilter;
  bookmark.magFilter = THREE.LinearFilter;
  bookmark.anisotropy = 16;
  bookmark.generateMipmaps = true;

  // Create color states for animations
  const cardColor = new THREE.Color(selectedVariant.cardColor);
  const desaturatedColor = useMemo(() => {
    const color = new THREE.Color(selectedVariant.cardColor);
    // Convert to HSL to reduce saturation
    const hsl = {h: 0, s: 0, l: 0};
    color.getHSL(hsl);
    // Reduce saturation by 70%
    color.setHSL(hsl.h, hsl.s * 0.3, hsl.l);
    return color;
  }, [selectedVariant.cardColor]);

  const click = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setActive(id);
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
    if (!groupRef.current || !materialRef.current) return;

    const dz = active ? 20 : 1.75 / 2; // Spacing between cards along z-axis

    const N = cards.length;
    const focusedIndex = scroll.offset * (N - 1); // Maps scroll offset (0 to 1) to card index (0 to N-1)
    const targetZ = 5 + (index - focusedIndex) * dz; // Position cards relative to focused card at z=5
    const distanceFromFocus = Math.abs(targetZ - focusZ);
    const elevationFactor = Math.max(0, 1 - distanceFromFocus / elevationThreshold); // Smooth elevation
    const targetY = elevationHeight * elevationFactor + 0.5;

    let targetPosition: [number, number, number];
    let targetScale: [number, number, number] = [1, 1, 1];
    let smoothTime: number;
    let targetRotation: [number, number, number];
    let targetOpacity = 1.0;
    let targetRoughness = 0.6;
    let targetMetalness = 0.2;
    let targetEmissive = new THREE.Color(0x000000);
    let targetColor = cardColor;
    const intensity = 0.25;

    if (active === id) {
      // Selected card - center position, facing camera
      targetPosition = [0, 4.5, -0.055];
      smoothTime = 0.35;
      targetOpacity = 1.0;
      targetRoughness = 0.3;
      targetMetalness = 0.7;
      targetEmissive = new THREE.Color(0x111111);
      targetColor = cardColor;
      
      // Interactive rotation based on mouse position
      const rotationX = mousePos.y * intensity;
      const rotationY = mousePos.x * intensity;
      targetRotation = [
        -Math.PI / 2 - rotationX,
        card.isFlipped ? rotationY + Math.PI : rotationY,
        0,
      ];
    } else if (active !== null && active !== id) {
      // When any card is active but not this one
      targetPosition = [0, -0.3, targetZ - 5]; // Move away and backward
      targetScale = [0.8, 0.8, 0.8]; // Scale down
      smoothTime = 0.5;
      targetOpacity = 0.5;
      targetRoughness = 0.95;
      targetMetalness = 0.05;
      targetEmissive = new THREE.Color(0x000000);
      targetColor = desaturatedColor;
      targetRotation = [0, card.isFlipped ? Math.PI : 0, 0];
    } else {
      // Default state - stacked position
      targetPosition = [0, targetY, targetZ];
      smoothTime = 0.15;
      targetOpacity = 1.0;
      targetRoughness = 0.6;
      targetMetalness = 0.2;
      targetEmissive = new THREE.Color(0x000000);
      targetColor = cardColor;
      targetRotation = [0, 0, 0];
    }

    // Apply animations with easing
    easing.damp3(groupRef.current.position, targetPosition, smoothTime, delta);
    easing.damp3(groupRef.current.scale, targetScale, smoothTime, delta);
    easing.damp3(rotationRef.current, targetRotation, active === id ? 0.35 : 0.265, delta);
    groupRef.current.rotation.set(rotationRef.current.x, rotationRef.current.y, rotationRef.current.z);

    // Animate material properties
    easing.dampC(
      materialRef.current.color,
      targetColor,
      0.3,
      delta
    );
    
    easing.damp(
      materialRef.current,
      "opacity",
      targetOpacity,
      0.3,
      delta
    );
    easing.damp(
      materialRef.current,
      "roughness",
      targetRoughness,
      0.3,
      delta
    );
    easing.damp(
      materialRef.current,
      "metalness",
      targetMetalness,
      0.3,
      delta
    );
    easing.dampC(
      materialRef.current.emissive,
      targetEmissive,
      0.3,
      delta
    );
  });

  return (
    <group ref={groupRef} position={initialPos}>
      {/* BASE CARD */}
      <mesh
        geometry={geometry}
        receiveShadow
        castShadow
        onClick={click}
      >
        <meshStandardMaterial
          ref={materialRef}
          color={cardColor}
          roughness={0.6}
          metalness={0.2}
          transparent={true}
          opacity={1.0}
          emissive={new THREE.Color(0x000000)}
        />
        
        {/* FRONT ILLUSTRATION */}
        <Decal receiveShadow={active === id ? false : true} position={[0.02, 0, 0]} scale={[1, 1.75, 0.1]}>
          <meshStandardMaterial
            polygonOffset
            polygonOffsetFactor={-1}
            map={bookmark}
            roughness={0.9}
            side={THREE.DoubleSide}
          />
        </Decal>
        
        {/* BACK ILLUSTRATION */}
        <Decal
          receiveShadow={active === id ? false : true}
          position={[0, 0, -0.04]}
          scale={[1, 1.75, 0.1]}
          rotation={[0, Math.PI, 0]}
        >
          <meshStandardMaterial
            polygonOffset
            polygonOffsetFactor={-1}
            map={bookmark}
            roughness={0.9}
            side={THREE.DoubleSide}
          />
        </Decal>
      </mesh>
    </group>
  );
};

export default Card;