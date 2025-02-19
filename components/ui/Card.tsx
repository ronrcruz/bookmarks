"use client"

import { useFrame, useThree } from "@react-three/fiber"
import { useRef, useMemo, useState, Dispatch, SetStateAction, useEffect } from "react"
import * as THREE from 'three'
import { easing } from "maath"

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
  const roundedRectShape = createRoundedRectShape(1.0, 1.5, 0.1)
  const geometry = new THREE.ExtrudeGeometry(roundedRectShape, { depth: 0.02, bevelEnabled: false })
  const initialPos = useMemo(() => new THREE.Vector3(cardPos * 0.4, 0, 0), [cardPos])
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

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

      if (active === id) {
        targetPosition = [0, 16, 0];
        smoothTime = 0.4;
        const rotationX = mousePos.y * 0.5
        const rotationY = mousePos.x * 0.5
        targetRotation = [Math.PI / 2 - rotationX, Math.PI - rotationY, 0]
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
        [state.camera.position.x, active ? 20 : 2, active ? 0 : 8],
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
      position={[cardPos * 0.4, 0, 0]}
      rotation={[0, 0.7, 0]}
      onClick={click}
    >
      <meshStandardMaterial
        color={color}
        transparent
        opacity={1}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

export default Card;