"use client"

import { CardType } from "@/app/definitions";
import { Dispatch, SetStateAction } from "react";
import { useState, useEffect } from "react";

interface ActiveUiProps {
  cardArr: CardType[];
  active: number | null;
  setActive: Dispatch<SetStateAction<number | null>>;
}

export default function ActiveUi({ cardArr, active, setActive }: ActiveUiProps) {
  const [activeCard, setActiveCard] = useState<CardType | null>(null)

  useEffect(() => {
    if (active === null) {
      setActiveCard(null);
      return;
    }
    const foundCard = cardArr.find((card) => card.id === active) || null;
    setActiveCard(foundCard);
  }, [active]);

  console.log(activeCard)

  const animation = `transition ease-in-out ${active ? "opacity-100 translate-y-0 delay-700 duration-700" : "opacity-0 translate-y-2 duration-300"}`;

  return (
    <div className={`fixed h-full w-full flex z-30 p-16 ${active ? "pointer-events-auto" : "pointer-events-none"} bg-gradient-to-b from-transparent to-[${activeCard?.cardColor}]`}>
      <div className={`flex flex-col w-1/4 relative ${animation}`}>
        <h2 className="flex text-4xl h-1/4">Name</h2>
        <p className="h-1/2 overflow-scroll text-sm/4 leading-tight">

          This mini bookmark is the perfect companion for any reader!<br /><br />

          My “I’m well-read” design is inspired by my book club, the Wellread book club. Being “well-read” can mean many different things, but I associate it with reading from a wide variety of genres… which is our goal for the book club. Each month, we read a book from a different genre. <br /><br />

          I thought it would be fun to design a mini bookmark that we could use for the books we read for the book club, or any of our books!<br /><br />

          <span className="italic">You don’t have to be a member of the book club to purchase this item. I just want to make that clear :)</span><br /><br />

          I also think of a well-read book is a book that has been annotated, dog eared, highlighted, or underlined. If you’re that kind of reader, then this book mark is perfect for you!<br /><br />


          This mini bookmark is printed on thick high quality paper, has gold-foil accents, and a nice buttery matte finish. It's also double-sided, so whichever way you place it in your book you'll have a lovely design to see.
        </p>
      </div>
      <button onClick={() => setActive(null)} className={`h-16 w-16 ml-auto border-neutral-800 border ${animation}`}></button>

      {/* <div className={`flex justify-end items-end ml-auto `}>{active} / 8</div> */}
    </div>
  )
}
