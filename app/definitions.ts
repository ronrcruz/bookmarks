import { ReactElement } from "react";

// Define DeviceOrientationEventConstructor for iOS support
export interface DeviceOrientationEventConstructor {
  new(type: string, eventInitDict?: DeviceOrientationEventInit): DeviceOrientationEvent;
  prototype: DeviceOrientationEvent;
  requestPermission?: () => Promise<string>;
}

export type CardType = {
  id: number;
  name: string
  info: ReactElement
  colorVariations: ColorVariant[]
  foil: {
    front: string
    back: string
  }
  normalMap: {
    front: string
    back: string
  }
  sheenColor: string
  inStock: boolean
  isFlipped: boolean
  selectedVariantIndex: number;
  link?: string;
}

type ColorVariant = {
  colorName: string
  cardColor: string
  bgColor: string
  foilColor: "gold" | "silver"
  illustration: {
    front: string
    back: string
  }
}