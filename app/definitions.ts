import { ReactElement } from "react";

export type CardType = {
  id: number;
  cardColor: string
  bgColor: string
  illustration: string
  foil: string
  foilColor: "gold" | "silver"
  normalMap: string
  sheenColor: string
  name: string
  info: ReactElement
  inStock: boolean
  isFlipped: boolean
}