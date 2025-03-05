"use client"

import { Dispatch, SetStateAction, useMemo, useRef, useState } from "react"
import Card from "./ui/Card"
import { AccumulativeShadows, Environment, MeshReflectorMaterial, OrbitControls, RandomizedLight, ContactShadows } from "@react-three/drei"
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
  // const { scene } = useThree(); // Access the Three.js scene
  // const currentColor = useRef(new THREE.Color("#cccccc")); // Default background color

  // useFrame((state, delta) => {
  //   const targetColor = active !== null
  //     ? cardArr.find((card) => card.id === active)?.color || "#cccccc" // Target color from active card
  //     : "#cccccc"; // Default when no card is active

  //   // Animate background color
  //   easing.dampC(currentColor.current, targetColor, 0.5, delta); // 0.5 is the smoothing time
  //   scene.background = currentColor.current;
  // });

  const { scene } = useThree(); // Access the Three.js scene
  const currentBottomColor = useRef(new THREE.Color("#cccccc")); // Tracks the bottom color of the gradient
  const gradientCanvas = useRef(document.createElement("canvas")); // 2D canvas for the gradient
  const gradientTexture = useRef(new THREE.CanvasTexture(gradientCanvas.current));

  // Initialize the canvas size and texture
  useMemo(() => {
    gradientCanvas.current.width = 256; // Small width for performance, height defines gradient
    gradientCanvas.current.height = 256;
    gradientTexture.current = new THREE.CanvasTexture(gradientCanvas.current);
    gradientTexture.current.minFilter = THREE.LinearFilter;
    gradientTexture.current.magFilter = THREE.LinearFilter;
    scene.background = gradientTexture.current; // Set initial background
  }, [scene]);

  useFrame((state, delta) => {
    const targetBottomColor = active !== null
      ? cardArr.find((card) => card.id === active)?.color || "#cccccc" // Bottom color from active card
      : "#cccccc"; // Default when no card is active

    // Animate the bottom color of the gradient
    easing.dampC(currentBottomColor.current, targetBottomColor, 0.5, delta);

    // Update the gradient on the canvas
    const ctx = gradientCanvas.current.getContext("2d");
    if (ctx) {
      const gradient = ctx.createLinearGradient(0, 0, 0, gradientCanvas.current.height);
      gradient.addColorStop(0, "#cccccc"); // Top: neutral grey
      gradient.addColorStop(1, currentBottomColor.current.getStyle()); // Bottom: animated color

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, gradientCanvas.current.width, gradientCanvas.current.height);
    }

    // Mark the texture as needing an update
    gradientTexture.current.needsUpdate = true;
  });

  return (
    <>
      <OrbitControls enableRotate={false} enableZoom={false} enablePan={false} />

      <ambientLight intensity={1} />
      <directionalLight castShadow intensity={1} position={[10, 6, 6]} shadow-mapSize={[1028, 1028]}></directionalLight>

      <Environment
        environmentIntensity={2}
        preset={active ? "city" : "city"}
        environmentRotation={active ? [Math.PI, -Math.PI / 2, 0] : [0, 0, 0]}
      />

      {/* <pointLight castShadow intensity={20} position={[0, 3, 0]}></pointLight> */}

      {active &&
        <>
          <directionalLight castShadow intensity={0.01} position={[0, 44, 0]} shadow-mapSize={[1028, 1028]}></directionalLight>
          <directionalLight castShadow intensity={0.9} position={[10, 44, 0]} shadow-mapSize={[1028, 1028]}></directionalLight>
          <directionalLight castShadow intensity={0.9} position={[-10, 44, 0]} shadow-mapSize={[1028, 1028]}></directionalLight>
        </>
      }

      {/* <mesh receiveShadow position={[0, -0.75, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color={"#aaaaaa"} />
      </mesh> */}

      {/* <mesh receiveShadow position={[0, -0.75, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[50, 50]} />
        <MeshReflectorMaterial
          blur={[300, 30]}
          resolution={2048}
          mixBlur={1}
          mixStrength={180}
          roughness={1}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#0a0a0a"
          metalness={0.8}
          mirror={0}
        />
      </mesh> */}

      {cardArr.map((card, i) =>
        <Card
          key={card.id}
          id={card.id}
          cardPos={i - (cardArr.length - 1) / 2}
          color={card.color}
          totalCards={cardArr.length}
          active={active}
          setActive={setActive}
          isLoaded={isLoaded}
        />
      )}

      {/* <ContactShadows position={[0, -0.75, 0]} scale={12} resolution={512} far={5} opacity={8} /> */}

      {!active &&
        <AccumulativeShadows temporal frames={100} scale={12} alphaTest={0.8} position={[0, -(1.75 / 2), 0]} blend={100}>
          <RandomizedLight amount={8} radius={10} ambient={0.5} position={[2.5, 5, -5]} bias={0.001} />
        </AccumulativeShadows>
      }
    </>
  )
}
