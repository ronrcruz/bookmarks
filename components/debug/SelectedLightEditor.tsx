import React, { Dispatch, SetStateAction, useCallback } from 'react';
import { PlacedLight } from '../desktop/DesktopScene'; // Assuming type export from DesktopScene
import * as THREE from 'three'; // Needed for Vector3 type hint

// Define allowed light types explicitly
const LIGHT_TYPES = ['point', 'spot', 'directional'] as const;
type LightType = typeof LIGHT_TYPES[number];

interface SelectedLightEditorProps {
  selectedLightId: number | null;
  placedLights: PlacedLight[]; // Needed to display selected light info
  updateLightProperty: (id: number, property: keyof PlacedLight, value: any) => void;
  transformMode: 'translate' | 'rotate';
  setTransformMode: Dispatch<SetStateAction<'translate' | 'rotate'>>;
}

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  top: '180px', // Position below InspectInfoDisplay (adjust as needed)
  right: '10px',
  width: '280px',
  backgroundColor: 'rgba(30, 30, 30, 0.85)', 
  color: '#e0e0e0',
  padding: '15px',
  borderRadius: '8px',
  fontSize: '12px',
  fontFamily: 'monospace',
  zIndex: 998, // Below InspectInfoDisplay and MouseLightControls
  border: '1px solid rgba(255, 255, 255, 0.2)',
  backdropFilter: 'blur(5px)',
  WebkitBackdropFilter: 'blur(5px)',
  transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
};

const titleStyle: React.CSSProperties = {
  fontWeight: 'bold',
  fontSize: '14px',
  marginBottom: '10px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
  paddingBottom: '5px',
  color: '#ffffff',
};

const controlGroupStyle: React.CSSProperties = {
  marginBottom: '10px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '3px',
};

const rangeInputStyle: React.CSSProperties = {
  width: '100%',
};

const colorInputStyle: React.CSSProperties = {
  marginLeft: '5px',
  border: 'none',
  padding: 0,
  width: '30px',
  height: '20px',
  backgroundColor: 'transparent',
  verticalAlign: 'middle',
};

// Add style for dropdown
const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '5px',
  marginBottom: '10px',
  backgroundColor: 'rgba(0, 0, 0, 0.3)',
  color: 'white',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '4px',
  fontFamily: 'monospace',
};

export function SelectedLightEditor({ 
  selectedLightId, 
  placedLights,
  updateLightProperty,
  transformMode,
  setTransformMode,
}: SelectedLightEditorProps): JSX.Element | null {
  
  const selectedLight = placedLights.find(light => light.id === selectedLightId);

  // Dynamic style for visibility
  const dynamicPanelStyle: React.CSSProperties = {
    ...panelStyle,
    opacity: selectedLight ? 1 : 0,
    transform: selectedLight ? 'translateX(0)' : 'translateX(50px)', // Slide in from right
    pointerEvents: selectedLight ? 'auto' : 'none',
  };

  // Handler for input changes
  const handleInputChange = useCallback((property: keyof PlacedLight, value: string | number) => {
      if (selectedLightId !== null) {
          updateLightProperty(selectedLightId, property, value);
      }
  }, [selectedLightId, updateLightProperty]);

  if (!selectedLight) {
      // Render nothing, but keep the element for transition purposes if desired
      // return <div style={dynamicPanelStyle}></div>;
      // Or simply return null if no transition out is needed
      return null; 
  }

  // Specific handler for light type change
  const handleTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (selectedLightId !== null) {
      const newType = event.target.value as LightType;
      updateLightProperty(selectedLightId, 'type', newType);
    }
  };

  return (
    <div style={dynamicPanelStyle}>
      <div style={titleStyle}>Edit Light (ID: {selectedLight.id})</div>
      
      {/* Display Position (Read-only) */}
      <div style={controlGroupStyle}>
        <span style={labelStyle}>Position:</span>
        <span>
          {`X: ${selectedLight.position[0].toFixed(1)}, Y: ${selectedLight.position[1].toFixed(1)}, Z: ${selectedLight.position[2].toFixed(1)}`}
        </span>
      </div>

      {/* --- Light Type Dropdown --- */} 
      <div style={controlGroupStyle}>
        <label htmlFor="lightType" style={labelStyle}>Light Type:</label>
        <select 
          id="lightType"
          value={selectedLight.type}
          onChange={handleTypeChange}
          style={selectStyle}
        >
          {LIGHT_TYPES.map(type => (
            <option key={type} value={type}>
              {type.charAt(0).toUpperCase() + type.slice(1)} Light
            </option>
          ))}
        </select>
      </div>

      {/* --- Controls for SELECTED light settings --- */} 
      
      {/* Intensity Slider */}
      <div style={controlGroupStyle}>
        <label htmlFor="selectedLightIntensity" style={labelStyle}>
          Intensity: {selectedLight.intensity.toFixed(1)}
        </label>
        <input
          type="range"
          id="selectedLightIntensity"
          min="0"
          max="10" 
          step="0.1"
          value={selectedLight.intensity}
          onChange={e => handleInputChange('intensity', parseFloat(e.target.value))}
          style={rangeInputStyle}
        />
      </div>

      {/* Color Picker */}
      <div style={controlGroupStyle}>
        <label htmlFor="selectedLightColor" style={labelStyle}>
          Color:
        </label>
        <span>{selectedLight.color}</span>
        <input
          type="color"
          id="selectedLightColor"
          value={selectedLight.color}
          onChange={e => handleInputChange('color', e.target.value)}
          style={colorInputStyle}
        />
      </div>

      {/* --- Type-Specific Controls --- */} 
      
      {/* Distance (Point/Spot) */}
      {(selectedLight.type === 'point' || selectedLight.type === 'spot') && (
        <div style={controlGroupStyle}>
          <label htmlFor="selectedLightDistance" style={labelStyle}>
            Distance: {selectedLight.distance.toFixed(1)}
          </label>
          <input
            type="range"
            id="selectedLightDistance"
            min="0"
            max="15" 
            step="0.1"
            value={selectedLight.distance}
            onChange={e => handleInputChange('distance', parseFloat(e.target.value))}
            style={rangeInputStyle}
          />
        </div>
      )}

      {/* Angle (Spot) */}
      {selectedLight.type === 'spot' && (
        <div style={controlGroupStyle}>
          <label htmlFor="selectedLightAngle" style={labelStyle}>
            Angle: {(selectedLight.angle ? (selectedLight.angle * 180 / Math.PI) : 0).toFixed(0)}°
          </label>
          <input
            type="range"
            id="selectedLightAngle"
            min="0"
            max="90" // Max angle in degrees
            step="1"
            value={selectedLight.angle ? (selectedLight.angle * 180 / Math.PI) : 0}
            onChange={e => handleInputChange('angle', parseFloat(e.target.value) * Math.PI / 180)} // Convert back to radians
            style={rangeInputStyle}
          />
        </div>
      )}

      {/* Penumbra (Spot) */}
      {selectedLight.type === 'spot' && (
        <div style={controlGroupStyle}>
          <label htmlFor="selectedLightPenumbra" style={labelStyle}>
            Penumbra: {(selectedLight.penumbra ?? 0).toFixed(2)}
          </label>
          <input
            type="range"
            id="selectedLightPenumbra"
            min="0"
            max="1"
            step="0.01"
            value={selectedLight.penumbra ?? 0}
            onChange={e => handleInputChange('penumbra', parseFloat(e.target.value))}
            style={rangeInputStyle}
          />
        </div>
      )}

      {/* --- Transform Mode Toggle --- */} 
      <div style={controlGroupStyle}>
         <button
            onClick={() => setTransformMode(prev => prev === 'translate' ? 'rotate' : 'translate')}
            style={{
                ...rangeInputStyle, // Use rangeInputStyle for full width like sliders
                padding: '5px', // Add padding
                fontSize: '11px', // Smaller font
                cursor: 'pointer',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: 'white',
                textAlign: 'center',
            }}
          >
            Switch to {transformMode === 'translate' ? 'Rotate' : 'Translate'} Mode
          </button>
      </div>
    </div>
  );
} 