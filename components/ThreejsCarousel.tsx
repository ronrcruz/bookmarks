'use client'

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Text, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useControls, button } from 'leva'

const cardColors: string[] = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'
]

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
  index: number
  active: number
  totalCards: number
  setActive: (index: number) => void
  color: string
  cardWidth: number
  cardHeight: number
  cardThickness: number
}

const Card: React.FC<CardProps> = ({ index, active, totalCards, setActive, color, cardWidth, cardHeight, cardThickness }) => {
  const mesh = useRef<THREE.Mesh>(null)
  const angle = (index - active) * (Math.PI * 2) / totalCards
  const radius = 3
  const prevActiveRef = useRef(active)
  const rotationProgressRef = useRef(0)

  const roundedRectShape = useMemo(() => createRoundedRectShape(cardWidth, cardHeight, 0.1), [cardWidth, cardHeight])
  const geometry = useMemo(() => new THREE.ExtrudeGeometry(roundedRectShape, { depth: cardThickness, bevelEnabled: false }), [roundedRectShape, cardThickness])

  useFrame((state, delta) => {
    if (mesh.current) {
      const targetX = Math.sin(angle) * radius
      const targetZ = Math.cos(angle) * radius
      mesh.current.position.x = THREE.MathUtils.lerp(mesh.current.position.x, targetX, 0.1)
      mesh.current.position.z = THREE.MathUtils.lerp(mesh.current.position.z, targetZ, 0.1)

      const baseRotation = Math.atan2(mesh.current.position.x, mesh.current.position.z) + Math.PI

      if (prevActiveRef.current !== active && index === active) {
        rotationProgressRef.current = 0
      }

      if (index === active && rotationProgressRef.current < 1) {
        rotationProgressRef.current = Math.min(rotationProgressRef.current + delta * 2, 1)
        mesh.current.rotation.y = baseRotation + Math.PI * 2 * rotationProgressRef.current
      } else {
        mesh.current.rotation.y = baseRotation
      }

      prevActiveRef.current = active

      const distanceFromActive = Math.abs(index - active)
      const maxDistance = totalCards / 2
      const targetOpacity = 1 - (distanceFromActive / maxDistance) * 0.1;
      (mesh.current.material as THREE.MeshStandardMaterial).opacity = THREE.MathUtils.lerp(
        (mesh.current.material as THREE.MeshStandardMaterial).opacity,
        targetOpacity,
        0.1
      )

      const targetScale = index === active ? 1.2 : 1
      mesh.current.scale.x = THREE.MathUtils.lerp(mesh.current.scale.x, targetScale, 0.1)
      mesh.current.scale.y = THREE.MathUtils.lerp(mesh.current.scale.y, targetScale, 0.1)
      mesh.current.scale.z = THREE.MathUtils.lerp(mesh.current.scale.z, targetScale, 0.1)
    }
  })

  return (
    <mesh ref={mesh} geometry={geometry} onClick={() => setActive(index)}>
      <meshStandardMaterial
        color={color}
        transparent
        opacity={1}
        side={THREE.DoubleSide}
      />
      <Text
        position={[0, 0, cardThickness / 2 + 0.01]}
        fontSize={0.1}
        color="#000000"
        anchorX="center"
        anchorY="middle"
      >
        Card {index + 1}
      </Text>
      <Text
        position={[0, 0, -cardThickness / 2 - 0.01]}
        fontSize={0.1}
        color="#000000"
        anchorX="center"
        anchorY="middle"
        rotation={[0, Math.PI, 0]}
      >
        Card {index + 1}
      </Text>
    </mesh>
  )
}

interface NavigationArrowsProps {
  onPrev: () => void
  onNext: () => void
}

const NavigationArrows: React.FC<NavigationArrowsProps> = ({ onPrev, onNext }) => {
  return (
    <>
      <Button
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
        onClick={onPrev}
        variant="outline"
        size="icon"
        aria-label="Previous card"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10"
        onClick={onNext}
        variant="outline"
        size="icon"
        aria-label="Next card"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </>
  )
}

interface SceneProps {
  active: number
  setActive: (index: number) => void
  totalCards: number
}

const Scene: React.FC<SceneProps> = ({ active, setActive, totalCards }) => {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null)
  const spotlightRef = useRef<THREE.SpotLight>(null)
  const { scene, size } = useThree()

  const { cardWidth, cardHeight, cardThickness, ambientLightIntensity, spotlightIntensity, spotlightPosition } = useControls({
    cardWidth: { value: 1, min: 0.5, max: 2, step: 0.1 },
    cardHeight: { value: 1.5, min: 0.5, max: 3, step: 0.1 },
    cardThickness: { value: 0.015, min: 0.01, max: 0.5, step: 0.01 },
    ambientLightIntensity: { value: 0.2, min: 0, max: 1, step: 0.1 },
    spotlightIntensity: { value: 1, min: 0, max: 2, step: 0.1 },
    spotlightPosition: { value: [0, 5, 0], step: 0.1 },
    resetCamera: button(() => {
      if (cameraRef.current) {
        cameraRef.current.position.set(0, 0, 5)
        cameraRef.current.lookAt(0, 0, 0)
      }
    })
  })

  useEffect(() => {
    scene.fog = new THREE.Fog('#111111', 5, 15)
  }, [scene])

  useFrame((state) => {
    if (cameraRef.current) {
      const targetX = Math.sin(-active * (Math.PI * 2) / totalCards) * 5
      const targetZ = Math.cos(-active * (Math.PI * 2) / totalCards) * 5
      cameraRef.current.position.x = THREE.MathUtils.lerp(cameraRef.current.position.x, targetX, 0.1)
      cameraRef.current.position.z = THREE.MathUtils.lerp(cameraRef.current.position.z, targetZ, 0.1)
      cameraRef.current.lookAt(0, 0, 0)
    }
    if (spotlightRef.current) {
      const targetX = Math.sin(active * (Math.PI * 2) / totalCards) * 3
      const targetZ = Math.cos(active * (Math.PI * 2) / totalCards) * 3
      spotlightRef.current.position.x = THREE.MathUtils.lerp(spotlightRef.current.position.x, targetX, 0.1)
      spotlightRef.current.position.z = THREE.MathUtils.lerp(spotlightRef.current.position.z, targetZ, 0.1)
      spotlightRef.current.target.position.set(targetX, 0, targetZ)
      spotlightRef.current.target.updateMatrixWorld()
    }
  })

  return (
    <>
      <perspectiveCamera ref={cameraRef} fov={75} aspect={size.width / size.height} near={0.1} far={1000} />
      <ambientLight intensity={ambientLightIntensity} />
      {/* <spotLight
        ref={spotlightRef}
        position={spotlightPosition}
        angle={0.3}
        penumbra={1}
        intensity={spotlightIntensity}
        castShadow
      /> */}
      {/* <Sparkles count={200} scale={10} size={1} speed={0.5} /> */}
      {Array.from({ length: totalCards }).map((_, index) => (
        <Card
          key={index}
          index={index}
          active={active}
          totalCards={totalCards}
          setActive={setActive}
          color={cardColors[index]}
          cardWidth={cardWidth}
          cardHeight={cardHeight}
          cardThickness={cardThickness}
        />
      ))}
    </>
  )
}

const ThreejsCarousel: React.FC = () => {
  const [active, setActive] = useState(0)
  const totalCards = 6

  const handlePrev = useCallback(() => {
    setActive((prev) => (prev - 1 + totalCards) % totalCards)
  }, [totalCards])

  const handleNext = useCallback(() => {
    setActive((prev) => (prev + 1) % totalCards)
  }, [totalCards])

  useEffect(() => {
    const updateBackgroundColor = () => {
      const activeColor = new THREE.Color(cardColors[active])
      const darkerColor = activeColor.clone().lerp(new THREE.Color('#111111'), 0.8)
      document.body.style.backgroundColor = darkerColor.getStyle()
    }

    updateBackgroundColor()

    return () => {
      document.body.style.backgroundColor = ''
    }
  }, [active])

  return (
    <div className="fixed inset-0">
      <Canvas>
        <Scene active={active} setActive={setActive} totalCards={totalCards} />
      </Canvas>
      <NavigationArrows onPrev={handlePrev} onNext={handleNext} />
    </div>
  )
}

export default ThreejsCarousel

