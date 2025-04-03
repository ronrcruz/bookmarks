"use client"

import React, { Dispatch, SetStateAction } from 'react'
import * as THREE from 'three'
// Assuming PlacedLight type is defined in DesktopScene for now, adjust if moved
import type { PlacedLight } from '../desktop/DesktopScene' // Corrected path (adjust if needed)

// Define the props interface for the DebugMenu
interface DebugMenuProps {
  isDebugMode: boolean
  debugInfo: { position: string; rotation: string }
  setResetZRotationTrigger: Dispatch<SetStateAction<number>>
  isLightPlacementMode: boolean
  setIsLightPlacementMode: Dispatch<SetStateAction<boolean>>
  showDebugWall: boolean
  setShowDebugWall: Dispatch<SetStateAction<boolean>>
  handleSaveCamera: (slot: 1 | 2) => void
  handleRecallCamera: (slot: 1 | 2) => void
  savedCameraPos1: THREE.Vector3 | null
  savedCameraPos2: THREE.Vector3 | null
  isInspectMode: boolean
  setIsInspectMode: Dispatch<SetStateAction<boolean>>
  placedLights: PlacedLight[]
  placedLightIntensity: number
  setPlacedLightIntensity: Dispatch<SetStateAction<number>>
  placedLightDistance: number
  setPlacedLightDistance: Dispatch<SetStateAction<number>>
  placedLightColor: string
  setPlacedLightColor: Dispatch<SetStateAction<string>>
  removePlacedLight: (id: number) => void
  spawnGltf: (url: string) => void // Function to spawn a GLTF
  applyBumpMapToFirstIphone: () => void // Function to apply bump map
}

// Simple styles for debug UI (can be replaced with Tailwind later)
const debugStyles: { [key: string]: React.CSSProperties } = {
  menuContainer: {
    position: 'fixed',
    top: '10px',
    left: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    color: 'white',
    padding: '15px',
    borderRadius: '8px',
    fontSize: '12px',
    fontFamily: 'monospace',
    zIndex: 1000,
    maxWidth: '280px',
    maxHeight: 'calc(100vh - 20px)',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  section: {
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '4px',
    padding: '10px',
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: '10px',
    fontSize: '13px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
    paddingBottom: '5px',
  },
  button: {
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
    cursor: 'pointer',
    pointerEvents: 'auto',
    width: '100%',
    textAlign: 'left',
    marginBottom: '5px',
    transition: 'background-color 0.2s ease',
  },
  buttonActive: {
    backgroundColor: 'rgba(0, 255, 0, 0.3)',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    backgroundColor: 'rgba(100, 100, 100, 0.2)',
  },
  infoText: {
    marginBottom: '5px',
  },
  inputLabel: {
    display: 'block',
    marginBottom: '3px',
  },
  inputRange: {
    width: '100%',
    marginBottom: '8px',
  },
  inputColor: {
    marginBottom: '8px',
    border: 'none',
    padding: 0,
    width: '30px',
    height: '20px',
    backgroundColor: 'transparent',
  },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '11px',
    padding: '3px 0',
  },
  removeButton: {
    backgroundColor: 'rgba(255, 0, 0, 0.5)',
    border: 'none',
    color: 'white',
    fontSize: '10px',
    padding: '2px 5px',
    borderRadius: '3px',
    cursor: 'pointer',
  },
}

export function DebugMenu({
  isDebugMode,
  debugInfo,
  setResetZRotationTrigger,
  isLightPlacementMode,
  setIsLightPlacementMode,
  showDebugWall,
  setShowDebugWall,
  handleSaveCamera,
  handleRecallCamera,
  savedCameraPos1,
  savedCameraPos2,
  isInspectMode,
  setIsInspectMode,
  placedLights,
  placedLightIntensity,
  setPlacedLightIntensity,
  placedLightDistance,
  setPlacedLightDistance,
  placedLightColor,
  setPlacedLightColor,
  removePlacedLight,
  spawnGltf, // Receive the spawn function
  applyBumpMapToFirstIphone, // Receive the bump map function
}: DebugMenuProps): JSX.Element | null {
  if (!isDebugMode) return null

  return (
    <div style={debugStyles.menuContainer}>
      {/* Camera Info & Controls Section */}
      <div style={debugStyles.section}>
        <div style={debugStyles.sectionTitle}>Camera</div>
        <div style={debugStyles.infoText}>{debugInfo.position}</div>
        <div style={debugStyles.infoText}>{debugInfo.rotation}</div>
        <button
          onClick={() => setResetZRotationTrigger(c => c + 1)}
          style={{ ...debugStyles.button, backgroundColor: 'rgba(200, 50, 50, 0.7)' }}
        >
          Reset Z Rotation
        </button>
        <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
          <button
            onClick={() => handleSaveCamera(1)}
            style={{ ...debugStyles.button, flex: 1 }}
          >
            Save Cam 1
          </button>
          <button
            onClick={() => handleRecallCamera(1)}
            disabled={!savedCameraPos1}
            style={{
              ...debugStyles.button,
              flex: 1,
              ...(savedCameraPos1 ? {} : debugStyles.buttonDisabled),
            }}
          >
            Recall Cam 1
          </button>
        </div>
        <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
          <button
            onClick={() => handleSaveCamera(2)}
            style={{ ...debugStyles.button, flex: 1 }}
          >
            Save Cam 2
          </button>
          <button
            onClick={() => handleRecallCamera(2)}
            disabled={!savedCameraPos2}
            style={{
              ...debugStyles.button,
              flex: 1,
              ...(savedCameraPos2 ? {} : debugStyles.buttonDisabled),
            }}
          >
            Recall Cam 2
          </button>
        </div>
      </div>

      {/* Lighting Section */}
      <div style={debugStyles.section}>
        <div style={debugStyles.sectionTitle}>Lighting (Point Lights)</div>
        <button
          onClick={() => setIsLightPlacementMode(prev => !prev)}
          style={{
            ...debugStyles.button,
            ...(isLightPlacementMode ? debugStyles.buttonActive : {}),
          }}
        >
          {isLightPlacementMode ? 'Exit' : 'Enter'} Placement Mode (R-Click GLTF)
        </button>

        <label htmlFor="lightIntensity" style={debugStyles.inputLabel}>
          Intensity: {placedLightIntensity.toFixed(1)}
        </label>
        <input
          type="range"
          id="lightIntensity"
          min="0"
          max="10"
          step="0.1"
          value={placedLightIntensity}
          onChange={e => setPlacedLightIntensity(parseFloat(e.target.value))}
          style={debugStyles.inputRange}
        />

        <label htmlFor="lightDistance" style={debugStyles.inputLabel}>
          Distance: {placedLightDistance.toFixed(1)}
        </label>
        <input
          type="range"
          id="lightDistance"
          min="0"
          max="5"
          step="0.1"
          value={placedLightDistance}
          onChange={e => setPlacedLightDistance(parseFloat(e.target.value))}
          style={debugStyles.inputRange}
        />

        <label htmlFor="lightColor" style={debugStyles.inputLabel}>
          Color:
        </label>
        <input
          type="color"
          id="lightColor"
          value={placedLightColor}
          onChange={e => setPlacedLightColor(e.target.value)}
          style={debugStyles.inputColor}
        />
        <span>{placedLightColor}</span>

        <div style={{ marginTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.2)', paddingTop: '10px' }}>
          <strong>Placed Lights ({placedLights.length}):</strong>
          {placedLights.length === 0 && <div style={{ fontSize: '11px', opacity: 0.7 }}>None</div>}
          <ul>
            {placedLights.map(light => (
              <li key={light.id} style={debugStyles.listItem}>
                <span>ID: {light.id} (Pos: {light.position.map((p: number) => p.toFixed(1)).join(', ')})</span>
                <button
                  onClick={() => removePlacedLight(light.id)}
                  style={debugStyles.removeButton}
                >
                  X
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Scene Objects / Spawning Section */}
      <div style={debugStyles.section}>
        <div style={debugStyles.sectionTitle}>Scene Objects</div>
        <button
          onClick={() => spawnGltf('/iphone11.glb')} // Call spawn function with URL
          style={debugStyles.button}
        >
          Spawn iPhone 11
        </button>
        <button
          onClick={applyBumpMapToFirstIphone} // Call the passed function
          style={debugStyles.button}
        >
          Apply Scratch Bump to iPhone Screen
        </button>
        {/* Add more spawn buttons here if needed */}
        {/* Maybe add a list of spawned objects later */}
      </div>

      {/* Toggles Section */}
      <div style={debugStyles.section}>
        <div style={debugStyles.sectionTitle}>Toggles</div>
        <button
          onClick={() => setShowDebugWall(prev => !prev)}
          style={{
            ...debugStyles.button,
            ...(showDebugWall ? debugStyles.buttonActive : {}),
          }}
        >
          {showDebugWall ? 'Hide' : 'Show'} Debug Wall
        </button>
        <button
          onClick={() => setIsInspectMode(prev => !prev)}
          style={{
            ...debugStyles.button,
            ...(isInspectMode ? debugStyles.buttonActive : {}),
          }}
        >
          {isInspectMode ? 'Exit' : 'Enter'} Inspect Mode (Click GLTF)
        </button>
      </div>
    </div>
  )
} 