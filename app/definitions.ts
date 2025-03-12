import { ReactElement } from "react";

export type CardType = {
  id: number;
  cardColor: string
  bgColor: string
  illustration: {
    front: string
    back: string
  }
  foil: {
    front: string
    back: string
  }
  foilColor: "gold" | "silver"
  normalMap: string
  sheenColor: string
  name: string
  info: ReactElement
  inStock: boolean
  isFlipped: boolean
}