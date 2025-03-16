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
  index: number; // Added index prop
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
  cardPos,
  active,
  setActive,
  isLoaded,
  cards,
}: CardProps) => {
  const [hover, setHover] = useState(false);
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
  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 0);
  const scroll = useScroll();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleResize = () => setWindowWidth(window.innerWidth);
      window.addEventListener("resize", handleResize);
      setWindowWidth(window.innerWidth);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  // Constants for positioning
  const dz = 0.5; // Spacing between cards along z-axis
  const focusZ = 5; // Z-position of the focused card
  const elevationThreshold = 0.5; // Threshold for elevation
  const elevationHeight = 0.7; // Height to elevate the focused card

  // Initial position when scroll.offset = 0
  const initialPos = useMemo(() => new THREE.Vector3(0, 0, index * dz), [index]);

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

  const pointerOver = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (!active) setHover(true);
  };
  const pointerOut = () => !active && setHover(false);
  const click = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    !active ? setActive(id) : setActive(null);
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
    if (!groupRef.current) return;

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
      // Card is active (clicked)
      targetPosition = [0, 4.5, 0];
      smoothTime = 0.35;
      intensity = 0.25;
      const rotationX = mousePos.y * intensity;
      const rotationY = mousePos.x * intensity;
      targetRotation = [
        -Math.PI / 2 - rotationX,
        card.isFlipped ? rotationY : rotationY,
        0,
      ];
    } else {
      // Card is in stacking mode
      targetPosition = [0, targetY, targetZ];
      smoothTime = 0.15;
      targetRotation = [0, 0, 0];
    }

    // Animate position and rotation
    easing.damp3(groupRef.current.position, targetPosition, smoothTime, delta);
    easing.damp3(rotationRef.current, targetRotation, active ? 0.15 : 0.26, delta);

    groupRef.current.rotation.set(rotationRef.current.x, rotationRef.current.y, rotationRef.current.z);
  });

  return (
    <group ref={groupRef} position={initialPos}>
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

// "use client";

// import { useFrame, useLoader } from "@react-three/fiber";
// import { useRef, useMemo, useState, Dispatch, SetStateAction, useEffect } from "react";
// import * as THREE from "three";
// import { easing } from "maath";
// import { useTexture, Decal, useScroll } from "@react-three/drei";
// import { RGBELoader } from "three/examples/jsm/Addons.js";
// import { CardType } from "@/app/definitions";

// const createRoundedRectShape = (width: number, height: number, radius: number): THREE.Shape => {
//   const shape = new THREE.Shape();
//   shape.moveTo(-width / 2, -height / 2 + radius);
//   shape.lineTo(-width / 2, height / 2 - radius);
//   shape.quadraticCurveTo(-width / 2, height / 2, -width / 2 + radius, height / 2);
//   shape.lineTo(width / 2 - radius, height / 2);
//   shape.quadraticCurveTo(width / 2, height / 2, width / 2, height / 2 - radius);
//   shape.lineTo(width / 2, -height / 2 + radius);
//   shape.quadraticCurveTo(width / 2, -height / 2, width / 2 - radius, -height / 2);
//   shape.lineTo(-width / 2 + radius, -height / 2);
//   shape.quadraticCurveTo(-width / 2, -height / 2, -width / 2, -height / 2 + radius);
//   return shape;
// };

// interface CardProps {
//   card: CardType;
//   id: number;
//   index: number;
//   cardPos: number;
//   active: number | null;
//   setActive: Dispatch<SetStateAction<number | null>>;
//   isLoaded: boolean;
//   cards: CardType[];
// }

// const Card = ({
//   card,
//   id,
//   index,
//   cardPos,
//   active,
//   setActive,
//   isLoaded,
//   cards,
// }: CardProps) => {
//   const [hover, setHover] = useState(false);
//   const groupRef = useRef<THREE.Group>(null);
//   const meshRef = useRef<THREE.Mesh>(null);
//   const roundedRectShape = createRoundedRectShape(1.0, 1.75, 0.1);
//   const geometry = new THREE.ExtrudeGeometry(roundedRectShape, { depth: 0.02, bevelEnabled: false });
//   const planeGeometry = useMemo(() => {
//     const shape = createRoundedRectShape(1.0, 1.75, 0.1);
//     const geo = new THREE.ShapeGeometry(shape, 32);
//     geo.computeVertexNormals();
//     const uvs = geo.attributes.uv.array;
//     for (let i = 0; i < uvs.length; i += 2) {
//       uvs[i] = (uvs[i] + 0.5) * (1.0 / 1.0);
//       uvs[i + 1] = (uvs[i + 1] + 0.875) * (1.0 / 1.75);
//     }
//     geo.attributes.uv.needsUpdate = true;
//     return geo;
//   }, []);
//   const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
//   const rotationRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
//   const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 0);
//   const scroll = useScroll();

//   useEffect(() => {
//     if (typeof window !== "undefined") {
//       const handleResize = () => setWindowWidth(window.innerWidth);
//       window.addEventListener("resize", handleResize);
//       setWindowWidth(window.innerWidth);
//       return () => window.removeEventListener("resize", handleResize);
//     }
//   }, []);

//   const [isReturning, setIsReturning] = useState(false);
//   const prevActiveRef = useRef(active);

//   // Constants for positioning
//   const dz = 0.22; // Spacing between cards along z-axis
//   const focusZ = 5; // Z-position of the focused card
//   const elevationThreshold = 0.2; // Threshold for elevation
//   const elevationHeight = 0.6; // Height to elevate the focused card

//   useEffect(() => {
//     if (prevActiveRef.current === id && active !== id) {
//       setIsReturning(true);
//     }
//     prevActiveRef.current = active;
//   }, [active, id]);

//   // Initial position when scroll.offset = 0
//   const initialPos = useMemo(() => new THREE.Vector3(0, 0, index * dz), [index]);

//   const selectedVariant = card.colorVariations[card.selectedVariantIndex];
//   const [bookmark, foil, normalMap] = useTexture(["/bookmark.png", "/foil.png", "/NormalMap.png"]);

//   const goldEnvMap = {
//     map: useLoader(RGBELoader, "/pretville_cinema_1k.hdr"),
//     rotation: new THREE.Euler(0.4, 0, 0.1),
//     intensity: 3,
//   };

//   const silverEnvMap = {
//     map: useLoader(RGBELoader, "/st_peters_square_night_1k.hdr"),
//     rotation: new THREE.Euler(-0.3, 0.3, 1.2),
//     intensity: 4,
//   };

//   const envMap = selectedVariant.foilColor === "gold" ? goldEnvMap : silverEnvMap;

//   bookmark.minFilter = THREE.LinearFilter;
//   bookmark.magFilter = THREE.LinearFilter;
//   bookmark.anisotropy = 16;
//   bookmark.generateMipmaps = true;

//   foil.minFilter = THREE.LinearFilter;
//   foil.magFilter = THREE.LinearFilter;
//   foil.anisotropy = 16;
//   foil.generateMipmaps = true;

//   envMap.map.mapping = THREE.EquirectangularReflectionMapping;

//   const pointerOver = (e: { stopPropagation: () => void }) => {
//     e.stopPropagation();
//     if (!active) setHover(true);
//   };
//   const pointerOut = () => !active && setHover(false);
//   const click = (e: { stopPropagation: () => void }) => {
//     e.stopPropagation();
//     !active ? setActive(id) : setActive(null);
//     setHover(false);
//   };

//   useEffect(() => {
//     const pointerMove = (e: MouseEvent) => {
//       if (active === id) {
//         const x = (e.clientX / window.innerWidth) * 2 - 1;
//         const y = -(e.clientY / window.innerHeight) * 2 + 1;
//         setMousePos({ x, y });
//       }
//     };
//     window.addEventListener("mousemove", pointerMove);
//     return () => window.removeEventListener("mousemove", pointerMove);
//   }, [active, id]);
//   useFrame((state, delta) => {
//     if (!groupRef.current) return;

//     const N = cards.length;
//     const focusedIndex = scroll.offset * (N - 1);
//     const targetZ = 5 + (index - focusedIndex) * dz;
//     const distanceFromFocus = Math.abs(targetZ - focusZ);
//     const elevationFactor = Math.max(0, 1 - distanceFromFocus / elevationThreshold);
//     const targetY = elevationHeight * elevationFactor + 0.7;

//     // Initialize with default values
//     let targetPosition: [number, number, number] = [0, targetY, targetZ]; // Default stacking position
//     let smoothTime: number = 0.3; // Default smoothing time for stacking
//     let targetRotation: [number, number, number] = [0, 0, 0]; // Default rotation (no rotation)

//     if (active === id) {
//       // Card is active (clicked)
//       targetPosition = [0, 4.5, 0];
//       smoothTime = 0.4;
//       const intensity = 0.25;
//       const rotationX = mousePos.y * intensity;
//       const rotationY = mousePos.x * intensity;
//       targetRotation = [
//         -Math.PI / 2 - rotationX,
//         card.isFlipped ? rotationY : rotationY,
//         0,
//       ];

//     } else if (isReturning) {
//       // Card is returning from active to inactive
//       const zClose = Math.abs(groupRef.current.position.z - targetZ) < 0.01;
//       if (!zClose) {
//         // Stage 1: Animate z to targetZ, hold y at 5
//         easing.damp(groupRef.current.position, "z", targetZ, 0.15, delta);
//         groupRef.current.position.y = 2;
//         targetPosition = [groupRef.current.position.x, 5, targetZ];
//       } else {
//         // Stage 2: Animate y to targetY
//         easing.damp(groupRef.current.position, "y", targetY, 0.15, delta);
//         targetPosition = [groupRef.current.position.x, targetY, targetZ];
//         if (Math.abs(groupRef.current.position.y - targetY) < 0.1) {
//           setIsReturning(false); // Transition complete
//         }
//       }
//       smoothTime = 0.15;
//       targetRotation = [0, 0, 0]; // Reset rotation during return
//     } else {
//       // Card is in stacking mode (default values suffice)
//       targetPosition = [0, targetY, targetZ];
//       smoothTime = 0.3;
//       targetRotation = [0, 0, 0];
//     }

//     // Animate position and rotation with guaranteed values
//     easing.damp3(groupRef.current.position, targetPosition, smoothTime, delta);
//     easing.damp3(rotationRef.current, targetRotation, active ? 0.2 : 0.15, delta);

//     groupRef.current.rotation.set(
//       rotationRef.current.x,
//       rotationRef.current.y,
//       rotationRef.current.z
//     );
//   });

//   return (
//     <group ref={groupRef} position={initialPos}>
//       {/* BASE CARD */}
//       <mesh
//         onPointerOver={pointerOver}
//         onPointerOut={pointerOut}
//         ref={meshRef}
//         geometry={geometry}
//         receiveShadow
//         castShadow
//         onClick={click}
//       >
//         <meshPhysicalMaterial color={selectedVariant.cardColor} opacity={1} />
//         {/* FRONT ILLUSTRATION */}
//         <Decal receiveShadow={active ? false : true} position={[0.02, 0, 0]} scale={[1, 1.75, 0.1]}>
//           <meshPhysicalMaterial
//             polygonOffset
//             polygonOffsetFactor={-1}
//             map={bookmark}
//             roughness={0.9}
//             metalness={0.1}
//             side={THREE.DoubleSide}
//           />
//         </Decal>
//         {/* BACK ILLUSTRATION */}
//         <Decal
//           receiveShadow={active ? false : true}
//           position={[0, 0, -0.04]}
//           scale={[1, 1.75, 0.1]}
//           rotation={[0, Math.PI, 0]}
//         >
//           <meshPhysicalMaterial
//             polygonOffset
//             polygonOffsetFactor={-1}
//             map={bookmark}
//             roughness={0.9}
//             metalness={0.1}
//             side={THREE.DoubleSide}
//           />
//         </Decal>
//       </mesh>
//       {/* FRONT FOIL */}
//       <mesh geometry={planeGeometry} position={[0, 0, 0.03]}>
//         <meshPhysicalMaterial
//           transparent
//           roughness={0.1}
//           metalness={0.8}
//           reflectivity={0.8}
//           sheen={1}
//           map={foil}
//           normalMap={normalMap}
//           normalScale={new THREE.Vector2(0.1, 0.1)}
//           envMap={envMap.map}
//           envMapIntensity={envMap.intensity}
//           envMapRotation={envMap.rotation}
//         />
//       </mesh>
//       {/* BACK FOIL */}
//       <mesh geometry={planeGeometry} rotation={[0, Math.PI, 0]} position={[0, 0, -0.01]}>
//         <meshPhysicalMaterial
//           side={THREE.DoubleSide}
//           transparent
//           roughness={0.1}
//           metalness={0.8}
//           reflectivity={0.8}
//           sheen={1}
//           map={foil}
//           normalMap={normalMap}
//           normalScale={new THREE.Vector2(0.1, 0.1)}
//           envMap={envMap.map}
//           envMapIntensity={envMap.intensity}
//           envMapRotation={envMap.rotation}
//         />
//       </mesh>
//     </group>
//   );
// };

// export default Card;