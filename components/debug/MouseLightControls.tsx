import React, { Dispatch, SetStateAction } from 'react';
import * as THREE from 'three';

interface MouseLightControlsProps {
  isActive: boolean;
  lightPosition: THREE.Vector3;
  lightIntensity: number;
  setLightIntensity: Dispatch<SetStateAction<number>>;
  lightColor: string;
  setLightColor: Dispatch<SetStateAction<string>>;
}

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: '10px',
  right: '10px',
  width: '250px',
  backgroundColor: 'rgba(30, 30, 30, 0.85)',
  color: '#e0e0e0',
  padding: '15px',
  borderRadius: '8px',
  fontSize: '12px',
  fontFamily: 'monospace',
  zIndex: 999,
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

export function MouseLightControls({ 
  isActive, 
  lightPosition, 
  lightIntensity,
  setLightIntensity,
  lightColor,
  setLightColor,
}: MouseLightControlsProps): JSX.Element {
  const dynamicPanelStyle: React.CSSProperties = {
    ...panelStyle,
    opacity: isActive ? 1 : 0,
    transform: isActive ? 'translateX(0)' : 'translateX(100%)',
    pointerEvents: isActive ? 'auto' : 'none',
  };

  return (
    <div style={dynamicPanelStyle}>
      <div style={titleStyle}>Mouse Light Controls</div>
      
      <div style={controlGroupStyle}>
        <span style={labelStyle}>Position:</span>
        <span>
          {`X: ${lightPosition.x.toFixed(1)}, Y: ${lightPosition.y.toFixed(1)}, Z: ${lightPosition.z.toFixed(1)}`}
        </span>
      </div>

      <div style={controlGroupStyle}>
        <label htmlFor="mouseLightIntensity" style={labelStyle}>
          Intensity: {lightIntensity.toFixed(1)}
        </label>
        <input
          type="range"
          id="mouseLightIntensity"
          min="0"
          max="5"
          step="0.1"
          value={lightIntensity}
          onChange={e => setLightIntensity(parseFloat(e.target.value))}
          style={rangeInputStyle}
        />
      </div>

      <div style={controlGroupStyle}>
        <label htmlFor="mouseLightColor" style={labelStyle}>
          Color:
        </label>
        <span>{lightColor}</span>
        <input
          type="color"
          id="mouseLightColor"
          value={lightColor}
          onChange={e => setLightColor(e.target.value)}
          style={colorInputStyle}
        />
      </div>
    </div>
  );
} 