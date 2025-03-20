"use client";

import { CardType } from "@/app/definitions";
import { Dispatch, SetStateAction, useState, useEffect, useMemo, useCallback } from "react";
import { BiPound, BiDollar, BiEuro } from "react-icons/bi";
// import { SiMaterialdesignicons } from "react-icons/si";
// import { IoIosArrowRoundBack, IoIosArrowRoundForward } from "react-icons/io";
// import { RxDimensions } from "react-icons/rx";
import NumberFlow from "@number-flow/react";
import { TfiClose } from "react-icons/tfi";
import { Instrument_Sans } from "next/font/google";
import { motion, AnimatePresence } from "framer-motion";

const instrument = Instrument_Sans({
  weight: "400",
  variable: "--font-instrument",
  subsets: ["latin"],
});

interface ActiveUiProps {
  cardArr: CardType[];
  setCardArr: Dispatch<SetStateAction<CardType[]>>;
  active: number | null;
  setActive: Dispatch<SetStateAction<number | null>>;
  flipCard: (cardId: number, isFlipped: boolean) => void;
}

export default function ActiveUi({
  cardArr,
  setCardArr,
  active,
  setActive,
  flipCard,
}: ActiveUiProps) {
  const [hasSeenIndicator, setHasSeenIndicator] = useState(false);
  const [activeCurrency, setActiveCurrency] = useState({ id: 1, name: "usd", value: 8.43, symbol: "$" });

  const currencies = [
    { id: 1, name: "usd", icon: <BiDollar />, value: 8.43, symbol: "$" },
    { id: 2, name: "gbp", icon: <BiPound />, value: 6.53, symbol: "£" },
    { id: 3, name: "eur", icon: <BiEuro />, value: 7.79, symbol: "€" },
  ];

  const activeCard = useMemo(() => {
    return cardArr.find((card) => card.id === active) || null;
  }, [cardArr, active]);

  const selectedVariantIndex = activeCard?.selectedVariantIndex ?? 0;
  // const selectedVariant = useMemo(() => {
  //   return activeCard?.colorVariations[selectedVariantIndex];
  // }, [activeCard, selectedVariantIndex]);

  const handleClose = useCallback(() => {
    if (activeCard) {
      setActive(null);
      flipCard(activeCard.id, false);
    }
  }, [activeCard, flipCard, setActive]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (active === null) return;

      if (!hasSeenIndicator) setHasSeenIndicator(true);

      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        const nextActive = active % cardArr.length + 1;
        setActive(nextActive);
        if (activeCard) flipCard(active, false);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        const prevActive = active === 1 ? 11 : active - 1;
        setActive(prevActive);
        if (activeCard) flipCard(active, false);
      } else if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [active, activeCard, flipCard, setActive, handleClose, hasSeenIndicator]);

  // const handlePage = (activeId: number) => {
  //   if (active && activeCard) {
  //     setActive(activeId);
  //     flipCard(active, false);
  //   }
  // };

  const handleCurrencyClick = (id: number) => {
    const nextActive = id % currencies.length
    console.log(nextActive)
    setActiveCurrency(currencies[nextActive])
  }

  const handleVariantClick = (index: number) => {
    if (active !== null) {
      setCardArr((prev) =>
        prev.map((card) =>
          card.id === active ? { ...card, selectedVariantIndex: index } : card
        )
      );
    }
  };

  return (
    <AnimatePresence>
      {active !== null && (
        <div
          className="fixed h-full w-full z-30 flex justify-between"
          style={{ pointerEvents: active ? "auto" : "none" }}
          onClick={() => setHasSeenIndicator(true)}
        >
          {/* INDICATOR */}
          {/* {!hasSeenIndicator && (
            <motion.div
              initial={{ opacity: 0, x: "-50%", y: 20 }}
              animate={{ opacity: 0.5, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute top-6 left-1/2 border bg-black/90 border-black/20 text-black/40 p-2 rounded-lg shadow-lg flex gap-2 items-center"
            >
              <div className="flex gap-1">
                <div className="text-2xl justify-center flex items-center border border-white/50 text-white p-1 size-8 rounded-lg">
                  <IoIosArrowRoundBack />
                </div>
                <div className="text-2xl justify-center flex items-center border border-white/50 text-white p-1 size-8 rounded-lg">
                  <IoIosArrowRoundForward />
                </div>
              </div>
            </motion.div>
          )} */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0, duration: 0.3 }}
            className={`${instrument.className} h-full w-full flex justify-between flex-col`}
          >

            {/* TOP */}
            <motion.div className="flex flex-row justify-between w-full h-24 p-5 ">
              <motion.h2
                key={activeCard?.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="text-3xl z-10 flex flex-row "
              >
                {activeCard?.name}
              </motion.h2>

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                onClick={handleClose} className="size-8 lg:size-12 flex justify-center items-center">
                <TfiClose className="size-8" />
              </motion.button>

            </motion.div>
            {/* <div className="h-20 w-full z-0 blur-xl absolute"></div> */}

            {/* MIDDLE */}
            {activeCard && (
              <motion.button
                disabled={!active}
                onClick={() =>
                  flipCard(activeCard.id, !activeCard.isFlipped)
                }
                className="h-[32.5rem] w-[18.5rem] rounded-2xl self-center outline-none"
              />
            )}
            <div className="flex justify-center gap-3 mt-auto mb-1 rounded-full ">
              {activeCard?.colorVariations.map((variant, index) => (
                <motion.button
                  key={variant.colorName}
                  onClick={() => handleVariantClick(index)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                  style={{ backgroundColor: variant.cardColor }}
                  className={`rounded-full border-black/10 border-2 size-4 ${selectedVariantIndex === index ? "ring-1 ring-black" : ""}`}
                />
              ))}
            </div>

            {/* BOTTOM */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              className="flex justify-between w-full h-16 items-center p-5 px-3"
            >
              <button
                onClick={() => handleCurrencyClick(activeCurrency.id)}
                className="font-medium flex text-3xl p-1 gap-1 items-center">
                <div
                  className="border-[0.5px] border-black flex text-base rounded-full size-6 items-center justify-center overflow-hidden ">
                  <motion.span
                    key={activeCurrency.name}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {activeCurrency.symbol}
                  </motion.span>
                </div>
                <NumberFlow value={activeCurrency.value} />
              </button>
              {/* <li className="text-2xl font-medium flex justify-between items-center gap-2 ">
                <div className="flex flex-col text-xs lg:text-xl my-1">
                  {currencies.map((currency) => (
                    <button
                      key={currency.name}
                      onClick={() => setActiveCurrency(currency)}
                      className={`${activeCurrency.name === currency.name ? "opacity-100" : "opacity-40"}`}
                    >
                      {currency.icon}
                    </button>
                  ))}
                </div>
                <NumberFlow value={activeCurrency.value} prefix={activeCurrency.symbol} />
              </li> */}

              <div className="h-full flex flex-row items-center justify-end gap-2">
                {activeCard?.inStock ? (
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ delay: 0.4, duration: 0.3 }}
                    onClick={() => setActive(null)}
                    className="group h-10 w-16 rounded-full border-neutral-800 border overflow-hidden"
                  >
                    <div className="flex flex-col group-hover:-translate-y-10 transition duration-300">
                      <div className="h-10 flex justify-center items-center">Buy</div>
                      <div className="bg-black text-white h-10 flex justify-center items-center">Buy</div>
                    </div>
                  </motion.button>
                ) : (
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ delay: 0.4, duration: 0.3 }}
                    className="h-12 rounded-full border-black/20 text-black/40 border hover:cursor-not-allowed px-4 justify-center items-center"
                  >
                    Out of stock
                  </motion.button>
                )}
              </div>

            </motion.div>
          </motion.div>
        </div>
      )
      }
    </AnimatePresence >
  );
}