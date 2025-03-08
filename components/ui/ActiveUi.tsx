"use client"

import { CardType } from "@/app/definitions";
import { Dispatch, SetStateAction } from "react";
import { useState, useEffect } from "react";
import { BiPound, BiDollar, BiEuro } from "react-icons/bi"
import NumberFlow from "@number-flow/react"

interface ActiveUiProps {
  cardArr: CardType[];
  active: number | null;
  setActive: Dispatch<SetStateAction<number | null>>;
}

export default function ActiveUi({ cardArr, active, setActive }: ActiveUiProps) {
  const [activeCard, setActiveCard] = useState<CardType | null>(null)
  const [activeCurrency, setActiveCurrency] = useState({ name: "usd", value: 8.43, symbol: '$' })

  const currencies = [
    {
      name: 'usd',
      icon: <BiDollar />,
      value: 8.43,
      symbol: '$'
    },
    {
      name: 'gbp',
      icon: <BiPound />,
      value: 6.53,
      symbol: '£'
    },
    {
      name: 'eur',
      icon: <BiEuro />,
      value: 7.79,
      symbol: '€'
    },
  ]

  useEffect(() => {
    if (active === null) {
      setTimeout(() => {
        setActiveCard(null);
      }, 300);
      return;
    }
    const foundCard = cardArr.find((card) => card.id === active) || null;
    setActiveCard(foundCard);
  }, [active]);

  const animation = `transition ease-in-out ${active ? "opacity-100 translate-y-0 delay-700 duration-700" : "opacity-0 translate-y-2 duration-300"}`;

  return (
    <div className={`fixed h-full w-full border border-black flex justify-between z-30 p-14 ${active ? "pointer-events-auto" : "pointer-events-none"} bg-gradient-to-b from-transparent to-[${activeCard?.cardColor}]`}>

      {/* LEFT */}
      <div className={`flex flex-col justify-between h-full w-1/4 relative ${animation}`}>
        <h2 className={`flex text-5xl font-thin flex-row`}>
          {activeCard?.name}
        </h2>
        <div className={`h-2/3 relative overflow-scroll text-sm/4 leading-tight flex flex-col `}>
          <p>

            This mini bookmark is the perfect companion for any reader!<br /><br />

            My “I’m well-read” design is inspired by my book club, the Wellread book club. Being “well-read” can mean many different things, but I associate it with reading from a wide variety of genres… which is our goal for the book club. Each month, we read a book from a different genre. <br /><br />

            I thought it would be fun to design a mini bookmark that we could use for the books we read for the book club, or any of our books!<br /><br />

            <span className="italic">You don’t have to be a member of the book club to purchase this item. I just want to make that clear :)</span><br /><br />

            I also think of a well-read book is a book that has been annotated, dog eared, highlighted, or underlined. If you’re that kind of reader, then this book mark is perfect for you!<br /><br />


            This mini bookmark is printed on thick high quality paper, has gold-foil accents, and a nice buttery matte finish. It's also double-sided, so whichever way you place it in your book you'll have a lovely design to see.
          </p>        </div>

        <button onClick={() => setActive(null)} className={`size-12 w-full border-neutral-800 border ${animation} ml-auto`}></button>
      </div>

      {/* RIGHT */}
      <div className={`flex flex-col justify-between h-full w-1/4 relative ${animation}`}>
        <button onClick={() => setActive(null)} className={`size-12 border-neutral-800 border ml-auto`}></button>

        <div className=" flex w-full h-2/3 p-4 pb-0">
          <ul className="flex flex-col gap-6 w-full relative justify-between ">
            <li className="">Dimensions</li>
            <li className="">Colors </li>
            <li className="">Materials</li>
            <li className="text-5xl ml-auto font-medium justify-between flex flex-row w-full items-end p-1">
              <NumberFlow
                value={activeCurrency.value}
                prefix={activeCurrency.symbol}
              />
              <div className="flex flex-row text-xl my-1">
                {currencies.map((currency) =>
                  <button
                    onClick={() => {
                      setActiveCurrency({
                        name: currency.name,
                        value: currency.value,
                        symbol: currency.symbol
                      })
                    }}
                    className={`${activeCurrency.name === currency.name ? "opacity-100" : "opacity-50"} transition-opacity `}
                  >
                    {currency.icon}
                  </button>
                )}
              </div>
            </li>
          </ul>
        </div>

        {activeCard?.inStock ?
          <button onClick={() => setActive(null)} className={`group relative size-12 w-full rounded-full border-neutral-800 border overflow-hidden p-0`}>
            <div className="flex flex-col group-hover:-translate-y-12 transition ease-in-out duration-300">
              <div className="h-12 w-full flex justify-center items-center">
                Buy now
              </div>
              <div className="bg-black text-white h-12 w-full flex justify-center items-center">
                Buy now
              </div>
            </div>
          </button>
          :
          <button
            className={`h-12 w-full rounded-full border-black/30 text-black/50 opacity-80 border ustify-center items-center hover:cursor-not-allowed`}
          >
            Out of stock
          </button>
        }
      </div>

      {/* <div className={`flex justify-end items-end ml-auto `}>{active} / 8</div> */}
    </div>
  )
}
