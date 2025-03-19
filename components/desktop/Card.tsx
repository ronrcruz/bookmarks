"use client";

import { useState, useRef, useEffect, useMemo, Dispatch, SetStateAction } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { easing } from "maath";
import { useTexture, Decal } from "@react-three/drei";
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
  cardPos: number;
  active: number | null;
  setActive: Dispatch<SetStateAction<number | null>>;
  isLoaded: boolean;
}

const Card = ({
  card,
  id,
  cardPos,
  active,
  setActive,
  isLoaded,
}: CardProps) => {
  // State and refs
  const [hover, setHover] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const rotationRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0.7, 0));
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  // Get the selected color variant
  const selectedVariant = card.colorVariations[card.selectedVariantIndex];
  const [bookmark] = useTexture(["/bookmark.png"]);

  bookmark.minFilter = THREE.LinearFilter;
  bookmark.magFilter = THREE.LinearFilter;
  bookmark.anisotropy = 16;
  bookmark.generateMipmaps = true;

  // Create card geometry
  const roundedRectShape = createRoundedRectShape(1.0, 1.75, 0.1);
  const geometry = new THREE.ExtrudeGeometry(roundedRectShape, { depth: 0.02, bevelEnabled: false });
  
  // Position and color calculations
  const initialPos = useMemo(() => new THREE.Vector3(cardPos * 0.4, 0, 0), [cardPos]);
  const selected = active === id;
  
  // Create desaturated version of the card color for non-selected state
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

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const pointerOver = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (!active) setHover(true);
  };
  
  const pointerOut = () => {
    if (!active) setHover(false);
  };
  
  const click = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setActive(id);
    setHover(false);
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
      targetPosition = [0, windowWidth < 780 ? 15 : 16, 0];
      smoothTime = 0.4;
      targetOpacity = 1.0;
      targetRoughness = 0.3;
      targetMetalness = 0.7;
      targetEmissive = new THREE.Color(0x111111);
      targetColor = cardColor;
      
      // Interactive rotation based on mouse position
      const rotationX = mousePos.y * intensity;
      const rotationY = mousePos.x * intensity;
      
      targetRotation = [
        Math.PI / 2 - rotationX,
        card.isFlipped ? Math.PI - rotationY + Math.PI : Math.PI - rotationY,
        Math.PI,
      ];
    } else if (hover) {
      // Hover state - slight elevation
      targetPosition = [groupRef.current.position.x, 0.5, groupRef.current.position.z];
      smoothTime = 0.1;
      targetOpacity = 1.0;
      targetRoughness = 0.5;
      targetMetalness = 0.3;
      targetEmissive = new THREE.Color(0x000000);
      targetColor = cardColor;
      targetRotation = [0, card.isFlipped ? 0.7 + Math.PI : 0.7, 0];
    } else if (active !== null && active !== id) {
      // When any card is active but not this one
      targetPosition = [initialPos.x, -0.3, -3];
      targetScale = [0.8, 0.8, 0.8];
      smoothTime = 0.5;
      targetOpacity = 0.5;
      targetRoughness = 0.95;
      targetMetalness = 0.05;
      targetEmissive = new THREE.Color(0x000000);
      targetColor = desaturatedColor;
      targetRotation = [0, card.isFlipped ? 0.7 + Math.PI : 0.7, 0];
    } else {
      // Default state
      targetPosition = [initialPos.x, initialPos.y, initialPos.z];
      smoothTime = active === null ? 0.1 : 0.5;
      targetOpacity = 1.0;
      targetRoughness = 0.6;
      targetMetalness = 0.2;
      targetEmissive = new THREE.Color(0x000000);
      targetColor = cardColor;
      targetRotation = [0, card.isFlipped ? 0.7 + Math.PI : 0.7, 0];
    }

    // Apply animations with easing
    easing.damp3(groupRef.current.position, targetPosition, smoothTime, delta);
    easing.damp3(groupRef.current.scale, targetScale, smoothTime, delta);
    easing.damp3(rotationRef.current, targetRotation, active === id ? 0.5 : 0.175, delta);
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
    
    // Camera animations from existing code
    if (!isLoaded) {
      easing.damp3(state.camera.position, [state.camera.position.x, 30, 0], 2.0, delta);
    } else {
      if (active !== null) {
        easing.damp3(state.camera.position, [state.camera.position.x, 20.5, active ? 0 : 8], 2.0, delta);
      } else {
        easing.damp3(state.camera.position, [state.camera.position.x, 2, active ? 0 : 8], 2.0, delta);
      }
    }
  });

  return (
    <group ref={groupRef} position={initialPos} rotation={[0, 0.7, 0]}>
      {/* BASE CARD */}
      <mesh
        onPointerOver={pointerOver}
        onPointerOut={pointerOut}
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