import { ReactElement } from "react";

export type CardType = {
  id: number;
  name: string
  info: ReactElement
  cardColor: string
  bgColor: string
  illustration: {
    front: string
    back: string
  }
  foilColor: "gold" | "silver"
  colorVariations: ColorVariant[]
  foil: {
    front: string
    back: string
  }
  normalMap: string
  sheenColor: string
  inStock: boolean
  isFlipped: boolean
}

type ColorVariant = {
  colorName: string
  cardColor: string
  bgColor: string
  illustration: {
    front: string
    back: string
  }
  foilColor: "gold" | "silver"
}