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

  // Initialize the window.__directFlipCard property
  useEffect(() => {
    // Create the property if it doesn't exist
    if (typeof window !== 'undefined') {
      window.__directFlipCard = null;
    }
  }, []);

  const [cardArr, setCardArr] = useState<CardType[]>(
    [
      {
        id: 1,
        name: "Blue Fern",
        colorVariations: [
          {
            colorName: "Blue",
            cardColor: "#adc8e0",
            bgColor: "#91b2cf",
            illustration: {
              front: "/fern/illustrations/blue.png",
              back: "/fern/illustrations/blue.png",
            },
            foilColor: "silver"
          },
          {
            colorName: "Green",
            cardColor: "#50523c",
            bgColor: "#50523c",
            illustration: {
              front: "/fern/illustrations/green.png",
              back: "/fern/illustrations/green.png",
            },
            foilColor: "gold"
          },
          {
            colorName: "Black",
            cardColor: "#2b2826",
            bgColor: "#2b2826",
            illustration: {
              front: "/fern/illustrations/black.png",
              back: "/fern/illustrations/black.png",
            },
            foilColor: "gold"
          },
        ],
        foil: {
          front: "/fern/foil/foil.png",
          back: "/fern/foil/foil.png",
        },
        normalMap: {
          front: "/fern/normal-maps/normal.png",
          back: "/fern/normal-maps/normal.png",
        },
        sheenColor: "",
        info: (
          <p>
            This mini bookmark is the perfect companion for any reader!<br /><br />

            My blue fern design is inspired by my love of nature and old books with ornate gold or silver foiling! Ive always had an eye for detail, so it was a joy to create this intricate design.<br /><br />

            This mini bookmark is printed on thick high quality paper, has gold-foil accents, and a nice buttery matte finish. Its also double-sided, so whichever way you place it in your book youll have a lovely design to see.
          </p>
        ),
        inStock: true,
        isFlipped: false,
        selectedVariantIndex: 0
      },
      {
        id: 2,
        name: "Dark Blue Oak",
        colorVariations: [
          {
            colorName: "Dark Blue",
            cardColor: "#adc8e0",
            bgColor: "#91b2cf",
            illustration: {
              front: "/oak/illustrations/blue.png",
              back: "/oak/illustrations/blue.png",
            },
            foilColor: "gold"
          },
          {
            colorName: "green",
            cardColor: "#adc8e0",
            bgColor: "#91b2cf",
            illustration: {
              front: "/oak/illustrations/green.png",
              back: "/oak/illustrations/green.png",
            },
            foilColor: "gold"
          },
          {
            colorName: "orange",
            cardColor: "#adc8e0",
            bgColor: "#91b2cf",
            illustration: {
              front: "/oak/illustrations/orange.png",
              back: "/oak/illustrations/orange.png",
            },
            foilColor: "gold"
          },
        ],
        foil: {
          front: "",
          back: ""
        },
        normalMap: {
          front: "",
          back: "",
        },
        sheenColor: "",
        info: (
          <p>
            This mini bookmark is the perfect companion for any reader!<br /><br />

            My green oak design is inspired by my love of nature and (specifically) one of my favorite types of trees!<br /><br />

            This mini bookmark is printed on thick high quality paper, has gold-foil accents, and a nice buttery matte finish. Its also double-sided, so whichever way you place it in your book yol have a lovely design to see.
          </p>
        ),
        inStock: false,
        isFlipped: false,
        selectedVariantIndex: 0
      },
      {
        id: 3,
        name: "Im well-read",
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
        normalMap: {
          front: "",
          back: "",
        },
        sheenColor: "",
        info: (
          <p>
            This mini bookmark is the perfect companion for any reader!<br /><br />

            My well-redesign is inspired by my book club, the Wellread book club. Bein can mean many different things, but I associate it with reading from a wide variety of genres… which is our goal for the book club. Each month, we read a book from a different genre. <br /><br />

            I thought it would be fun to design a mini bookmark that we could use for the books we read for the book club, or any of our books!<br /><br />

            <span className="italic font-serif">You dve to be a member of the book club to purchase this item. I just want to make that clear :)</span><br /><br />

            I also think of a well-read book is a book that has been annotated, dog eared, highlighted, or underlined. If yoe that kind of reader, then this book mark is perfect for you!<br /><br />

            This mini bookmark is printed on thick high quality paper, has gold-foil accents, and a nice buttery matte finish. Italso double-sided, so whichever way you place it in your book y have a lovely design to see.
          </p>
        ),
        inStock: false,
        isFlipped: false,
        selectedVariantIndex: 0
      },
      {
        id: 4,
        name: "Van Gogh Book",
        colorVariations: [
          {
            colorName: "",
            cardColor: "#adc8e0",
            bgColor: "#91b2cf",
            illustration: {
              front: "",
              back: "",
            },
            foilColor: "silver"
          }
        ],
        foil: {
          front: "",
          back: ""
        },
        normalMap: {
          front: "",
          back: ""
        },
        sheenColor: "",
        info: (
          <p>
            This mini bookmark is the perfect companion for any reader!<br /><br />

            This mini bookmark is printed on thick high quality paper, has silver-foil accents, and a nice buttery matte finish. also double-sided, so whichever way you place it in your book y have a lovely design to see.
          </p>
        ),
        inStock: false,
        isFlipped: false,
        selectedVariantIndex: 0
      },
      {
        id: 5,
        name: "Pengui Book",
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
        normalMap: {
          front: "",
          back: "",
        },
        sheenColor: "",
        info: (
          <p>
            This mini bookmark is the perfect companion for any reader and any book!<br /><br />

            Do you ever think about how your book might feel when you hold it? No... just me? Regardless, I thought it would be sweet to make this design in honor of whichever book you place it in :)<br /><br />

            This mini bookmark is printed on thick high quality paper, has gold-foil accents, and a nice buttery matte finish. lso double-sided, so whichever way you place it in your bookl have a lovely design to see.
          </p>
        ),
        inStock: false,
        isFlipped: false,
        selectedVariantIndex: 0
      },
      {
        id: 6,
        name: "GOLDEN Fox",
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
        normalMap: {
          front: "",
          back: "",
        },
        sheenColor: "",
        info: (
          <p>
            This mini bookmark is the perfect companion for any reader!<br /><br />

            My GOLDEN Fox design is inspired by my love of nature and folklore.<br /><br />

            This mini bookmark is printed on thick high quality paper, has gold-foil accents, and a nice buttery matte finish. It&apos;s also double-sided, so whichever way you place it in your book you&apos;ll have a lovely design to see.
          </p>
        ),
        inStock: false,
        isFlipped: false,
        selectedVariantIndex: 0
      },
      {
        id: 7,
        name: "GOLDEN Snowman",
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
          },
          {
            colorName: "",
            cardColor: "#adc8e0",
            bgColor: "#91b2cf",
            illustration: {
              front: "",
              back: "",
            },
            foilColor: "silver"
          },
        ],
        foil: {
          front: "",
          back: ""
        },
        normalMap: {
          front: "",
          back: "",
        },
        sheenColor: "",
        info: (
          <p>
            This mini bookmark is the perfect companion for any reader!<br /><br />

            My GOLDEN Snowman design is inspired by my love for (and addiction to buying) adorable ornaments! Naturally, I couldnt help but paint a book in his little snowy hands. In my mind, everyone is a reader... even snowmen!<br /><br />

            This mini bookmark is printed on thick high quality paper, has gold-foil accents, and a nice buttery matte finish. Its also double-sided, so whichever way you place it in your book youll have a lovely design to see.
          </p>
        ),
        inStock: false,
        isFlipped: false,
        selectedVariantIndex: 0
      },
      {
        id: 8,
        name: "The Nutcracker",
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
        normalMap: {
          front: "",
          back: "",
        },
        sheenColor: "",
        info: (
          <p>
            This mini bookmark is the perfect companion for any reader!<br /><br />

            My Nutcracker design is inspired by E.T.A. Hoffmans classic story. Ive collected Nutcrackers for many years, because they are one of my favorite holiday decorations. I love that each nutcracker feels as if they have their own personality and story. The nutcracker I painted for this bookmark loves to read... if you couldnt tell by looking at him :)<br /><br />

            This mini bookmark is printed on thick high quality paper, has gold-foil accents, and a nice buttery matte finish. Its also double-sided, so whichever way you place it in your book youll have a lovely design to see.
          </p>
        ),
        inStock: false,
        isFlipped: false,
        selectedVariantIndex: 0
      },
      {
        id: 9,
        name: "Golden Readers",
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
        normalMap: {
          front: "",
          back: "",
        },
        sheenColor: "",
        info: (
          <p>
            This mini bookmark is the perfect companion for any reader!<br /><br />

            My golden readers design is inspired by Matisse ink sketches. Ive always had a passion for art history, so to make these Matisse figures into readers was a joy!<br /><br />

            Im also a huge fan of typography, so the repeat pattern of the work &quot;BOOKS&quot; makes my graphic design loving heart very happy!<br /><br />

            This mini bookmark is printed on thick high quality paper, has gold-foil accents, and a nice buttery matte finish. Its also double-sided, so whichever way you place it in your book youll have a lovely design to see.
          </p>
        ),
        inStock: false,
        isFlipped: false,
        selectedVariantIndex: 0
      },
      {
        id: 10,
        name: "Hello Im",
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
        normalMap: {
          front: "",
          back: "",
        },
        sheenColor: "",
        info: (
          <p>
            This mini bookmark is the perfect companion for any book nerd!<br /><br />

            I&apos;ve had the idea for this bookmark design for quite a while, and it was so much fun to finally bring it to life!<br /><br />

            Picture this: you&apos;re in the middle of reading a book, when someone interrupts and starts talking to you. Simply hold up your bookmark and they will hopefully get the hint to leave you and your book in peace :P<br /><br />

            This mini bookmark is printed on thick high quality paper, has gold-foil accents, and a nice buttery matte finish. It&apos;s also double-sided, so whichever way you place it in your book you&apos;ll have a lovely design to see.
          </p>
        ),
        inStock: false,
        isFlipped: false,
        selectedVariantIndex: 0
      },
      {
        id: 11,
        name: "Protagonist/Antagonist",
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
        normalMap: {
          front: "",
          back: "",
        },
        sheenColor: "",
        info: (
          <p>
            This mini bookmark is the perfect companion for any protagonist OR antagonist!<br /><br />

            With this bookmark, you must choose: protagonist or antagonist... Will you join the dark side, or will you be the hero of your own story?<br /><br />

            Side note: I truly love this design and how you can flip between the dark and the light!<br /><br />

            This mini bookmark is printed on thick high quality paper, has gold-foil accents, and a nice buttery matte finish. It&apos;s also double-sided, so whichever way you place it in your book you&apos;ll have a lovely design to see.
          </p>
        ),
        inStock: false,
        isFlipped: false,
        selectedVariantIndex: 0
      }
    ]
  )

  const flipCard = (cardId: number, isFlipped: boolean) => {
    console.log(`[FLIP CARD] Card ${cardId} flipping to ${isFlipped ? 'back' : 'front'}`);
    setCardArr((prevState: CardType[]) =>
      prevState.map((card) =>
        card.id === cardId ? { ...card, isFlipped } : card
      )
    );
  };

  return (
    <div className="h-full w-full overflow-hidden">
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
    </div>
  )
}


