"use client"

import { useRef } from 'react'
import { useGLTF, TransformControls } from '@react-three/drei'
import * as THREE from 'three'

interface SpawnedGltfProps {
  url: string
  position?: [number, number, number]
  // Add other props like scale, rotation if needed later
}

export function SpawnedGltf({ url, position = [0, 1, 0] }: SpawnedGltfProps) {
  const { scene } = useGLTF(url)
  const groupRef = useRef<THREE.Group>(null!)

  // We might want TransformControls for debugging spawned objects
  // This could be conditionally enabled via a prop or another debug toggle
  const enableTransform = true // Example: always enable for now

  return (
    <group ref={groupRef} position={position} dispose={null}>
      {enableTransform && groupRef.current && (
        <TransformControls object={groupRef.current} />
      )}
      <primitive object={scene.clone()} /> {/* Clone scene to allow multiple instances */}
    </group>
  )
}

// Optional: Define default export if needed elsewhere, though named is preferred
// export default SpawnedGltf; 