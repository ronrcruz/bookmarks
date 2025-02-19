"use client"

import { CardType } from "@/app/definitions";
import { Dispatch, SetStateAction } from "react";

interface ActiveUiProps {
  cardArr: CardType[];
  active: number | null;
  setActive: Dispatch<SetStateAction<number | null>>;
}

export default function ActiveUi({ cardArr, active, setActive }: ActiveUiProps) {

  return (
    <div className="h-full w-full flex absolute p-16">
      <div className={`h-16 w-16 border-neutral-800 border ${active ? "opacity-100 translate-y-0 delay-700 duration-700" : "opacity-0 translate-y-2 duration-300"} transition ease-in-out`}></div>

      <div className={`flex justify-end items-end ml-auto `}>{active} / 8</div>
    </div>
  )
}
