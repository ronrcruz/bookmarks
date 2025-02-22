"use client"

import { useState } from "react"
import Experience from "@/components/Experience"
import { Canvas } from "@react-three/fiber"
import { CardType } from "./definitions"
import ActiveUi from "@/components/ui/ActiveUi"

export default function Home() {
  const [active, setActive] = useState<number | null>(null)

  const cardArr: CardType[] = [
    {
      id: 1,
      // color: "#141414"
      color: "#a6d2ef"
    },
    {
      id: 2,
      // color: "#242424"
      color: "#a6d2ef"
    },
    {
      id: 3,
      // color: "#343434"
      color: "#a6d2ef"
    },
    {
      id: 4,
      // color: "#444444"
      color: "#a6d2ef"
    },
    {
      id: 5,
      // color: "#545454"
      color: "#a6d2ef"
    },
    {
      id: 6,
      // color: "#646464"
      color: "#a6d2ef"
    },
    {
      id: 7,
      // color: "#747474"
      color: "#a6d2ef"
    },
    {
      id: 8,
      // color: "#848484"
      color: "#a6d2ef"
    }
  ]
  return (
    <main className={`h-dvh w-dvw bg-gradient-to-b from-transparent to-neutral-500 relative`}>
      <ActiveUi active={active} setActive={setActive} cardArr={cardArr} />
      <Canvas className="fixed z-20" shadows flat dpr={[1, 1.5]} camera={{ position: [0, 2, 8], fov: 30, near: 1, far: 20 }}>
        <Experience cardArr={cardArr} active={active} setActive={setActive} />
      </Canvas>
    </main>
  )
}

