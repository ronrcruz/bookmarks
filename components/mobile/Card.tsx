"use client";

import { useFrame, useLoader } from "@react-three/fiber";
import { useRef, useMemo, useState, Dispatch, SetStateAction, useEffect } from "react";
import * as THREE from "three";
import { easing } from "maath";
import { useTexture, Decal } from "@react-three/drei";
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
  cardPos: number;
  active: number | null;
  setActive: Dispatch<SetStateAction<number | null>>;
  isLoaded: boolean;
}

const Card = ({ card, id, cardPos, active, setActive, isLoaded }: CardProps) => {
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
  const initialPos = useMemo(() => new THREE.Vector3(0, cardPos * 0.25, cardPos * -0.2 + 4.5), [cardPos]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const rotationRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const selectedVariant = card.colorVariations[card.selectedVariantIndex];

  const [bookmark, foil, normalMap] = useTexture(["/bookmark.png", "/foil.png", "/NormalMap.png",]);


  const goldEnvMao = {
    map: useLoader(RGBELoader, "/pretville_cinema_1k.hdr"),
    rotation: new THREE.Euler(0.4, 0, 0.1),
    intensity: 3
  }

  const silverEnvMap = {
    map: useLoader(RGBELoader, "/st_peters_square_night_1k.hdr"),
    rotation: new THREE.Euler(-0.3, 0.3, 1.2),
    intensity: 4
  }

  const envMap = selectedVariant.foilColor === "gold" ? goldEnvMao : silverEnvMap

  bookmark.minFilter = THREE.LinearFilter;
  bookmark.magFilter = THREE.LinearFilter;
  bookmark.anisotropy = 16;
  bookmark.generateMipmaps = true;
  // bookmark.offset.set(0.02, 0);

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
  const click = (e: { stopPropagation: () => void }) => (
    e.stopPropagation(),
    !active ? setActive(id) : setActive(null),
    setHover(false)
  );


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
        targetPosition = [0, 5, 0];
        smoothTime = 0.35;
        intensity = 0.25;
        const rotationX = mousePos.y * intensity;
        const rotationY = mousePos.x * intensity;
        targetRotation = [
          -Math.PI / 2 - rotationX,
          card.isFlipped ? rotationY : rotationY,
          0
        ];
      } else {
        targetPosition = [initialPos.x, initialPos.y, initialPos.z];
        smoothTime = 0.1
        targetRotation = [0, 0, 0];
      }

      // GROUP POSITION ANIMATION
      easing.damp3(groupRef.current.position, targetPosition, smoothTime, delta);

      // GROUP ROTATION ANIMATION
      easing.damp3(rotationRef.current, targetRotation, active ? 0.2 : 0.175, delta);

      groupRef.current.rotation.set(
        rotationRef.current.x,
        rotationRef.current.y,
        rotationRef.current.z
      );

      // CAMERA POSITION ANIMATION
      if (!isLoaded) {
        easing.damp3(state.camera.position, [state.camera.position.x, 30, 0], 2.0, delta);
      } else {
        if (active) {
          easing.damp3(state.camera.position, [state.camera.position.x, 9, 0], 3.0, delta);
        } else {
          easing.damp3(state.camera.position, [state.camera.position.x, 3, 7], 1.0, delta);
        }
      }
    }
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
        <meshPhysicalMaterial
          color={selectedVariant.cardColor}
          opacity={1}
        />

        {/* FRONT ILLUSTRATION */}
        <Decal
          receiveShadow={active ? false : true}
          position={[0.02, 0, 0]}
          scale={[1, 1.75, 0.1]}
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
      </mesh >

      {/* FRONT FOIL */}
      < mesh geometry={planeGeometry} position={[0, 0, 0.03]} >
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
      </mesh >
      {/* BACK FOIL */}
      < mesh geometry={planeGeometry} rotation={[0, Math.PI, 0]} position={[0, 0, -0.01]} >
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
      </mesh >
    </group >
  );
};

export default Card;

// "use client";

// import { useFrame, useLoader, useThree } from "@react-three/fiber";
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
//   cardPos: number;
//   color: string;
//   active: number | null;
//   setActive: Dispatch<SetStateAction<number | null>>;
//   isLoaded: boolean;
//   cards: CardType[];
//   scroll: any; // For ScrollControls
// }

// const Card = ({
//   card,
//   id,
//   cardPos,
//   color,
//   active,
//   setActive,
//   isLoaded,
//   cards,
//   scroll
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

//   // Get scroll data from drei's useScroll hook
//   const data = useScroll();
//   const { size } = useThree();

//   // Calculate card position based on scroll
//   const spacing = 1.8; // Space between cards

//   // Initial position with proper spacing
//   const initialPos = useMemo(() => {
//     return new THREE.Vector3(
//       cardPos * spacing - (cards.length * spacing) / 2 + spacing / 2,
//       0,
//       0
//     );
//   }, [cardPos, spacing]);

//   const selectedVariant = card.colorVariations[card.selectedVariantIndex];
//   const [bookmark, foil, normalMap] = useTexture(["/bookmark.png", "/foil.png", "/NormalMap.png",]);
//   const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
//   const rotationRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
//   const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);

//   useEffect(() => {
//     if (typeof window !== 'undefined') {
//       const handleResize = () => setWindowWidth(window.innerWidth);
//       window.addEventListener("resize", handleResize);
//       setWindowWidth(window.innerWidth);
//       return () => window.removeEventListener("resize", handleResize);
//     }
//   }, []);

//   const goldEnvMao = {
//     map: useLoader(RGBELoader, "/pretville_cinema_1k.hdr"),
//     rotation: new THREE.Euler(0.4, 0, 0.1),
//     intensity: 3
//   }

//   const silverEnvMap = {
//     map: useLoader(RGBELoader, "/st_peters_square_night_1k.hdr"),
//     rotation: new THREE.Euler(-0.3, 0.3, 1.2),
//     intensity: 4
//   }

//   const envMap = selectedVariant.foilColor === "gold" ? goldEnvMao : silverEnvMap

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
//   const click = (e: { stopPropagation: () => void }) => (
//     e.stopPropagation(),
//     !active ? setActive(id) : setActive(null),
//     setHover(false)
//   );

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

//     if (active === id) {
//       // Card is active (clicked)
//       const targetPosition: [number, number, number] = [0, 5, 0];
//       const smoothTime = 0.35;
//       const intensity = 0.25;
//       const rotationX = mousePos.y * intensity;
//       const rotationY = mousePos.x * intensity;
//       const targetRotation: [number, number, number] = [
//         -Math.PI / 2 - rotationX,
//         card.isFlipped ? rotationY : rotationY,
//         0
//       ];

//       // Animate position and rotation
//       easing.damp3(groupRef.current.position, targetPosition, smoothTime, delta);
//       easing.damp3(rotationRef.current, targetRotation, 0.2, delta);

//       // Camera animation
//       easing.damp3(state.camera.position, [state.camera.position.x, 9, 0], 3.0, delta);
//     } else if (data) {
//       // Calculate scroll offset
//       const scrollOffset = data.offset;

//       // Each card is positioned based on its index relative to the scroll
//       const visibleCards = 3; // Number of cards visible at once
//       const totalWidth = cards.length * spacing;
//       const scrollX = scrollOffset * totalWidth;

//       // Calculate x position adjusted for scroll
//       let x = initialPos.x + scrollX;

//       // Calculate distance from center
//       const centerX = 0;
//       const distanceFromCenter = Math.abs(x - centerX);

//       // Calculate depth based on distance from center (further from center = further back)
//       const z = -distanceFromCenter * 0.5;

//       // Elevate the card if it's close to center
//       const isCenterCard = distanceFromCenter < spacing / 3;
//       const y = isCenterCard ? 0.3 : 0;

//       // Rotate slightly based on position relative to center
//       const rotationY = (x - centerX) * 0.1;

//       // Apply positions and rotations
//       const targetPosition: [number, number, number] = [x, y, z];
//       const targetRotation: [number, number, number] = [0, rotationY, 0];

//       easing.damp3(groupRef.current.position, targetPosition, 0.15, delta);
//       easing.damp3(rotationRef.current, targetRotation, 0.15, delta);

//       // Camera position
//       if (isLoaded) {
//         easing.damp3(state.camera.position, [state.camera.position.x, 3, 7], 1.0, delta);
//       } else {
//         easing.damp3(state.camera.position, [state.camera.position.x, 30, 0], 2.0, delta);
//       }
//     }

//     // Apply rotation
//     if (groupRef.current) {
//       groupRef.current.rotation.set(
//         rotationRef.current.x,
//         rotationRef.current.y,
//         rotationRef.current.z
//       );
//     }
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
//         <Decal
//           receiveShadow={active ? false : true}
//           position={[0.02, 0, 0]}
//           scale={[1, 1.75, 0.1]}
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
//       </mesh >

//       {/* FRONT FOIL */}
//       < mesh geometry={planeGeometry} position={[0, 0, 0.03]} >
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
//       </mesh >
//       {/* BACK FOIL */}
//       < mesh geometry={planeGeometry} rotation={[0, Math.PI, 0]} position={[0, 0, -0.01]} >
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
//       </mesh >
//     </group >
//   );
// };

// export default Card;