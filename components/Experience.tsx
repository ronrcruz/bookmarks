"use client"

import { useState } from "react"
import Card from "./ui/Card"
import { AccumulativeShadows, Environment, MeshReflectorMaterial, OrbitControls, RandomizedLight, ContactShadows } from "@react-three/drei"
import { CardType } from "@/app/definitions"

export default function Experience({ cardArr }: { cardArr: CardType[] }) {
  const [active, setActive] = useState<number | null>(null)


  return (
    <>
      <OrbitControls enableRotate={false} enableZoom={false} enablePan={false} />

      <ambientLight intensity={3} />
      <directionalLight castShadow intensity={2} position={[10, 6, 6]} shadow-mapSize={[1028, 1028]}>
        {/* <orthographicCamera attach="shadow-camera" left={-20} right={20} top={20} bottom={-20} /> */}
      </directionalLight>

      <Environment preset="city" />

      {/* <pointLight castShadow intensity={20} position={[0, 3, 0]}></pointLight> */}


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
        <AccumulativeShadows temporal frames={100} scale={12} alphaTest={0.8} position={[0, -0.75, 0]} blend={100}>
          <RandomizedLight amount={8} radius={10} ambient={0.5} position={[2.5, 5, -5]} bias={0.001} />
        </AccumulativeShadows>
      }
    </>
  )
}
