"use client"

import { CardType } from "@/app/definitions";
import { Dispatch, SetStateAction } from "react";
import { useState, useEffect } from "react";
import { BiPound, BiDollar, BiEuro } from "react-icons/bi"
import { SiMaterialdesignicons } from "react-icons/si"
import { RxDimensions } from "react-icons/rx"
import NumberFlow from "@number-flow/react"
import { TfiClose } from "react-icons/tfi"

interface ActiveUiProps {
  cardArr: CardType[];
  active: number | null;
  setActive: Dispatch<SetStateAction<number | null>>;
  flipCard: (cardId: number, isFlipped: boolean) => void
}

export default function ActiveUi({ cardArr, active, setActive, flipCard }: ActiveUiProps) {
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

  const animation = `transition ease-in-out ${active ? "opacity-100 translate-y-0 duration-700 " : "opacity-0 translate-y-2 duration-300"}`;

  console.log(active, activeCard?.isFlipped)

  return (
    <div className={`fixed h-full w-full  flex justify-between z-30 p-14 ${active ? "pointer-events-auto" : "pointer-events-none"} bg-gradient-to-b from-transparent to-[${activeCard?.cardColor}]`}>

      {/* LEFT */}
      <div className={`flex flex-col justify-between h-full w-1/4 relative transition ease-in-out ${active ? animation + "delay-500" : animation}`}>
        <h2 className={`flex text-5xl flex-row h-12 transition`}>
          {activeCard?.name}
        </h2>

        <div
          className={`h-2/3 relative overflow-scroll text-sm/4 leading-tight flex flex-col transition pr-3 ${animation}`}
          style={{
            animationDelay: active ? "700ms" : "0ms",
            transitionDelay: active ? "700ms" : "0ms"
          }}
        >
          {activeCard?.info}
        </div>

        <div
          className={`flex gap-2 w-full h-12 items-center p-2 transition ${animation}`}
          style={{
            animationDelay: active ? "900ms" : "0ms",
            transitionDelay: active ? "900ms" : "0ms"
          }}
        >

          {[...Array(10)].map((_, i) =>
            <button
              key={i}
              onClick={() => setActive(i + 1)}
              className={`border rounded-full size-2 border-black/30 ${activeCard?.id === i + 1 ? "bg-neutral-800" : "bg-none"} transition`}>
            </button>
          )}
        </div>
      </div>

      {/* MIDDLE */}
      {activeCard &&
        <button
          onClick={() => flipCard(activeCard.id, activeCard.isFlipped ? false : true)}
          className="h-72 w-1/4 border border-black self-center"
        ></button>
      }

      {/* RIGHT */}
      <div className={`flex flex-col justify-between h-full w-1/4 relative`}>
        <button
          onClick={() => setActive(null)} className={`size-12 flex justify-center ml-auto ${animation}`}
          style={{
            animationDelay: active ? "500ms" : "0ms",
            transitionDelay: active ? "500ms" : "0ms"
          }}
        >
          <TfiClose className="size-10" />
        </button>

        <div className={`flex w-full h-2/3 p-4 pb-0 ${animation}`}
          style={{
            animationDelay: active ? "700ms" : "0ms",
            transitionDelay: active ? "700ms" : "0ms"
          }}
        >
          <ul className="flex flex-col gap-6 w-full relative justify-between items-center">
            <li className="flex flex-row justify-between w-full px-6">
              <RxDimensions size={"2rem"} />
              <div className="flex-col text-end">
                <p>2.0in x 3.5in</p>
                <p>5.08cm x 8.89cm</p>
              </div>
            </li>

            <li className="flex flex-row w-full justify-evenly">
              <div className="rounded-full bg-[#aecae3] border-black/10 border-2 size-10"></div>
            </li>

            <li className="flex justify-between items-center w-full px-6">
              <SiMaterialdesignicons size={"1.2rem"} />
              <p>
                Matte paper, <span>{activeCard && activeCard.foilColor.charAt(0).toUpperCase() + activeCard.foilColor.slice(1)}</span>foil
              </p>
            </li>

            <li className="text-5xl font-medium justify-between flex flex-row w-full items-end p-1 pb-0">
              <NumberFlow
                value={activeCurrency.value}
                prefix={activeCurrency.symbol}
              />
              <div className="flex flex-row text-xl my-1">
                {currencies.map((currency) =>
                  <button
                    key={currency.name}
                    onClick={() => {
                      setActiveCurrency({
                        name: currency.name,
                        value: currency.value,
                        symbol: currency.symbol
                      })
                    }}
                    className={`${activeCurrency.name === currency.name ? "opacity-100" : "opacity-40"} transition-opacity`}
                  >
                    {currency.icon}
                  </button>
                )}
              </div>
            </li>
          </ul>
        </div>

        {activeCard?.inStock ?
          <button
            onClick={() => setActive(null)}
            className={`group h-12 w-full rounded-full border-neutral-800 border overflow-hidden p-0 ${animation}`}
            style={{
              animationDelay: active ? "700ms" : "0ms",
              transitionDelay: active ? "700ms" : "0ms"
            }}
          >
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
            className={`h-12 w-full rounded-full border-black/20 text-black/40 border items-center hover:cursor-not-allowed ${animation}`}
            style={{
              animationDelay: active ? "900ms" : "0ms",
              transitionDelay: active ? "900ms" : "0ms"
            }}
          >
            Out of stock
          </button>
        }
      </div>
    </div >
  )
}
