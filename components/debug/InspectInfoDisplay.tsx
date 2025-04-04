import React from 'react';
import * as THREE from 'three';

interface InspectInfoDisplayProps {
  inspectedInfo: object | string | null;
}

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  top: '10px',
  right: '10px',
  width: '280px',
  maxHeight: 'calc(100vh - 20px)', 
  overflowY: 'auto',
  backgroundColor: 'rgba(30, 30, 30, 0.85)', // Darker background
  color: '#e0e0e0', // Light gray text
  padding: '15px',
  borderRadius: '8px',
  fontSize: '12px',
  fontFamily: 'monospace',
  zIndex: 999, // Slightly below DebugMenu if they overlap
  border: '1px solid rgba(255, 255, 255, 0.2)',
  backdropFilter: 'blur(5px)',
  WebkitBackdropFilter: 'blur(5px)',
};

const titleStyle: React.CSSProperties = {
  fontWeight: 'bold',
  fontSize: '14px',
  marginBottom: '10px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
  paddingBottom: '5px',
  color: '#ffffff', // White title
};

const preStyle: React.CSSProperties = {
  whiteSpace: 'pre-wrap',       
  wordWrap: 'break-word',       
  margin: 0,                 
  padding: '5px',
  backgroundColor: 'rgba(0, 0, 0, 0.2)', // Slightly darker pre background
  borderRadius: '4px',
  border: '1px solid rgba(255, 255, 255, 0.1)',
};

export function InspectInfoDisplay({ inspectedInfo }: InspectInfoDisplayProps): JSX.Element | null {
  if (!inspectedInfo) {
    return null; // Don't render anything if no info
  }

  return (
    <div style={panelStyle}>
      <div style={titleStyle}>Inspect Mode Info</div>
      {typeof inspectedInfo === 'string' ? (
        <p style={{ margin: 0 }}>{inspectedInfo}</p>
      ) : (
        <pre style={preStyle}>
          {JSON.stringify(inspectedInfo, null, 2)} 
        </pre>
      )}
    </div>
  );
} 