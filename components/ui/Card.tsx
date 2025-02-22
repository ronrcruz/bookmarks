"use client"

import { useFrame } from "@react-three/fiber"
import { useRef, useMemo, useState, Dispatch, SetStateAction, useEffect } from "react"
import * as THREE from 'three'
import { easing } from "maath"
import GoldFoil from "./GoldFoil"
import { useTexture, Decal } from "@react-three/drei"

const createRoundedRectShape = (width: number, height: number, radius: number): THREE.Shape => {
  const shape = new THREE.Shape()
  shape.moveTo(-width / 2, -height / 2 + radius)
  shape.lineTo(-width / 2, height / 2 - radius)
  shape.quadraticCurveTo(-width / 2, height / 2, -width / 2 + radius, height / 2)
  shape.lineTo(width / 2 - radius, height / 2)
  shape.quadraticCurveTo(width / 2, height / 2, width / 2, height / 2 - radius)
  shape.lineTo(width / 2, -height / 2 + radius)
  shape.quadraticCurveTo(width / 2, -height / 2, width / 2 - radius, -height / 2)
  shape.lineTo(-width / 2 + radius, -height / 2)
  shape.quadraticCurveTo(-width / 2, -height / 2, -width / 2, -height / 2 + radius)
  return shape
}

interface CardProps {
  id: number;
  cardPos: number;
  color: string;
  totalCards: number;
  active: number | null;
  setActive: Dispatch<SetStateAction<number | null>>;
}

const Card = ({ id, cardPos, color, totalCards, active, setActive }: CardProps) => {
  const [hover, setHover] = useState(false)
  const meshRef = useRef<any>(null)
  const roundedRectShape = createRoundedRectShape(1.0, 1.75, 0.1)
  const geometry = new THREE.ExtrudeGeometry(roundedRectShape, { depth: 0.02, bevelEnabled: false })
  const initialPos = useMemo(() => new THREE.Vector3(cardPos * 0.4, 0, 0), [cardPos])
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const bookmark = useTexture("/bookmark.png")
  bookmark.minFilter = THREE.LinearFilter; // Default, smooths when zoomed out
  bookmark.magFilter = THREE.LinearFilter; // Default, smooths when zoomed in
  bookmark.anisotropy = 16;
  bookmark.generateMipmaps = true;

  const pointerOver = (e: { stopPropagation: () => any }) => {
    e.stopPropagation()
    if (!active) setHover(true)
  }
  const pointerOut = () => !active && setHover(false)
  const click = (e: { stopPropagation: () => any }) => (e.stopPropagation(), !active ? setActive(id) : setActive(null), setHover(false))

  const pointerMove = (e: MouseEvent) => {
    if (active === id) {
      const x = (e.clientX / window.innerWidth) * 2 - 1
      const y = -(e.clientY / window.innerHeight) * 2 + 1
      setMousePos({ x, y })
    }
  }

  useEffect(() => {
    window.addEventListener('mousemove', pointerMove as any)
    return () => window.removeEventListener('mousemove', pointerMove as any)
  }, [active, id])

  useFrame((state, delta) => {
    if (meshRef.current) {
      let targetPosition: [number, number, number];
      let smoothTime: number;
      let targetRotation: [number, number, number];
      let intensity: number

      if (active === id) {
        targetPosition = [0, 16, 0];
        smoothTime = 0.4;
        intensity = 0.25
        const rotationX = mousePos.y * intensity
        const rotationY = mousePos.x * intensity
        targetRotation = [Math.PI / 2 - rotationX, Math.PI - rotationY, Math.PI]
      } else if (hover) {
        targetPosition = [
          meshRef.current.position.x,
          0.5,
          meshRef.current.position.z
        ];
        smoothTime = 0.1;
        targetRotation = [0, 0.7, 0]
      } else {
        targetPosition = [
          initialPos.x,
          initialPos.y,
          initialPos.z
        ];
        smoothTime = active === null ? 0.1 : 0.5;
        targetRotation = [0, 0.7, 0]
      }

      // CARD POSITION ANIMATION
      easing.damp3(
        meshRef.current.position,
        targetPosition,
        smoothTime,
        delta
      );

      // CARD ROTATION ANIMATION
      easing.damp3(
        meshRef.current.rotation,
        targetRotation,
        active ? 0.5 : 0.175,
        delta
      )

      // CAMERA POSITION ANIMATION
      easing.damp3(
        state.camera.position,
        [state.camera.position.x, active ? 20.5 : 2, active ? 0 : 8],
        2.0,
        delta
      );
    }
  })

  return (
    <mesh
      onPointerOver={pointerOver}
      onPointerOut={pointerOut}
      ref={meshRef}
      geometry={geometry}
      receiveShadow
      castShadow
      position={initialPos}
      rotation={[0, 0.7, 0]}
      onClick={click}
    >
      <meshPhysicalMaterial
        color={color}
        opacity={1}
        side={THREE.DoubleSide}
        roughness={0.9}
        metalness={0.2}
      />
      <Decal receiveShadow={active ? false : true} position={[0, 0, 0]} scale={[1, 1.75, 0.1]} >
        <meshPhysicalMaterial
          polygonOffset
          polygonOffsetFactor={-1}
          map={bookmark}
          map-anisotropy={1}
          roughness={0.9}
          metalness={0.2}
          // map-flipY={false}
          map-flipX={false}
        />
      </Decal>
      {/* <GoldFoil /> */}
    </mesh>
  )
}

export default Card;