"use client";

import { useFrame, useLoader } from "@react-three/fiber";
import { useRef, useMemo, useState, Dispatch, SetStateAction, useEffect } from "react";
import * as THREE from "three";
import { easing } from "maath";
import { useTexture, Decal, useScroll } from "@react-three/drei";
import { RGBELoader } from "three/examples/jsm/Addons.js";
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
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const roundedRectShape = createRoundedRectShape(1.0, 1.75, 0.1);
  const geometry = new THREE.ExtrudeGeometry(roundedRectShape, { depth: 0.02, bevelEnabled: false });
  const planeGeometry = useMemo(() => {
    const shape = createRoundedRectShape(1.0, 1.75, 0.1);
    const geo = new THREE.ShapeGeometry(shape, 32);
    geo.computeVertexNormals();
    const uvs = geo.attributes.uv.array;
    for (let i = 0; i < uvs.length; i += 2) {
      uvs[i] = (uvs[i] + 0.5) * (1.0 / 1.0);
      uvs[i + 1] = (uvs[i + 1] + 0.875) * (1.0 / 1.75);
    }
    geo.attributes.uv.needsUpdate = true;
    return geo;
  }, []);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const rotationRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const scroll = useScroll();

  // Constants for positioning
  const dz = 1.75 / 2; // Spacing between cards along z-axis
  const focusZ = 5; // Z-position of the focused card
  const elevationThreshold = 0.4; // Threshold for elevation
  const elevationHeight = 0.7; // Height to elevate the focused card

  const initialPos = useMemo(() => new THREE.Vector3(0, 0, index * dz), [index, dz]);

  const selectedVariant = card.colorVariations[card.selectedVariantIndex];
  const [bookmark, foil, normalMap] = useTexture(["/bookmark.png", "/foil.png", "/NormalMap.png"]);

  const goldEnvMap = {
    map: useLoader(RGBELoader, "/pretville_cinema_1k.hdr"),
    rotation: new THREE.Euler(0.4, 0, 0.1),
    intensity: 3,
  };

  const silverEnvMap = {
    map: useLoader(RGBELoader, "/st_peters_square_night_1k.hdr"),
    rotation: new THREE.Euler(-0.3, 0.3, 1.2),
    intensity: 4,
  };

  const envMap = selectedVariant.foilColor === "gold" ? goldEnvMap : silverEnvMap;

  bookmark.minFilter = THREE.LinearFilter;
  bookmark.magFilter = THREE.LinearFilter;
  bookmark.anisotropy = 16;
  bookmark.generateMipmaps = true;

  foil.minFilter = THREE.LinearFilter;
  foil.magFilter = THREE.LinearFilter;
  foil.anisotropy = 16;
  foil.generateMipmaps = true;

  envMap.map.mapping = THREE.EquirectangularReflectionMapping;

  const click = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setActive(id)
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
    if (!groupRef.current) return;

    const dz = active ? 20 : 1.75 / 2; // Spacing between cards along z-axis

    const N = cards.length;
    const focusedIndex = scroll.offset * (N - 1); // Maps scroll offset (0 to 1) to card index (0 to N-1)
    const targetZ = 5 + (index - focusedIndex) * dz; // Position cards relative to focused card at z=5
    const distanceFromFocus = Math.abs(targetZ - focusZ);
    const elevationFactor = Math.max(0, 1 - distanceFromFocus / elevationThreshold); // Smooth elevation
    const targetY = elevationHeight * elevationFactor + 0.5;

    let targetPosition: [number, number, number];
    let smoothTime: number;
    let targetRotation: [number, number, number];
    let intensity: number;

    if (active === id) {
      targetPosition = [0, 4.5, -0.055];
      smoothTime = 0.35;
      intensity = 0.25;
      const rotationX = mousePos.y * intensity;
      const rotationY = mousePos.x * intensity;
      targetRotation = [
        -Math.PI / 2 - rotationX,
        card.isFlipped ? rotationY + Math.PI : rotationY,
        0,
      ];
    } else {
      targetPosition = [0, targetY, targetZ];
      smoothTime = 0.15;
      targetRotation = [0, 0, 0];
    }

    // Apply easing properly - direct positioning for x to stay in sync with scrolling,
    // but easing for y and z for smooth vertical and depth transitions
    groupRef.current.position.x = targetPosition[0]; // Direct x positioning - no easing
    easing.damp(groupRef.current.position, 'y', targetPosition[1], smoothTime, delta); // Eased y
    easing.damp(groupRef.current.position, 'z', targetPosition[2], smoothTime, delta); // Eased z
    easing.damp3(rotationRef.current, targetRotation, active ? 0.35 : 0.265, delta);

    groupRef.current.rotation.set(rotationRef.current.x, rotationRef.current.y, rotationRef.current.z);
  });

  return (
    <group ref={groupRef} position={initialPos}>
      {/* BASE CARD */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        receiveShadow
        castShadow
        onClick={click}
      >
        <meshPhysicalMaterial color={selectedVariant.cardColor} opacity={1} />
        {/* FRONT ILLUSTRATION */}
        <Decal receiveShadow={active ? false : true} position={[0.02, 0, 0]} scale={[1, 1.75, 0.1]}>
          <meshPhysicalMaterial
            polygonOffset
            polygonOffsetFactor={-1}
            map={bookmark}
            roughness={0.9}
            metalness={0.1}
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
          <meshPhysicalMaterial
            polygonOffset
            polygonOffsetFactor={-1}
            map={bookmark}
            roughness={0.9}
            metalness={0.1}
            side={THREE.DoubleSide}
          />
        </Decal>
      </mesh>
      {/* FRONT FOIL */}
      <mesh geometry={planeGeometry} position={[0, 0, 0.03]}>
        <meshPhysicalMaterial
          transparent
          roughness={0.1}
          metalness={0.8}
          reflectivity={0.8}
          sheen={1}
          map={foil}
          normalMap={normalMap}
          normalScale={new THREE.Vector2(0.1, 0.1)}
          envMap={envMap.map}
          envMapIntensity={envMap.intensity}
          envMapRotation={envMap.rotation}
        />
      </mesh>
      {/* BACK FOIL */}
      <mesh geometry={planeGeometry} rotation={[0, Math.PI, 0]} position={[0, 0, -0.01]}>
        <meshPhysicalMaterial
          side={THREE.DoubleSide}
          transparent
          roughness={0.1}
          metalness={0.8}
          reflectivity={0.8}
          sheen={1}
          map={foil}
          normalMap={normalMap}
          normalScale={new THREE.Vector2(0.1, 0.1)}
          envMap={envMap.map}
          envMapIntensity={envMap.intensity}
          envMapRotation={envMap.rotation}
        />
      </mesh>
    </group>
  );
};

export default Card;