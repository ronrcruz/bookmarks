"use client"

import { Dispatch, SetStateAction, useState } from "react"
import Card from "./ui/Card"
import { AccumulativeShadows, Environment, MeshReflectorMaterial, OrbitControls, RandomizedLight, ContactShadows } from "@react-three/drei"
import { CardType } from "@/app/definitions"

interface ExperienceProps {
  cardArr: CardType[];
  active: number | null;
  setActive: Dispatch<SetStateAction<number | null>>;
}

export default function Experience({ cardArr, active, setActive }: ExperienceProps) {

  return (
    <>
      <OrbitControls enableRotate={false} enableZoom={false} enablePan={false} />

      <ambientLight intensity={1} />
      <directionalLight castShadow intensity={1} position={[10, 6, 6]} shadow-mapSize={[1028, 1028]}></directionalLight>

      <Environment
        environmentIntensity={2}
        preset={active ? "sunset" : "city"}
        environmentRotation={active ? [Math.PI, Math.PI / 2, 0] : [0, 0, 0]}
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
