import { Canvas, useThree, useFrame, ThreeEvent } from "@react-three/fiber";
import Experience from "./Experience";
import LoadingScreen from "./LoadingScreen";
import ActiveUi from "./ActiveUi";
import { Dispatch, SetStateAction, useState, useEffect, useRef, useMemo, useCallback } from "react";
import { CardType } from "@/app/definitions";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import { easing } from "maath";
import GltfExploreButton from "@/components/shared/GltfExploreButton";
import { TransformControls, SpotLight, Hud, useGLTF, OrthographicCamera, Plane } from "@react-three/drei";
import DebugKeyboardControls from "@/components/debug/DebugKeyboardControls";
import DebugStateBridge from "@/components/debug/DebugStateBridge";
import { DebugMenu } from "@/components/debug/DebugMenu";
import { SpawnedGltf } from "@/components/shared/SpawnedGltf";
import MusicToggle from "@/components/shared/MusicToggle";
import BeatToggle from "@/components/shared/BeatToggle";
import { InspectInfoDisplay } from "@/components/debug/InspectInfoDisplay";
import { MouseLightControls } from "@/components/debug/MouseLightControls";
import React from "react";
import { SelectedLightEditor } from "@/components/debug/SelectedLightEditor";
import { BumpMapConfig } from "@/components/shared/SpawnedGltf"; 

declare global {
  interface Window {
    __directFlipCard: number | null;
    __raycasterCleanup?: () => void;
    __processingWheelEvent?: boolean;
  }
}

type ViewState = 'initial' | 'cardSelection';

interface DesktopSceneProps {
  cardArr: CardType[];
  setCardArr: Dispatch<SetStateAction<CardType[]>>
  active: number | null;
  setActive: Dispatch<SetStateAction<number | null>>;
  isLoaded: boolean;
  setIsLoaded: Dispatch<SetStateAction<boolean>>;
  flipCard: (cardId: number, isFlipped: boolean) => void;
  viewState: ViewState;
  setViewState: Dispatch<SetStateAction<ViewState>>;
}

export interface PlacedLight {
  id: number;
  position: [number, number, number];
  type: 'point' | 'spot' | 'directional';
  intensity: number;
  distance: number;
  color: string;
  angle?: number;
  penumbra?: number;
}

interface PlacedLightControllerProps {
  lights: PlacedLight[];
  selectedId: number | null;
  onLightMove: (id: number, newPosition: THREE.Vector3) => void;
  transformMode: 'translate' | 'rotate';
}

const PlacedLightController = React.memo(({ 
  lights, 
  selectedId, 
  onLightMove,
  transformMode,
}: PlacedLightControllerProps) => {
  const lightRefs = useRef<Map<number, THREE.Light>>(new Map());
  const transformControlsRef = useRef<any>(null); 
  
  useEffect(() => {
      const controls = transformControlsRef.current;
      const selectedLightObject = selectedId === null ? null : lightRefs.current.get(selectedId) ?? null;
      
      if (controls) {
          if (selectedLightObject) {
              if (controls.object !== selectedLightObject) {
                  controls.attach(selectedLightObject);
              }
              controls.visible = true;
          } else {
              if (controls.object) {
                  controls.detach();
              }
              controls.visible = false;
          }
      } 
  }, [selectedId, lights]); 

  const handleDragChange = useCallback(() => {
    if (transformControlsRef.current && transformControlsRef.current.object) {
      const light = transformControlsRef.current.object as THREE.Light;
      const lightId = lights.find(l => lightRefs.current.get(l.id) === light)?.id;
      if (lightId !== undefined) {
         onLightMove(lightId, light.position.clone());
      }
    }
  }, [lights, onLightMove]); 

  return (
    <>
      {lights.map(light => {
        switch (light.type) {
          case 'spot':
            return (
              <spotLight
                key={light.id}
                ref={(el: THREE.SpotLight | null) => { 
                    if (el) lightRefs.current.set(light.id, el);
                    else if (lightRefs.current.has(light.id)) lightRefs.current.delete(light.id);
                }}
                position={light.position}
                intensity={light.intensity} 
                distance={light.distance}   
                color={light.color}
                angle={light.angle ?? Math.PI / 4}
                penumbra={light.penumbra ?? 0.1}
                decay={2}
                castShadow
              />
            );
          case 'directional':
            return (
              <directionalLight
                key={light.id}
                ref={(el: THREE.DirectionalLight | null) => { 
                    if (el) lightRefs.current.set(light.id, el);
                    else if (lightRefs.current.has(light.id)) lightRefs.current.delete(light.id);
                }}
                position={light.position}
                intensity={light.intensity}
                color={light.color}
                castShadow
              />
            );
          case 'point':
          default:
            return (
              <pointLight
                key={light.id}
                ref={(el: THREE.PointLight | null) => { 
                    if (el) lightRefs.current.set(light.id, el);
                    else if (lightRefs.current.has(light.id)) lightRefs.current.delete(light.id);
                }}
                position={light.position}
                intensity={light.intensity} 
                distance={light.distance}   
                color={light.color}         
                decay={2}
              />
            );
        }
      })}
      
      <TransformControls 
          ref={transformControlsRef}
          mode={transformMode} 
          onObjectChange={handleDragChange}
          visible={false} 
          enabled={selectedId !== null} 
      />
    </>
  );
}); 

PlacedLightController.displayName = 'PlacedLightController';

interface SpawnedObject {
  id: number;
  url: string;
  position?: [number, number, number]; 
  bumpMapConfig?: BumpMapConfig;
}

function HudPlayButton() {
  const { scene: playModelScene } = useGLTF('/play.glb');
  const primitiveRef = useRef<THREE.Group>(null!);
  const targetRotation = useRef(new THREE.Euler());
  const entryPointer = useRef(new THREE.Vector2());
  const [isHovering, setIsHovering] = useState(false);
  const { size, pointer } = useThree();

  const padding = 100;
  const positionX = size.width / 2 - padding;
  const positionY = size.height / 2 - padding;

  useEffect(() => {
    playModelScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.material && child.material instanceof THREE.MeshStandardMaterial) {
          child.material.depthTest = false;
          child.material.depthWrite = false;
        }
      }
    });
  }, [playModelScene]);

  useFrame((state, delta) => {
    const sensitivity = 0.3;
    const maxTilt = Math.PI / 10;

    let tiltX = 0;
    let tiltY = 0;

    if (isHovering) {
      const deltaX = pointer.x - entryPointer.current.x;
      const deltaY = pointer.y - entryPointer.current.y;
      
      tiltX = deltaY * sensitivity;
      tiltY = deltaX * sensitivity;

      tiltX = THREE.MathUtils.clamp(tiltX, -maxTilt, maxTilt);
      tiltY = THREE.MathUtils.clamp(tiltY, -maxTilt, maxTilt);
    }
    
    targetRotation.current.set(-tiltX, tiltY, 0);

    if (primitiveRef.current) {
      easing.dampE(
        primitiveRef.current.rotation, 
        targetRotation.current, 
        0.1,
        delta
      );
    }
  });

  const handleHudClick = () => {
    console.log("HUD Play Button Clicked!");
  };

  const hitboxSize: [number, number] = [110, 110]; 

  return (
    <group position={[positionX, positionY, 0]} >
      <ambientLight intensity={1.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      
      <primitive 
        ref={primitiveRef}
        object={playModelScene} 
        scale={32.5} 
        onClick={handleHudClick} 
      /> 

      <Plane 
        args={hitboxSize}
        position-z={-0.1}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => { 
          e.stopPropagation(); 
          entryPointer.current.copy(pointer); 
          setIsHovering(true); 
        }}
        onPointerOut={() => setIsHovering(false)}
      >
        <meshStandardMaterial visible={false} />
      </Plane>
    </group>
  );
}

export default function DesktopScene({
  cardArr,
  setCardArr,
  active,
  setActive,
  isLoaded,
  setIsLoaded,
  flipCard,
  viewState,
  setViewState,
}: DesktopSceneProps) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [targetScrollPosition, setTargetScrollPosition] = useState(0);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [showUI, setShowUI] = useState(false);
  const [isHoveringLeft, setIsHoveringLeft] = useState(false);
  const [isHoveringRight, setIsHoveringRight] = useState(false);
  const [inArrowZone, setInArrowZone] = useState(false);
  const [hoverLocked, setHoverLocked] = useState(false);
  const [isActivelyScrolling, setIsActivelyScrolling] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [isWheelScrolling, setIsWheelScrolling] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [bottomColor, setBottomColor] = useState("#bdd7ee");
  const [arrowClicked, setArrowClicked] = useState(false);
  const [arrowInteraction, setArrowInteraction] = useState(false);
  const [isDebugMode, setIsDebugMode] = useState<boolean>(false);
  const [debugInfo, setDebugInfo] = useState({ position: '', rotation: '' });
  const [normalizedMousePosition, setNormalizedMousePosition] = useState({ x: 0, y: 0 });
  const [resetZRotationTrigger, setResetZRotationTrigger] = useState(0);
  const [isLightPlacementMode, setIsLightPlacementMode] = useState<boolean>(false);
  const [placedLights, setPlacedLights] = useState<PlacedLight[]>([]);
  const nextLightId = useRef(1);
  const [isBeatAnimationEnabled, setIsBeatAnimationEnabled] = useState<boolean>(true);
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastActiveCardRef = useRef<number | null>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const CARD_WIDTH = 1.2;
  const selectedVariantRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showDebugWall, setShowDebugWall] = useState<boolean>(false);
  const debugWallRef = useRef<THREE.Mesh>(null);
  const [placedLightIntensity, setPlacedLightIntensity] = useState<number>(2);
  const [placedLightDistance, setPlacedLightDistance] = useState<number>(1);
  const [placedLightColor, setPlacedLightColor] = useState<string>("#ffffff");
  const [savedCameraPos1, setSavedCameraPos1] = useState<THREE.Vector3 | null>(null);
  const [savedCameraQuat1, setSavedCameraQuat1] = useState<THREE.Quaternion | null>(null);
  const [savedCameraPos2, setSavedCameraPos2] = useState<THREE.Vector3 | null>(null);
  const [savedCameraQuat2, setSavedCameraQuat2] = useState<THREE.Quaternion | null>(null);
  const [saveCameraTrigger, setSaveCameraTrigger] = useState(0);
  const [saveSlotTarget, setSaveSlotTarget] = useState<1 | 2>(1);
  const [recallCameraTrigger, setRecallCameraTrigger] = useState(0);
  const [recallSlotTarget, setRecallSlotTarget] = useState<1 | 2>(1);
  const [isInspectMode, setIsInspectMode] = useState<boolean>(false);
  const [inspectedPartInfo, setInspectedPartInfo] = useState<object | string | null>(null);
  const [selectedLightId, setSelectedLightId] = useState<number | null>(null);
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate'>('translate');
  const [spawnedObjects, setSpawnedObjects] = useState<SpawnedObject[]>([]);
  const nextSpawnedObjectId = useRef(1);
  const [bumpMapStatus, setBumpMapStatus] = useState<string>("Bump map not applied.");
  const [isMouseLightActive, setIsMouseLightActive] = useState<boolean>(false);
  const [mouseLightPosition, setMouseLightPosition] = useState<THREE.Vector3>(() => new THREE.Vector3(0, 2, 5)); 
  const [mouseLightIntensity, setMouseLightIntensity] = useState<number>(1.5);
  const [mouseLightColor, setMouseLightColor] = useState<string>("#ffffaa");
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [audioSourceNode, setAudioSourceNode] = useState<AudioBufferSourceNode | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState<boolean>(false);
  const [audioStartTime, setAudioStartTime] = useState<number | null>(null);
  const audioLoadCalled = useRef(false);

  const getCardPositions = useCallback(() => {
    return cardArr.map((_, index) => (index - (cardArr.length - 1) / 2) * CARD_WIDTH);
  }, [cardArr, CARD_WIDTH]);

  const getCurrentCardIndex = useCallback(() => {
    const cardPositions = getCardPositions();
    return cardPositions.reduce((closestIndex, position, currentIndex) => {
      return Math.abs(position - scrollPosition) < Math.abs(cardPositions[closestIndex] - scrollPosition)
        ? currentIndex
        : closestIndex;
    }, 0);
  }, [getCardPositions, scrollPosition]);
  
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const { visibleCards, maxScrollLeft, maxScrollRight } = useMemo(() => {
    const visibleCardsCount = Math.max(3, Math.min(5, Math.floor(windowWidth / 250)));
    if (cardArr.length <= 3) {
      return {
        visibleCards: visibleCardsCount,
        maxScrollLeft: 0,
        maxScrollRight: 0
      };
    } else {
      const centerOffset = ((cardArr.length - 1) / 2) * CARD_WIDTH;
      const leftmostPosition = -centerOffset;
      const rightmostPosition = centerOffset - (visibleCardsCount - 1) * CARD_WIDTH / 2 + (2 * CARD_WIDTH);
      return {
        visibleCards: visibleCardsCount,
        maxScrollLeft: leftmostPosition, 
        maxScrollRight: rightmostPosition
      };
    }
  }, [cardArr, windowWidth, CARD_WIDTH]);
  
  useEffect(() => {
    console.log({
      visibleCards,
      maxScrollLeft,
      maxScrollRight,
      cardCount: cardArr.length,
      windowWidth,
      shouldShowArrows: cardArr.length > 3
    });
  }, [visibleCards, maxScrollLeft, maxScrollRight, cardArr.length, windowWidth]);
  
  useEffect(() => {
    if (active !== null) {
      lastActiveCardRef.current = active;
    } else {
      lastActiveCardRef.current = null;
    }
  }, [active]);
  
  useEffect(() => {
    if (isLoaded && active === null) {
      setShowUI(true);
    } else {
      setShowUI(false);
      setIsHoveringLeft(false);
      setIsHoveringRight(false);
      setInArrowZone(false);
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    }
  }, [isLoaded, active]);

  useEffect(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    const animateScroll = () => {
      setScrollPosition(prev => {
        const diff = targetScrollPosition - prev;
        if (Math.abs(diff) < 0.001) {
          setHoverLocked(false);
          return targetScrollPosition;
        }
        const easeFactor = active === null ? 0.2 : 0.1;
        setHoverLocked(false);
        return prev + diff * easeFactor;
      });
      animationFrameRef.current = requestAnimationFrame(animateScroll);
    };
    animationFrameRef.current = requestAnimationFrame(animateScroll);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [targetScrollPosition, setHoverLocked, active]);
  
  const handleMouseMove = (e: React.MouseEvent) => {
    setCursorPosition({ x: e.clientX, y: e.clientY });
    const normX = (e.clientX / window.innerWidth) * 2 - 1;
    const normY = -(e.clientY / window.innerHeight) * 2 + 1;
    setNormalizedMousePosition({ x: normX, y: normY });
    if (viewState === 'initial') {
      setShowLeftArrow(false);
      setShowRightArrow(false);
      setInArrowZone(false);
      setIsHoveringLeft(false);
      setIsHoveringRight(false);
      setHoverLocked(false);
    } else if (viewState === 'cardSelection' && isLoaded && active === null) {
      const arrowZoneWidth = 180; 
      const x = e.clientX;
      const width = window.innerWidth;
      if (x < arrowZoneWidth || x > width - arrowZoneWidth) {
        setInArrowZone(true);
        setShowLeftArrow(true);
        setShowRightArrow(true);
      } else {
        setInArrowZone(false);
        if (!isHoveringLeft && !isHoveringRight) {
          setHoverLocked(false);
        }
        setShowLeftArrow(true);
        setShowRightArrow(true);
      }
    }
  };
  
  const shouldShowArrows = cardArr.length > 3;
  
  useEffect(() => {
    const containerRef = document.getElementById('card-container');
    if (containerRef) {
      const handleWheelEvent = (e: WheelEvent) => {
        let targetElement = e.target as HTMLElement | null;
        while (targetElement) {
          if (targetElement.id === 'debug-menu-container') {
            return; 
          }
          targetElement = targetElement.parentElement;
        }
        e.preventDefault();
        if (viewState !== 'cardSelection') return;
        if (!isLoaded) {
          return;
        }
        if (active !== null) {
          if (window.__processingWheelEvent) {
            return;
          }
          window.__processingWheelEvent = true;
          const direction = e.deltaY > 0 ? 1 : -1;
          const activeIndex = cardArr.findIndex(card => card.id === active);
          let nextIndex = activeIndex + direction;
          if (nextIndex < 0) nextIndex = cardArr.length - 1;
          if (nextIndex >= cardArr.length) nextIndex = 0;
          const currentActiveCard = cardArr[activeIndex];
          const nextActiveCard = cardArr[nextIndex];
          flipCard(active, false);
          window.__directFlipCard = null;
          requestAnimationFrame(() => {
            window.__directFlipCard = nextActiveCard.id;
            setActive(nextActiveCard.id);
            setTimeout(() => {
              window.__processingWheelEvent = false;
            }, 100);
          });
          return;
        }
        const direction = e.deltaY > 0 ? 1 : -1;
        const scrollAmount = Math.min(3, Math.max(1, Math.ceil(Math.abs(e.deltaY) / 100)));
        const scaledDirection = direction * scrollAmount;
        const cardPositions = getCardPositions();
        const currentIndex = getCurrentCardIndex();
        const targetIndex = Math.max(0, Math.min(cardArr.length - 1, currentIndex + scaledDirection));
        const targetPosition = cardPositions[targetIndex];
        setTargetScrollPosition(targetPosition);
      };
      containerRef.addEventListener('wheel', handleWheelEvent, { passive: false });
      return () => {
        containerRef.removeEventListener('wheel', handleWheelEvent);
      };
    }
  }, [ isLoaded, active, getCardPositions, getCurrentCardIndex, cardArr, setTargetScrollPosition, setActive, flipCard, viewState ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && viewState === 'initial') return;
      if (viewState !== 'cardSelection') return;
      if (!isLoaded || active !== null) {
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const direction = e.key === 'ArrowRight' ? 1 : -1;
        const cardPositions = getCardPositions();
        const currentIndex = getCurrentCardIndex();
        const targetIndex = Math.max(0, Math.min(cardArr.length - 1, currentIndex + direction));
        const targetPosition = cardPositions[targetIndex];
        setTargetScrollPosition(targetPosition);
      }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const currentIndex = getCurrentCardIndex();
        const selectedCard = cardArr[currentIndex];
        if (selectedCard) {
          window.__directFlipCard = selectedCard.id;
          setActive(selectedCard.id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [ isLoaded, active, getCardPositions, getCurrentCardIndex, cardArr, setTargetScrollPosition, setActive ]);

  useEffect(() => {
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (active !== null) {
      const activeIndex = cardArr.findIndex(card => card.id === active);
      const newPosition = (activeIndex - (cardArr.length - 1) / 2) * 1.2;
      setTargetScrollPosition(newPosition);
    } 
  }, [active, cardArr]);

  useEffect(() => {
    if (active === null) {
      setHoverLocked(false);
    }
  }, [active]);

  const variantIndicesString = cardArr.map(card => card.selectedVariantIndex).join(',');
  
  useEffect(() => {
    const activeCard = cardArr.find((card) => card.id === active);
    if (active !== null && activeCard) {
      const currentVariantIndex = activeCard.selectedVariantIndex;
      const selectedVariant = activeCard.colorVariations[currentVariantIndex];
      setBottomColor(selectedVariant.bgColor);
    } else {
      setBottomColor("#bdd7ee");
    }
  }, [active, cardArr, variantIndicesString]);

  useEffect(() => {
    const handleInteractionEnabled = () => {
      const cardContainer = document.getElementById('card-container');
      if (cardContainer) {
        cardContainer.style.pointerEvents = 'auto';
        cardContainer.style.zIndex = '25';
      }
    };
    window.addEventListener('card_interaction_enabled', handleInteractionEnabled);
    return () => {
      window.removeEventListener('card_interaction_enabled', handleInteractionEnabled);
    };
  }, []);

  useEffect(() => {
    let timeoutId: number | null = null;
    let isActiveEffect = true;
    if (active !== null && window.__directFlipCard === active) {
      const activeCard = cardArr.find(card => card.id === active);
      timeoutId = window.setTimeout(() => {
        if (!isActiveEffect) return;
        if (window.__directFlipCard === active && activeCard && !activeCard.isFlipped) {
          flipCard(active, true);
        }
      }, 100);
      window.setTimeout(() => {
        if (!isActiveEffect) return;
        const currentCard = cardArr.find(card => card.id === active);
        if (window.__directFlipCard === active && currentCard && !currentCard.isFlipped) {
          flipCard(active, true);
        }
      }, 250);
      window.setTimeout(() => {
        if (!isActiveEffect) return;
        const finalCard = cardArr.find(card => card.id === active);
        if (window.__directFlipCard === active && finalCard && !finalCard.isFlipped) {
          flipCard(active, true);
        }
        if (window.__directFlipCard === active) {
          window.__directFlipCard = null;
        }
      }, 400);
    }
    return () => {
      isActiveEffect = false;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [active, flipCard, cardArr]);

  interface ExtendedEvent extends Event {
    __handled?: boolean;
  }
  
  useEffect(() => {
    if (active !== null || !isLoaded) return;
    const handleCardContainerClick = (e: MouseEvent) => {
      if (active !== null) return;
      if (viewState !== 'cardSelection') return;
      const extendedEvent = e as unknown as ExtendedEvent;
      if (isHoveringLeft || isHoveringRight || arrowInteraction) {
        e.stopPropagation();
        extendedEvent.__handled = true;
        return;
      }
      if (extendedEvent.__handled) {
        return;
      }
      const currentIndex = getCurrentCardIndex();
      const cardId = cardArr[currentIndex].id;
      window.__directFlipCard = cardId;
      setActive(cardId);
    };
    const cardContainer = document.getElementById('card-container');
    if (cardContainer) {
      cardContainer.addEventListener('click', handleCardContainerClick, { capture: false });
    }
    return () => {
      if (cardContainer) {
        cardContainer.removeEventListener('click', handleCardContainerClick, { capture: false });
      }
    };
  }, [active, isLoaded, getCurrentCardIndex, cardArr, setActive, isHoveringLeft, isHoveringRight, arrowInteraction, viewState]);

  useEffect(() => {
    if (!canvasRef.current || active !== null || !isLoaded) return;
    const canvas = canvasRef.current;
    const handleCanvasClick = (e: MouseEvent) => {
      const extendedEvent = e as unknown as ExtendedEvent;
      if (isHoveringLeft || isHoveringRight || arrowInteraction) {
        e.stopPropagation();
        e.preventDefault();
        extendedEvent.__handled = true;
        return false;
      }
    };
    canvas.addEventListener('click', handleCanvasClick, { capture: true });
    return () => {
      canvas.removeEventListener('click', handleCanvasClick, { capture: true });
    };
  }, [active, isLoaded, isHoveringLeft, isHoveringRight, arrowInteraction]);

  const startScrollInterval = useCallback(() => {
    if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
    setIsActivelyScrolling(true);
    let currentCardIndex = getCurrentCardIndex();
    let lastScrollTime = Date.now();
    scrollIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const scrollThrottle = arrowClicked ? 5 : 15;
      if (now - lastScrollTime < scrollThrottle) return;
      if (isHoveringLeft) {
        const nextIndex = Math.max(0, currentCardIndex - (arrowClicked ? 2 : 1));
        if (nextIndex !== currentCardIndex) {
          const cardPositions = getCardPositions();
          const targetPosition = cardPositions[nextIndex];
          setTargetScrollPosition(targetPosition);
          setHoverLocked(true);
          currentCardIndex = nextIndex;
          lastScrollTime = now;
        }
      } else if (isHoveringRight) {
        const nextIndex = Math.min(cardArr.length - 1, currentCardIndex + (arrowClicked ? 2 : 1));
        if (nextIndex !== currentCardIndex) {
          const cardPositions = getCardPositions();
          const targetPosition = cardPositions[nextIndex];
          setTargetScrollPosition(targetPosition);
          setHoverLocked(true);
          currentCardIndex = nextIndex;
          lastScrollTime = now;
        }
      }
    }, 25);
  }, [ arrowClicked, cardArr, getCurrentCardIndex, getCardPositions, isHoveringLeft, isHoveringRight, setHoverLocked, setIsActivelyScrolling, setTargetScrollPosition ]);
  
  const handleScrollStop = useCallback(() => {
    if (active !== null) {
      return;
    }
    const cardPositions = getCardPositions();
    const closestCardIndex = cardPositions.reduce((prevIndex, position, currentIndex) => {
      return Math.abs(position - scrollPosition) < Math.abs(cardPositions[prevIndex] - scrollPosition)
        ? currentIndex
        : prevIndex;
    }, 0);
    const nearestCardPosition = cardPositions[closestCardIndex];
    const targetPosition = Math.min(maxScrollRight, Math.max(maxScrollLeft, nearestCardPosition));
    setTargetScrollPosition(targetPosition);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('scroll_snap_complete'));
    }, 50);
    setHoverLocked(false);
    setIsActivelyScrolling(false);
    setIsWheelScrolling(false);
  }, [ active, scrollPosition, getCardPositions, maxScrollRight, maxScrollLeft, setTargetScrollPosition, setHoverLocked, setIsActivelyScrolling, setIsWheelScrolling ]);

  useEffect(() => {
    if ((isHoveringLeft || isHoveringRight) && !active) {
      startScrollInterval();
    } else {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
        setHoverLocked(false);
        if (!isHoveringLeft && !isHoveringRight) {
          setIsActivelyScrolling(false);
          handleScrollStop();
        }
      }
    }
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
        setHoverLocked(false);
      }
    };
  }, [isHoveringLeft, isHoveringRight, active, handleScrollStop, setHoverLocked, startScrollInterval]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === '`') {
        setIsDebugMode((prev: boolean) => {
          return !prev;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const handleEnterKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && viewState === 'initial') {
        setViewState('cardSelection');
      }
    };
    if (viewState === 'initial') {
      window.addEventListener('keydown', handleEnterKey);
    }
    return () => {
      window.removeEventListener('keydown', handleEnterKey);
    };
  }, [viewState, setViewState]);

  const initAudioContext = useCallback(() => {
    if (typeof window !== 'undefined' && !audioContext) {
      const newContext = new window.AudioContext();
        setAudioContext(newContext);
      return newContext;
    }
    return audioContext;
  }, [audioContext]);

  const loadAudio = useCallback(async (context: AudioContext | null) => {
    if (!context || audioBuffer || audioLoadCalled.current) return;
    audioLoadCalled.current = true;
    setIsAudioLoading(true);
    try {
      const response = await fetch('/Deep in It.mp3');
      const arrayBuffer = await response.arrayBuffer();
      const decodedBuffer = await context.decodeAudioData(arrayBuffer);
      setAudioBuffer(decodedBuffer);
    } catch (error) {
      audioLoadCalled.current = false;
    } finally {
      setIsAudioLoading(false);
    }
  }, [audioBuffer]);

  const togglePlayback = useCallback(() => {
    if (!audioContext || !audioBuffer) {
      return;
    }
      if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    if (isMusicPlaying) {
        if (audioSourceNode) {
            audioSourceNode.stop();
            setAudioSourceNode(null);
            setAudioStartTime(null);
        }
    } else {
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        const startTime = audioContext.currentTime;
        source.start(startTime);
        setAudioSourceNode(source);
        setAudioStartTime(startTime);
        source.onended = () => {
            setAudioSourceNode(currentSource => (currentSource === source ? null : currentSource));
            setAudioStartTime(null);
            setIsMusicPlaying(false);
        };
    }
  }, [audioContext, audioBuffer, isMusicPlaying, audioSourceNode]);

  const handleMusicToggleClick = useCallback(() => {
    let currentContext = audioContext;
    if (!currentContext) {
      currentContext = initAudioContext();
      if (!currentContext) return;
    }
    if (currentContext && !audioBuffer && !audioLoadCalled.current && !isAudioLoading) {
      loadAudio(currentContext);
      return;
    }
    if (currentContext && currentContext.state === 'suspended') {
      currentContext.resume().catch(err => console.error("Resume failed on toggle:", err));
    }
    if (audioBuffer) {
        togglePlayback();
        setIsMusicPlaying(prev => !prev);
    } else if (isAudioLoading) {
        // Handled by conditional rendering or state logic
    } else {
        // Handled by conditional rendering or state logic
      }
  }, [audioContext, initAudioContext, audioBuffer, loadAudio, isAudioLoading, togglePlayback]);

  useEffect(() => {
    if (!isMusicPlaying) {
      setIsBeatAnimationEnabled(false);
    } else {
      setIsBeatAnimationEnabled(true);
    }
  }, [isMusicPlaying]);

  useEffect(() => {
    return () => {
      if (audioSourceNode) {
        try { audioSourceNode.stop(); } catch(e) {/* ignore */}
        setAudioSourceNode(null);
      }
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().then(() => console.log("AudioContext closed."))
          .catch(err => console.error("Failed to close AudioContext:", err));
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addPlacedLight = useCallback((worldPosition: [number, number, number]) => {
    const newLight: PlacedLight = {
      id: nextLightId.current++,
      position: worldPosition,
      type: 'point',
      intensity: placedLightIntensity,
      distance: placedLightDistance,
      color: placedLightColor,
      angle: Math.PI / 4,
      penumbra: 0.1,
    };
    setPlacedLights(prev => [...prev, newLight]);
  }, [placedLightIntensity, placedLightDistance, placedLightColor]); 

  const spawnTestLight = useCallback(() => {
      const newLight: PlacedLight = {
          id: nextLightId.current++,
          position: [2, 2, 2], 
          type: 'point',
          intensity: placedLightIntensity,
          distance: placedLightDistance,
          color: placedLightColor,
          angle: Math.PI / 4,
          penumbra: 0.1,
      };
      setPlacedLights((prevLights) => [...prevLights, newLight]);
  }, [placedLightIntensity, placedLightDistance, placedLightColor]); 

  const gltfButtonPosition: [number, number, number] = [0, 10.26, -9.34];

  const handleSaveCamera = (slot: 1 | 2) => {
    setSaveSlotTarget(slot);
    setSaveCameraTrigger(c => c + 1);
  };

  const handleRecallCamera = (slot: 1 | 2) => {
    setRecallSlotTarget(slot);
    setRecallCameraTrigger(c => c + 1);
  };

  const CameraAnimator = () => {
    if (isDebugMode) {
      return null;
    }
    const { camera } = useThree();
    const initialTargetPos = useMemo(() => new THREE.Vector3(-0.05, 9.93, 11.35), []);
    const cardSelectPos = useMemo(() => new THREE.Vector3(0, 2, 8), []);
    const activeCardPos = useMemo(() => new THREE.Vector3(0, 2.5, 20), []);
    const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
    const lookAtTarget = useMemo(() => new THREE.Vector3(0, 0, 0), []);
    const identityQuaternion = useMemo(() => new THREE.Quaternion(), []);
    const currentTargetQuat = useMemo(() => new THREE.Quaternion(), []);

    useFrame((state, delta) => {
      let targetPos: THREE.Vector3;
      let smoothTime = 0.5; 
      if (viewState === 'initial') {
        targetPos = initialTargetPos;
        smoothTime = 0.5;
      } else {
        if (active !== null) {
          targetPos = activeCardPos;
          smoothTime = 0.3;
        } else {
          targetPos = cardSelectPos; 
          smoothTime = 0.4;
        }
      }
      easing.damp3(
        camera.position,
        targetPos,
        smoothTime,
        delta
      );
      if (viewState === 'initial') {
        easing.dampQ(
            camera.quaternion,
            identityQuaternion,
            smoothTime,
            delta
        );
      } else {
        tempMatrix.lookAt(camera.position, lookAtTarget, camera.up);
        currentTargetQuat.setFromRotationMatrix(tempMatrix);
        easing.dampQ(
            camera.quaternion, 
            currentTargetQuat,
            smoothTime,
            delta
        );
      }
    });
    return null;
  };

  const DebugInfoUpdater = () => {
    const { camera } = useThree();
    const positionRef = useRef('');
    const rotationRef = useRef('');
    useFrame(() => {
      const pos = camera.position;
      const rot = camera.rotation;
      const newPositionStr = `Position: { x: ${pos.x.toFixed(2)}, y: ${pos.y.toFixed(2)}, z: ${pos.z.toFixed(2)} }`;
      const newRotationStr = `Rotation: { x: ${(rot.x * 180 / Math.PI).toFixed(1)}°, y: ${(rot.y * 180 / Math.PI).toFixed(1)}°, z: ${(rot.z * 180 / Math.PI).toFixed(1)}° }`;
      let changed = false;
      let newInfo = { position: '', rotation: '' };
      if (newPositionStr !== positionRef.current) {
        positionRef.current = newPositionStr;
        newInfo.position = newPositionStr;
        changed = true;
      }
      if (newRotationStr !== rotationRef.current) {
        rotationRef.current = newRotationStr;
        newInfo.rotation = newRotationStr;
        changed = true;
      }
      if (changed) {
        setDebugInfo((prev: { position: string; rotation: string }) => ({ 
          position: newInfo.position || prev.position, 
          rotation: newInfo.rotation || prev.rotation 
        }));
      }
    });
    return null;
  };

  const CameraResetter = ({ trigger }: { trigger: number }) => {
    const { camera } = useThree();
    useEffect(() => {
      if (trigger > 0) {
        camera.rotation.z = 0;
      }
    }, [trigger, camera]);
    return null;
  };

  const removePlacedLight = useCallback((idToRemove: number) => {
    setPlacedLights(prev => prev.filter(light => light.id !== idToRemove));
  }, []);

  const spawnGltf = (url: string, position?: [number, number, number]) => {
    const newObject: SpawnedObject = {
      id: nextSpawnedObjectId.current++,
      url,
      position: position ?? [0, 1.5, 0],
    };
    setSpawnedObjects((prev) => [...prev, newObject]);
  };

  const toggleBumpMapOnFirstIphone = () => {
    let targetId: number | null = null;
    let didApply = false;
    let didRemove = false;
    setSpawnedObjects(prevObjects => {
      let updated = false;
      const newObjects = prevObjects.map(obj => {
        if (!updated && obj.url === '/iphone11.glb') {
          updated = true; 
          targetId = obj.id;
          if (obj.bumpMapConfig) {
            didRemove = true;
            return {
              ...obj,
              bumpMapConfig: undefined,
            };
          } else {
            didApply = true;
            return {
              ...obj,
              bumpMapConfig: {
                textureUrl: '/scratch_mask.png',
                bumpScale: -0.02,
              },
            };
          }
        }
        return obj;
      });
      if (targetId !== null) {
        if (didApply) {
            setBumpMapStatus(`Scratch map APPLIED to iPhone ID: ${targetId}`);
        } else if (didRemove) {
            setBumpMapStatus(`Scratch map REMOVED from iPhone ID: ${targetId}`);
        }
      } else if (prevObjects.some(o => o.url === '/iphone11.glb')) {
         setBumpMapStatus("No iPhone found that needed toggling."); 
      } else {
         setBumpMapStatus("No iPhone spawned to toggle map on.");
      }
      return newObjects;
    });
    if (spawnedObjects.length === 0) {
        setBumpMapStatus("No objects spawned yet.");
    }
  };

  const toggleMouseLight = useCallback(() => {
    setIsMouseLightActive(prev => !prev);
  }, []);

  const MouseLightController = ({ isActive, setPosition }: { isActive: boolean; setPosition: Dispatch<SetStateAction<THREE.Vector3>> }) => {
    const { raycaster, camera } = useThree();
    const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
    const intersectionPoint = useMemo(() => new THREE.Vector3(), []);
    useFrame(() => {
      if (!isActive) return; 
      const mouseCoords = new THREE.Vector2(normalizedMousePosition.x, normalizedMousePosition.y);
      raycaster.setFromCamera(mouseCoords, camera);
      if (raycaster.ray.intersectPlane(plane, intersectionPoint)) {
        intersectionPoint.y += 0.5; 
        setPosition(intersectionPoint.clone()); 
      } 
    });
    return null; 
  };

  const updateLightPosition = useCallback((id: number, newPosition: THREE.Vector3) => {
      setPlacedLights(prevLights => 
          prevLights.map(light => 
              light.id === id ? { ...light, position: [newPosition.x, newPosition.y, newPosition.z] } : light
          )
      );
  }, []);

  const updatePlacedLightProperty = useCallback((id: number, property: keyof PlacedLight, value: any) => {
      setPlacedLights(prevLights => 
          prevLights.map(light => {
              if (light.id === id) {
                  return { ...light, [property]: value };
              }
              return light;
          })
      );
  }, []);

  return (
    <div className="relative w-full h-full">
      <AnimatePresence>
        <motion.div 
          key={bottomColor}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 z-10"
          style={{
            background: `linear-gradient(to bottom, #ffffff 0%, #ffffff 10%, ${bottomColor} 100%)`,
            pointerEvents: 'none'
          }}
        />
      </AnimatePresence>

      <div 
        id="card-container"
        style={{ 
          willChange: "transform, opacity",
          zIndex: active === null ? '25' : '20'
        }}
        className={`h-full w-full relative overflow-hidden ${active === null ? 'pointer-events-auto' : ''}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          if (active === null) {
            setShowLeftArrow(false);
            setShowRightArrow(false);
            setIsHoveringLeft(false);
            setIsHoveringRight(false);
            setInArrowZone(false);
            setArrowInteraction(false);
          }
        }}
      >
        {!isLoaded && <LoadingScreen onLoaded={() => setIsLoaded(true)} />}

        <AnimatePresence>
          {viewState === 'cardSelection' && (
            <motion.div
              key="cardSelectionUI"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.1, duration: 0.5 } }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30"
              style={{ pointerEvents: 'none' }}
            >
              <div style={{ pointerEvents: 'auto' }}>
                <ActiveUi
                  active={active}
                  setActive={setActive}
                  cardArr={cardArr}
                  setCardArr={setCardArr}
                  flipCard={flipCard}
                />
              </div>

              {showUI && shouldShowArrows && (
                <>
                  {/* Left blocking zone */}
                  <div 
                    className={`absolute left-0 top-0 h-full transition-opacity duration-300 ease-in-out ${
                      isHoveringLeft ? 'opacity-100' : 'opacity-0'
                    }`}
                    style={{ 
                      width: '160px', 
                      zIndex: 39, 
                      pointerEvents: isHoveringLeft ? 'auto' : 'none'
                    }}
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                  />
                  {/* Right blocking zone */}
                  <div 
                    className={`absolute right-0 top-0 h-full transition-opacity duration-300 ease-in-out ${
                      isHoveringRight ? 'opacity-100' : 'opacity-0'
                    }`}
                    style={{ 
                      width: '160px', 
                      zIndex: 39, 
                      pointerEvents: isHoveringRight ? 'auto' : 'none'
                    }}
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                  />
                  {/* Left Arrow */}
                  <div 
                    className={`absolute left-6 top-1/2 -translate-y-1/2 z-40 transition-opacity duration-300 ease-in-out ${
                      showLeftArrow ? 'opacity-90' : 'opacity-0'
                    } ${scrollPosition <= maxScrollLeft + 0.1 ? 'pointer-events-none opacity-30' : 'hover:opacity-100'}`}
                    style={{ pointerEvents: 'auto' }}
                    onMouseEnter={() => {
                      setShowLeftArrow(true);
                      setInArrowZone(true);
                      setArrowInteraction(true);
                      if (scrollPosition > maxScrollLeft + 0.1) {
                        setIsHoveringLeft(true);
                        setIsHoveringRight(false);
                      }
                    }}
                    onMouseLeave={() => {
                      setShowLeftArrow(false);
                      setIsHoveringLeft(false);
                      setArrowClicked(false);
                      setTimeout(() => setArrowInteraction(false), 100);
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setArrowInteraction(true);
                      if (scrollPosition > maxScrollLeft + 0.1) {
                        setArrowClicked(true);
                      }
                    }}
                    onMouseUp={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setArrowClicked(false);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      const nativeEvent = e.nativeEvent as unknown as ExtendedEvent;
                      nativeEvent.__handled = true;
                    }}
                  >
                    <div 
                      className="flex items-center justify-center w-16 h-16 rounded-full bg-white/90 shadow-lg cursor-pointer backdrop-blur-sm border border-white/20 hover:bg-white transition-all duration-200"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                    >
                      <IoIosArrowBack size={34} className="text-gray-700" />
                    </div>
                  </div>
                  {/* Right Arrow */}
                  <div 
                    className={`absolute right-6 top-1/2 -translate-y-1/2 z-40 transition-opacity duration-300 ease-in-out ${
                      showRightArrow ? 'opacity-90' : 'opacity-0'
                    } ${scrollPosition >= maxScrollRight - 0.1 ? 'pointer-events-none opacity-30' : 'hover:opacity-100'}`}
                    style={{ pointerEvents: 'auto' }}
                    onMouseEnter={() => {
                      setShowRightArrow(true);
                      setInArrowZone(true);
                      setArrowInteraction(true);
                      if (scrollPosition < maxScrollRight - 0.1) {
                        setIsHoveringRight(true);
                        setIsHoveringLeft(false);
                      }
                    }}
                    onMouseLeave={() => {
                      setShowRightArrow(false);
                      setIsHoveringRight(false);
                      setArrowClicked(false);
                      setTimeout(() => setArrowInteraction(false), 100);
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setArrowInteraction(true);
                      if (scrollPosition < maxScrollRight - 0.1) {
                        setArrowClicked(true);
                      }
                    }}
                    onMouseUp={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setArrowClicked(false);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      const nativeEvent = e.nativeEvent as unknown as ExtendedEvent;
                      nativeEvent.__handled = true;
                    }}
                  >
                    <div 
                      className="flex items-center justify-center w-16 h-16 rounded-full bg-white/90 shadow-lg cursor-pointer backdrop-blur-sm border border-white/20 hover:bg-white transition-all duration-200"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                    >
                      <IoIosArrowForward size={34} className="text-gray-700" />
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <Canvas 
          className="absolute inset-0 z-20"
          style={{ 
            position: 'absolute', 
            background: 'transparent',
            pointerEvents: (isHoveringLeft || isHoveringRight || arrowInteraction) && active === null ? 'none' : 'auto',
            willChange: "transform"
          }} 
          shadows 
          flat 
          dpr={[1, 1.5]} 
          camera={{
            position: [-0.05, 9.93, 11.35],
            fov: 30,
            near: 1,
            far: 100
          }}
          ref={canvasRef}
          onCreated={(state: any) => {
            if (state.raycaster) {
              state.raycaster.near = 0.1;
              state.raycaster.far = 1000;
            }
            const originalSetFromCamera = state.raycaster.setFromCamera;
            state.raycaster.setFromCamera = function(coords: THREE.Vector2, camera: THREE.Camera) {
              originalSetFromCamera.call(this, coords, camera);
              if (isHoveringLeft || isHoveringRight || arrowInteraction) {
                this.ray.direction.set(0, -1000, 0);
              }
            };
            const handleForceRaycasterUpdate = () => {
              if (state.raycaster) {
                const mouse = new THREE.Vector2(
                  (cursorPosition.x / window.innerWidth) * 2 - 1,
                  -(cursorPosition.y / window.innerHeight) * 2 + 1
                );
                state.raycaster.setFromCamera(mouse, state.camera);
              }
            };
            window.addEventListener('force_raycaster_update', handleForceRaycasterUpdate);
            
            // Store cleanup function without modifying the state object
            const cleanup = () => {
              window.removeEventListener('force_raycaster_update', handleForceRaycasterUpdate);
            };
            
            // Add cleanup function to window for access later
            window.__raycasterCleanup = cleanup;
          }}
        >
          {/* Always render Experience, pass viewState down */}
          <Experience
            cardArr={cardArr}
            active={active}
            setActive={setActive}
            isLoaded={isLoaded}
            scrollPosition={scrollPosition}
            inArrowZone={inArrowZone}
            hoverLocked={hoverLocked}
            cursorPosition={cursorPosition}
            flipCard={flipCard}
            viewState={viewState}
            isDebugMode={isDebugMode}
            // Pass audio timing info
            audioContext={audioContext}
            audioStartTime={audioStartTime}
          />
          {/* Add the camera animator component */}
          <CameraAnimator />
          
          {/* Replace ExploreButton with GltfExploreButton */}
          <GltfExploreButton 
              setViewState={setViewState} 
              position={gltfButtonPosition} 
              isLightPlacementMode={isLightPlacementMode} 
              addPlacedLight={addPlacedLight}
              placedLights={placedLights}
              // Pass light control props
              lightIntensity={placedLightIntensity}
              lightDistance={placedLightDistance}
              lightColor={placedLightColor}
              // Pass inspect mode props
              isInspectMode={isInspectMode}
              setInspectedPartInfo={setInspectedPartInfo}
              // Pass normalized mouse position for initial view interaction
              normalizedMousePosition={normalizedMousePosition}
              // Ensure setIsInspectMode is passed
              setIsInspectMode={setIsInspectMode}
              // Pass debug mode state
              isDebugMode={isDebugMode}
              // Pass viewState
              viewState={viewState}
              // Pass animation toggle state
              isBeatAnimationEnabled={isBeatAnimationEnabled}
              // Pass audio timing info
              audioContext={audioContext}
              audioStartTime={audioStartTime}
              selectedLightId={selectedLightId}
          />
          
          {/* Conditionally render Debug Wall */}
          {showDebugWall && (
            <mesh 
              ref={debugWallRef} 
              position={[gltfButtonPosition[0], gltfButtonPosition[1], gltfButtonPosition[2] + 1.5]} // Place 1.5 units in front of button
            >
              <boxGeometry args={[5, 5, 0.2]} /> {/* Example size */} 
              <meshStandardMaterial color="#cccccc" side={THREE.DoubleSide} />
            </mesh>
          )}

          {/* Conditionally render TransformControls */}
          {showDebugWall && debugWallRef.current && (
            <TransformControls 
              object={debugWallRef.current} 
              mode="translate" // Allow translation only
            />
          )}

          {/* Conditionally enable NEW DebugKeyboardControls */}
          {isDebugMode && <DebugKeyboardControls />}

          {/* Component inside Canvas to update the state */}
          <DebugInfoUpdater /> 

          {/* Component inside Canvas to reset camera Z rotation */}
          <CameraResetter trigger={resetZRotationTrigger} />

          {/* Add the DebugStateBridge inside Canvas */}
          <DebugStateBridge
            isDebugMode={isDebugMode}
            saveCameraTrigger={saveCameraTrigger}
            saveSlotTarget={saveSlotTarget}
            recallCameraTrigger={recallCameraTrigger}
            recallSlotTarget={recallSlotTarget}
            setSavedCameraPos1={setSavedCameraPos1}
            setSavedCameraQuat1={setSavedCameraQuat1}
            setSavedCameraPos2={setSavedCameraPos2}
            setSavedCameraQuat2={setSavedCameraQuat2}
            savedCameraPos1={savedCameraPos1}
            savedCameraQuat1={savedCameraQuat1}
            savedCameraPos2={savedCameraPos2}
            savedCameraQuat2={savedCameraQuat2}
          />

          {/* Render spawned GLTF objects inside Canvas */}
          {isDebugMode && spawnedObjects.map((obj) => (
            <SpawnedGltf
              key={obj.id}
              url={obj.url}
              position={obj.position}
              bumpMapConfig={obj.bumpMapConfig}
              // Pass inspect mode state and the setter function
              isInspectMode={isInspectMode} 
              onInspect={setInspectedPartInfo} // Pass the state setter directly
            />
          ))}

          {/* Add the new SpotLight */}
          <SpotLight
            position={[8.94, 9.93, 8.13]}
            rotation={[0, 26.6 * (Math.PI / 180), 0]} // Convert Y rotation to radians
            angle={Math.PI / 4} // 45 degrees angle
            intensity={1000} // Bright intensity
            penumbra={0.5} // Soft edges
            castShadow
            // target={/* optional: point to a specific object or position */}
          />

          {/* Add the MouseLightController component */}
          <MouseLightController isActive={isMouseLightActive} setPosition={setMouseLightPosition} />

          {/* Conditionally render the Mouse PointLight */}
          {isMouseLightActive && (
            <pointLight 
              position={mouseLightPosition} 
              intensity={mouseLightIntensity} // Use state variable
              distance={10} 
              color={mouseLightColor} // Use state variable
              decay={2}
            />
          )}

          {/* Render the EXTERNAL PlacedLightController */}
          <PlacedLightController 
             lights={placedLights}
             selectedId={selectedLightId}
             onLightMove={updateLightPosition}
             // Pass transformMode down
             transformMode={transformMode}
          />
          
          {/* Render the HUD */}
          <Hud renderPriority={1}> 
            {/* ADDED: Explicit OrthographicCamera for the HUD scene */}
            <OrthographicCamera makeDefault position={[0, 0, 100]} /> 
            <HudPlayButton />
          </Hud>

        </Canvas>

        {/* Render the NEW Debug Menu OUTSIDE the Canvas */}
        <DebugMenu
          isDebugMode={isDebugMode}
          debugInfo={debugInfo}
          setResetZRotationTrigger={setResetZRotationTrigger}
          isLightPlacementMode={isLightPlacementMode}
          setIsLightPlacementMode={setIsLightPlacementMode}
          showDebugWall={showDebugWall}
          setShowDebugWall={setShowDebugWall}
          handleSaveCamera={handleSaveCamera}
          handleRecallCamera={handleRecallCamera}
          savedCameraPos1={savedCameraPos1}
          savedCameraPos2={savedCameraPos2}
          isInspectMode={isInspectMode}
          setIsInspectMode={setIsInspectMode}
          placedLights={placedLights}
          removePlacedLight={removePlacedLight}
          selectedLightId={selectedLightId}
          setSelectedLightId={setSelectedLightId}
          spawnGltf={spawnGltf}
          toggleBumpMapOnFirstIphone={toggleBumpMapOnFirstIphone}
          isBeatAnimationEnabled={isBeatAnimationEnabled}
          setIsBeatAnimationEnabled={setIsBeatAnimationEnabled}
          isMusicPlaying={isMusicPlaying}
          toggleMusic={handleMusicToggleClick}
          bumpMapStatus={bumpMapStatus}
          isMouseLightActive={isMouseLightActive}
          toggleMouseLight={toggleMouseLight}
          spawnTestLight={spawnTestLight} 
        />

        {/* Render the Inspect Info Display OUTSIDE the Canvas */}
        <InspectInfoDisplay inspectedInfo={inspectedPartInfo} />

        {/* Render the Mouse Light Controls OUTSIDE the Canvas */}
        <MouseLightControls 
          isActive={isMouseLightActive}
          lightPosition={mouseLightPosition}
          lightIntensity={mouseLightIntensity}
          setLightIntensity={setMouseLightIntensity}
          lightColor={mouseLightColor}
          setLightColor={setMouseLightColor}
        />

        {/* Container for UI Toggles in Top Left */} 
        <div className="absolute top-4 left-4 z-50 flex items-center space-x-1">
          <MusicToggle
            isMusicPlaying={isMusicPlaying}
            onToggleClick={handleMusicToggleClick}
          />
          <AnimatePresence>
            {isMusicPlaying && (
              <motion.div
                // Start further left, no width animation
                initial={{ opacity: 0, x: -44 }}
                // Animate to final position
                animate={{ opacity: 1, x: 0 }}
                // Exit back to the left, no width animation
                exit={{ opacity: 0, x: -44 }}
                transition={{ duration: 0.3, ease: "easeInOut" }} // Smooth animation
                // Keep overflow hidden to prevent weirdness during fast state changes
                style={{ overflow: 'hidden' }} 
              >
                <BeatToggle
                  isBeatEnabled={isBeatAnimationEnabled}
                  setIsBeatEnabled={setIsBeatAnimationEnabled}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Render Selected Light Editor */} 
        <SelectedLightEditor 
          selectedLightId={selectedLightId}
          placedLights={placedLights}
          updateLightProperty={updatePlacedLightProperty} 
          // Pass transform mode state and setter
          transformMode={transformMode}
          setTransformMode={setTransformMode}
        />

      </div>
    </div>
  );
}