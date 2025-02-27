"use client"

import { Decal, Environment, MeshReflectorMaterial, useTexture } from "@react-three/drei"

export default function GoldFoil() {
  const [foil, displacementMap, normalMap, envMap] = useTexture(["/bookmark-foil.png", "/DisplacementMap.png", "/NormalMap6.png", "/EnvMap.png"])
  normalMap.offset.set(0, 0)
  normalMap.flipY = false
  envMap.rotation = Math.PI * 2
  return (
    <Decal position={[0, 0, 0.02]} scale={[1, 1.75, 0.1]} >
      <meshPhysicalMaterial
        transparent
        polygonOffset
        polygonOffsetFactor={-20}
        map={foil}
        map-flipY={false}
        // map-flipX={false}
        map-anisotropy={16}
        roughness={0}
        metalness={1}
        clearcoat={1}
        sheen={7.0}
        sheenColor={"#e6c74e"}
        // displacementMap={displacementMap}
        // displacementScale={0.2}
        // displacementBias={0.02}
        normalMap={normalMap}
        envMap={envMap}
      // clearcoatNormalMap={normalMap}
      />
    </Decal>
  )
}
