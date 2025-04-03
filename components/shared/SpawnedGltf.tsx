"use client"

import { useRef, useEffect } from 'react'
import { useGLTF, TransformControls, useTexture } from '@react-three/drei'
import * as THREE from 'three'

// Interface for the bump map configuration
interface BumpMapConfig {
  textureUrl: string
  materialName: string
  bumpScale?: number // Optional bump scale
}

interface SpawnedGltfProps {
  url: string
  position?: [number, number, number]
  bumpMapConfig?: BumpMapConfig // Add prop for bump map config
}

export function SpawnedGltf({
  url,
  position = [0, 1, 0],
  bumpMapConfig, // Destructure the new prop
}: SpawnedGltfProps) {
  const { scene, nodes } = useGLTF(url) // Destructure nodes to access named parts
  const modelRef = useRef<THREE.Group>(null!)

  // Load the texture if bumpMapConfig is provided
  const bumpTexture = useTexture(
    bumpMapConfig?.textureUrl ?? '', // Provide texture URL or empty string if no config
    (texture) => {
      if (texture) { // Ensure texture is loaded
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      }
    }
  );

  // Apply the bump map when the texture or config changes
  useEffect(() => {
    if (bumpMapConfig && bumpTexture && scene) {
      const { materialName, bumpScale = 1 } = bumpMapConfig

      scene.traverse((child) => {
        if (
          child instanceof THREE.Mesh &&
          child.material instanceof THREE.MeshStandardMaterial &&
          child.material.name === materialName
        ) {
          console.log(`Applying bump map to material: ${materialName}`)
          child.material.bumpMap = bumpTexture
          child.material.bumpScale = bumpScale
          child.material.needsUpdate = true // Important: Ensure material updates
        }
      })
    }
    // Clean up the bump map when the component unmounts or config changes
    return () => {
      if (bumpMapConfig && scene) {
        const { materialName } = bumpMapConfig;
        scene.traverse((child) => {
          if (
            child instanceof THREE.Mesh &&
            child.material instanceof THREE.MeshStandardMaterial &&
            child.material.name === materialName
          ) {
            if (child.material.bumpMap === bumpTexture) {
              console.log(`Removing bump map from material: ${materialName}`);
              child.material.bumpMap = null;
              child.material.needsUpdate = true;
            }
          }
        });
      }
    };
  }, [bumpMapConfig, bumpTexture, scene]) // Re-run effect if config, texture or scene changes

  const enableTransform = true // Example: always enable for now

  return (
    // Outer group only for positioning and containing TransformControls
    <group position={position} dispose={null}>
      {/* TransformControls targets the modelRef group */}
      {enableTransform && modelRef.current && (
        <TransformControls object={modelRef.current} />
      )}
      {/* Inner group specifically for the model, referenced by modelRef */}
      <group ref={modelRef}>
        {/* Clone scene to allow multiple instances. Pass nodes down if needed directly */}
        <primitive object={scene.clone()} />
      </group>
    </group>
  )
}

// Optional: Define default export if needed elsewhere, though named is preferred
// export default SpawnedGltf; 