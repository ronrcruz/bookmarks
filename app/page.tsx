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
      cardColor: "#aecae3",
      bgColor: "#91b2cf",
      illustration: "",
      foil: "",
      foilColor: "gold",
      normalMap: "",
      sheenColor: "",
      name: "Blue Fern",
      info: (
        <p>
          This mini bookmark is the perfect companion for any reader!<br /><br />

          My “I’m well-read” design is inspired by my book club, the Wellread book club. Being “well-read” can mean many different things, but I associate it with reading from a wide variety of genres… which is our goal for the book club. Each month, we read a book from a different genre. <br /><br />

          I thought it would be fun to design a mini bookmark that we could use for the books we read for the book club, or any of our books!<br /><br />

          <span className="italic">You don’t have to be a member of the book club to purchase this item. I just want to make that clear :)</span><br /><br />

          I also think of a well-read book is a book that has been annotated, dog eared, highlighted, or underlined. If you’re that kind of reader, then this book mark is perfect for you!<br /><br />


          This mini bookmark is printed on thick high quality paper, has gold-foil accents, and a nice buttery matte finish. It's also double-sided, so whichever way you place it in your book you'll have a lovely design to see.
        </p>
      ),
      inStock: false,
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
      name: "Blue Fern",
      info: (<p></p>),
      inStock: false,
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
      name: "Blue Fern",
      info: (<p></p>),
      inStock: false,
    },
    {
      id: 4,
      cardColor: "#aecae3",
      bgColor: "#91b2cf",
      illustration: "/bookmark.png",
      foil: "/bookmark-foil.png",
      foilColor: "silver",
      normalMap: "/NormalMap4.png",
      sheenColor: "",
      name: "Blue Fern",
      info: (<p></p>),
      inStock: false,
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
      name: "Blue Fern",
      info: (<p></p>),
      inStock: false,
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
      name: "Blue Fern",
      info: (<p></p>),
      inStock: false,
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
      name: "Blue Fern",
      info: (<p></p>),
      inStock: false,
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
      name: "Blue Fern",
      info: (<p></p>),
      inStock: false,
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
      name: "Blue-Fern",
      info: (<p></p>),
      inStock: false,
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
      name: "Blue Fern",
      info: (<p></p>),
      inStock: false,
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

