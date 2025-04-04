"use client"

import { useRef, useEffect, useMemo, useState } from 'react'
import { useGLTF, TransformControls } from '@react-three/drei'
import * as THREE from 'three'
import { ThreeEvent } from '@react-three/fiber'

// EXPORT the interface and make materialName optional
export interface BumpMapConfig {
  textureUrl: string
  materialName?: string // Now optional
  bumpScale?: number 
}

interface SpawnedGltfProps {
  url: string
  position?: [number, number, number]
  bumpMapConfig?: BumpMapConfig 
  isInspectMode: boolean
  onInspect: (info: object | string) => void
}

export function SpawnedGltf({
  url,
  position = [0, 1, 0],
  bumpMapConfig,
  isInspectMode,
  onInspect,
}: SpawnedGltfProps) {
  const { scene } = useGLTF(url) // Removed nodes as it's not used here directly
  const modelRef = useRef<THREE.Group>(null!)
  const textureLoader = useMemo(() => new THREE.TextureLoader(), []); // Stable loader instance

  // State to hold the loaded texture
  const [loadedBumpTexture, setLoadedBumpTexture] = useState<THREE.Texture | null>(null);

  // Effect to load texture when config appears or changes
  useEffect(() => {
    let isMounted = true;
    const textureUrl = bumpMapConfig?.textureUrl;

    if (textureUrl) {
      console.log(`[SpawnedGltf] Loading bump texture: ${textureUrl}`);
      setLoadedBumpTexture(null); // Reset texture state while loading new one
      textureLoader.load(
        textureUrl,
        (texture) => { // onLoad callback
          if (isMounted) {
            console.log(`[SpawnedGltf] Texture loaded: ${textureUrl}`);
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            setLoadedBumpTexture(texture);
          }
        },
        undefined, // onProgress callback (optional)
        (error) => { // onError callback
          if (isMounted) {
            console.error(`[SpawnedGltf] Error loading bump texture: ${textureUrl}`, error);
            setLoadedBumpTexture(null); // Ensure state is reset on error
          }
        }
      );
    } else {
      // If config or URL is removed, immediately reset the texture state
      setLoadedBumpTexture(null);
    }

    return () => {
      isMounted = false;
      // We don't dispose texture here as TextureLoader manages cache
    };
  }, [bumpMapConfig?.textureUrl, textureLoader]); // Depend only on the URL and loader

  // Effect to apply the loaded texture or clear the old one
  useEffect(() => {
    const currentMeshName = "Screen"; 
    const bumpScale = bumpMapConfig?.bumpScale ?? 1; 

    let foundMesh: THREE.Mesh | null = null;
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name === currentMeshName) {
        foundMesh = child;
      }
    });

    if (!foundMesh) {
      return; 
    }
    
    // Explicitly cast here AFTER null check
    const targetMesh = foundMesh as THREE.Mesh;
    
    // Now check the material type
    if (!(targetMesh.material instanceof THREE.MeshStandardMaterial)) {
        console.warn(`[SpawnedGltf] Mesh "${currentMeshName}" does not have MeshStandardMaterial.`);
        return;
    }
    
    const material = targetMesh.material; // Should be correctly typed now

    // --- Apply/Cleanup Logic --- 
    if (loadedBumpTexture && bumpMapConfig) {
       if (material.bumpMap !== loadedBumpTexture) {
            console.log(`[SpawnedGltf] Applying loaded scratch map to mesh: ${currentMeshName}`); // Updated log text
            material.bumpMap = loadedBumpTexture;
            material.bumpScale = bumpScale; // Uses the negative value from config
            material.needsUpdate = true;
       } else if (material.bumpScale !== bumpScale) {
            console.log(`[SpawnedGltf] Updating scratch scale for mesh: ${currentMeshName}`); // Updated log text
            material.bumpScale = bumpScale;
            material.needsUpdate = true;
       }
    } 
    else if (!bumpMapConfig || !loadedBumpTexture) {
        if (material.bumpMap) { 
            console.log(`[SpawnedGltf] Clearing scratch map from mesh: ${currentMeshName}`); // Updated log text
            material.bumpMap = null;
            material.needsUpdate = true;
        }
    }

  }, [bumpMapConfig, loadedBumpTexture, scene, url]); 

  // --- Click Handler for Inspection ---
  const handleInspectClick = (event: ThreeEvent<MouseEvent>) => {
    // Only proceed if inspect mode is active
    if (!isInspectMode) return;
    
    // Stop the event from propagating further (e.g., to OrbitControls)
    event.stopPropagation(); 
    console.log("[SpawnedGltf Inspect Mode] Clicked.");

    const clickedObject = event.object;
    const intersection = event.intersections[0];
    let info: object | string = `Clicked: ${clickedObject.name || 'Unnamed Object'}`;

    if (clickedObject instanceof THREE.Mesh && clickedObject.material instanceof THREE.MeshStandardMaterial) {
      const material = clickedObject.material;
      info = {
        meshName: clickedObject.name || 'Unnamed Mesh',
        materialName: material.name || 'Unnamed Material',
        materialType: material.type,
        color: `#${material.color.getHexString()}`,
        metalness: material.metalness.toFixed(2),
        roughness: material.roughness.toFixed(2),
        bumpMap: material.bumpMap 
          ? `Applied (${material.bumpMap.name || material.bumpMap.source?.data?.src || 'Unknown Texture'})` 
          : 'None',
        bumpScale: material.bumpMap ? material.bumpScale.toFixed(2) : 'N/A',
        visible: clickedObject.visible,
        position: `(${clickedObject.position.x.toFixed(2)}, ${clickedObject.position.y.toFixed(2)}, ${clickedObject.position.z.toFixed(2)})`,
        intersectionPoint: intersection 
          ? `(${intersection.point.x.toFixed(2)}, ${intersection.point.y.toFixed(2)}, ${intersection.point.z.toFixed(2)})`
          : 'N/A',
      };
      console.log("[SpawnedGltf Inspect Mode] Inspected Part Info:", info);
    } else {
      info = {
          name: clickedObject.name || 'Unnamed Object',
          type: clickedObject.type,
          position: `(${clickedObject.position.x.toFixed(2)}, ${clickedObject.position.y.toFixed(2)}, ${clickedObject.position.z.toFixed(2)})`,
      };
    }
    // Call the callback function passed from DesktopScene
    onInspect(info); 
  };
  // --- End Click Handler ---

  const enableTransform = true // Example: always enable for now

  return (
    // Outer group only for positioning and containing TransformControls
    <group position={position} dispose={null}>
      {/* TransformControls targets the modelRef group */}
      {enableTransform && modelRef.current && (
        <TransformControls object={modelRef.current} />
      )}
      {/* Inner group specifically for the model, referenced by modelRef */}
      <group ref={modelRef} onClick={handleInspectClick}>
        {/* Clone scene to allow multiple instances. */}
        <primitive object={scene.clone()} />
      </group>
    </group>
  )
}

// Optional: Define default export if needed elsewhere, though named is preferred
// export default SpawnedGltf; 