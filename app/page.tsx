"use client"

import { useState } from "react"
import Experience from "@/components/Experience"
import { Canvas } from "@react-three/fiber"
import { CardType } from "./definitions"
import ActiveUi from "@/components/ui/ActiveUi"
import LoadingScreen from "@/components/LoadingScreen"
import { Euler } from "three"

export default function Home() {
  const [active, setActive] = useState<number | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  const cardArr: CardType[] = [
    {
      id: 1,
      cardColor: "#91b2cf",
      bgColor: "#91b2cf",
      illustration: "",
      foil: "",
      foilColor: "gold",
      normalMap: "",
      sheenColor: "",
      name: "",
      info: "",
    },
    {
      id: 2,
      cardColor: "#aecae3",
      bgColor: "#91b2cf",
      illustration: "",
      foil: "",
      foilColor: "gold",
      normalMap: "",
      sheenColor: "",
      name: "",
      info: "",
    },
    {
      id: 3,
      cardColor: "#aecae3",
      bgColor: "#91b2cf",
      illustration: "",
      foil: "",
      foilColor: "gold",
      normalMap: "",
      sheenColor: "",
      name: "",
      info: "",
    },
    {
      id: 4,
      cardColor: "#aecae3",
      bgColor: "#91b2cf",
      illustration: "/bookmark.png",
      foil: "/bookmark-foil.png",
      foilColor: "gold",
      normalMap: "/NormalMap4.png",
      sheenColor: "",
      name: "",
      info: "",
    },
    {
      id: 5,
      cardColor: "#aecae3",
      bgColor: "#91b2cf",
      illustration: "",
      foil: "",
      foilColor: "gold",
      normalMap: "",
      sheenColor: "",
      name: "",
      info: "",
    },
    {
      id: 6,
      cardColor: "#aecae3",
      bgColor: "#91b2cf",
      illustration: "",
      foil: "",
      foilColor: "gold",
      normalMap: "",
      sheenColor: "",
      name: "",
      info: "",
    },
    {
      id: 7,
      cardColor: "#aecae3",
      bgColor: "#91b2cf",
      illustration: "",
      foil: "",
      foilColor: "gold",
      normalMap: "",
      sheenColor: "",
      name: "",
      info: "",
    },
    {
      id: 8,
      cardColor: "#aecae3",
      bgColor: "#91b2cf",
      illustration: "",
      foil: "",
      foilColor: "gold",
      normalMap: "",
      sheenColor: "",
      name: "",
      info: "",
    },
    {
      id: 9,
      cardColor: "#aecae3",
      bgColor: "#91b2cf",
      illustration: "",
      foil: "",
      foilColor: "gold",
      normalMap: "",
      sheenColor: "",
      name: "",
      info: "",
    },
    {
      id: 10,
      cardColor: "#aecae3",
      bgColor: "#91b2cf",
      illustration: "",
      foil: "",
      foilColor: "gold",
      normalMap: "",
      sheenColor: "",
      name: "",
      info: "",
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

