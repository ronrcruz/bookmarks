"use client"

import { useState, useEffect } from "react"
import { CardType } from "./definitions"
import DesktopScene from "@/components/desktop/DesktopScene"
import MobileScene from "@/components/mobile/MobileScene"

export default function Home() {
  const [active, setActive] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => setIsMobile(window.innerWidth <= 599);
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const [cardArr, setCardArr] = useState<CardType[]>(
    [
      {
        id: 1,
        colorVariations: [
          {
            colorName: "Blue",
            cardColor: "#adc8e0",
            bgColor: "#91b2cf",
            illustration: {
              front: "",
              back: "",
            },
            foilColor: "silver"
          },
          {
            colorName: "Green",
            cardColor: "#50523c",
            bgColor: "#50523c",
            illustration: {
              front: "",
              back: "",
            },
            foilColor: "silver"
          },
          {
            colorName: "Black",
            cardColor: "#2b2826",
            bgColor: "#2b2826",
            illustration: {
              front: "",
              back: "",
            },
            foilColor: "gold"
          },
        ],
        foil: {
          front: "",
          back: ""
        },
        normalMap: "",
        sheenColor: "",
        name: "Blue Fern",
        info: (
          <p>
            This mini bookmark is the perfect companion for any reader!<br /><br />

            My “I&#39;m well-read” design is inspired by my book club, the Wellread book club. Being “well-read” can mean many different things, but I associate it with reading from a wide variety of genres… which is our goal for the book club. Each month, we read a book from a different genre. <br /><br />

            I thought it would be fun to design a mini bookmark that we could use for the books we read for the book club, or any of our books!<br /><br />

            <span className="italic">You don&#39;t have to be a member of the book club to purchase this item. I just want to make that clear :)</span><br /><br />

            I also think of a well-read book is a book that has been annotated, dog eared, highlighted, or underlined. If you&#39;re that kind of reader, then this book mark is perfect for you!<br /><br />

            This mini bookmark is printed on thick high quality paper, has gold-foil accents, and a nice buttery matte finish. It&#39;s also double-sided, so whichever way you place it in your book you&#39;ll have a lovely design to see.
          </p>
        ),
        inStock: true,
        isFlipped: false,
        selectedVariantIndex: 0
      },
      {
        id: 2,
        colorVariations: [
          {
            colorName: "",
            cardColor: "#adc8e0",
            bgColor: "#91b2cf",
            illustration: {
              front: "",
              back: "",
            },
            foilColor: "gold"
          }
        ],
        foil: {
          front: "",
          back: ""
        },
        normalMap: "",
        sheenColor: "",
        name: "Dark Blue Oak",
        info: (<p></p>),
        inStock: false,
        isFlipped: false,
        selectedVariantIndex: 0
      },
      {
        id: 3,
        colorVariations: [
          {
            colorName: "",
            cardColor: "#adc8e0",
            bgColor: "#91b2cf",
            illustration: {
              front: "",
              back: "",
            },
            foilColor: "gold"
          }
        ],
        foil: {
          front: "",
          back: ""
        },
        normalMap: "",
        sheenColor: "",
        name: "I'm well-read",
        info: (<p></p>),
        inStock: false,
        isFlipped: false,
        selectedVariantIndex: 0
      },
      {
        id: 4,
        colorVariations: [
          {
            colorName: "",
            cardColor: "#adc8e0",
            bgColor: "#91b2cf",
            illustration: {
              front: "",
              back: "",
            },
            foilColor: "gold"
          }
        ],
        foil: {
          front: "/bookmark-foil.png",
          back: ""
        },
        normalMap: "/NormalMap4.png",
        sheenColor: "",
        name: "Van Gogh's Book",
        info: (<p></p>),
        inStock: false,
        isFlipped: false,
        selectedVariantIndex: 0
      },
      {
        id: 5,
        colorVariations: [
          {
            colorName: "",
            cardColor: "#adc8e0",
            bgColor: "#91b2cf",
            illustration: {
              front: "",
              back: "",
            },
            foilColor: "gold"
          }
        ],
        foil: {
          front: "",
          back: ""
        },
        normalMap: "",
        sheenColor: "",
        name: "Penguin's Book",
        info: (<p></p>),
        inStock: false,
        isFlipped: false,
        selectedVariantIndex: 0
      },
      {
        id: 6,
        colorVariations: [
          {
            colorName: "",
            cardColor: "#adc8e0",
            bgColor: "#91b2cf",
            illustration: {
              front: "",
              back: "",
            },
            foilColor: "gold"
          }
        ],
        foil: {
          front: "",
          back: ""
        },
        normalMap: "",
        sheenColor: "",
        name: "Golden Fox",
        info: (<p></p>),
        inStock: false,
        isFlipped: false,
        selectedVariantIndex: 0
      },
      {
        id: 7,
        colorVariations: [
          {
            colorName: "",
            cardColor: "#adc8e0",
            bgColor: "#91b2cf",
            illustration: {
              front: "",
              back: "",
            },
            foilColor: "gold"
          }
        ],
        foil: {
          front: "",
          back: ""
        },
        normalMap: "",
        sheenColor: "",
        name: "Golden Snowman",
        info: (<p></p>),
        inStock: false,
        isFlipped: false,
        selectedVariantIndex: 0
      },
      {
        id: 8,
        colorVariations: [
          {
            colorName: "",
            cardColor: "#adc8e0",
            bgColor: "#91b2cf",
            illustration: {
              front: "",
              back: "",
            },
            foilColor: "gold"
          }
        ],
        foil: {
          front: "",
          back: ""
        },
        normalMap: "",
        sheenColor: "",
        name: "The Nutcracker",
        info: (<p></p>),
        inStock: false,
        isFlipped: false,
        selectedVariantIndex: 0
      },
      {
        id: 9,
        colorVariations: [
          {
            colorName: "",
            cardColor: "#adc8e0",
            bgColor: "#91b2cf",
            illustration: {
              front: "",
              back: "",
            },
            foilColor: "gold"
          }
        ],
        foil: {
          front: "",
          back: ""
        },
        normalMap: "",
        sheenColor: "",
        name: "Golden Readers",
        info: (<p></p>),
        inStock: false,
        isFlipped: false,
        selectedVariantIndex: 0
      },
      {
        id: 10,
        colorVariations: [
          {
            colorName: "",
            cardColor: "#adc8e0",
            bgColor: "#91b2cf",
            illustration: {
              front: "",
              back: "",
            },
            foilColor: "gold"
          }
        ],
        foil: {
          front: "",
          back: ""
        },
        normalMap: "",
        sheenColor: "",
        name: "Hello I'm",
        info: (<p></p>),
        inStock: false,
        isFlipped: false,
        selectedVariantIndex: 0
      },
      {
        id: 11,
        colorVariations: [
          {
            colorName: "",
            cardColor: "#adc8e0",
            bgColor: "#91b2cf",
            illustration: {
              front: "",
              back: "",
            },
            foilColor: "gold"
          }
        ],
        foil: {
          front: "",
          back: ""
        },
        normalMap: "",
        sheenColor: "",
        name: "Protagonist/Antagonist",
        info: (<p></p>),
        inStock: false,
        isFlipped: false,
        selectedVariantIndex: 0
      }
    ]
  )

  const flipCard = (cardId: number, isFlipped: boolean) => {
    setCardArr((prevState: CardType[]) =>
      prevState.map((card) =>
        card.id === cardId ? { ...card, isFlipped } : card
      )
    );
  };

  return (
    <main className="h-dvh w-dvw relative">
      {isMobile ? (
        <MobileScene
          cardArr={cardArr}
          setCardArr={setCardArr}
          active={active}
          setActive={setActive}
          isLoaded={isLoaded}
          setIsLoaded={setIsLoaded}
          flipCard={flipCard}
        />
      ) : (
        <DesktopScene
          cardArr={cardArr}
          setCardArr={setCardArr}
          active={active}
          setActive={setActive}
          isLoaded={isLoaded}
          setIsLoaded={setIsLoaded}
          flipCard={flipCard}
        />
      )}
    </main>
  )
}


