"use client"

import { useState } from "react"
import Experience from "@/components/Experience"
import { Canvas } from "@react-three/fiber"
import { CardType } from "./definitions"
import ActiveUi from "@/components/ui/ActiveUi"
import LoadingScreen from "@/components/LoadingScreen"

export default function Home() {
  const [active, setActive] = useState<number | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  const cardArr: CardType[] = [
    {
      id: 1,
      // color: "#141414"
      // color: "#91b4cc"
      color: "#aecae3"
    },
    {
      id: 2,
      // color: "#242424"
      // color: "#91b4cc"
      color: "#aecae3"
    },
    {
      id: 3,
      // color: "#343434"
      // color: "#91b4cc"
      color: "#aecae3"
    },
    {
      id: 4,
      // color: "#444444"
      // color: "#91b4cc"
      color: "#aecae3"
    },
    {
      id: 5,
      // color: "#545454"
      // color: "#91b4cc"
      color: "#aecae3"
    },
    {
      id: 6,
      // color: "#646464"
      // color: "#91b4cc"
      color: "#aecae3"
    },
    {
      id: 7,
      // color: "#747474"
      // color: "#91b4cc"
      color: "#aecae3"
    },
    {
      id: 8,
      // color: "#848484"
      // color: "#91b4cc"
      color: "#aecae3"
    },
    {
      id: 9,
      // color: "#848484"
      // color: "#91b4cc"
      color: "#aecae3"
    },
    {
      id: 10,
      // color: "#848484"
      // color: "#91b4cc"
      color: "#aecae3"
    }
  ]

  return (
    <main className={`h-dvh w-dvw bg-gradient-to-b from-transparent to-neutral-500 relative`}>
      <ActiveUi active={active} setActive={setActive} cardArr={cardArr} />

      {!isLoaded && <LoadingScreen onLoaded={() => setIsLoaded(true)} />}

      <Canvas className="fixed z-20" shadows flat dpr={[1, 1.5]} camera={{ position: [0, 2, 8], fov: 30, near: 1, far: 30 }}>
        <Experience cardArr={cardArr} active={active} setActive={setActive} isLoaded={isLoaded} />
      </Canvas>
    </main>
  )
}

