"use client"

import { Decal, useTexture } from "@react-three/drei"

export default function GoldFoil() {
  const foil = useTexture("/bookmark-foil1.svg")
  return (
    <Decal position={[0, 0, 0.02]} scale={[1.5, 1.75, 0.1]} >
      <meshPhysicalMaterial
        polygonOffset
        polygonOffsetFactor={-20}
        map={foil}
        map-flipY={false}
        map-anisotropy={16}
        roughness={0}
        metalness={1}
        clearcoat={1}
      // toneMapped={false}
      // sheen={1.0}
      // sheenColor={"#FFD700"}
      />
    </Decal>
  )
}
