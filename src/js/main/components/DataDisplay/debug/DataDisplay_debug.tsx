// -----------------------------
// Gravitae Component: DataDisplay
// -----------------------------
// Displays layer data and properties in a collapsible tree structure.
// Shows composition and layer information for debugging and inspection.

import React, { useState } from 'react';
import styles from './DataDisplay_debug.module.scss';
import { Layer } from '../../../types/types';
import { formatJSON } from '../../../utils';



// -----------------------------
// Layer Item Props
// -----------------------------
// Interface for the LayerItem component props.
type LayerItemProps = {
  layerId: string;
  layerData: Layer;
  isCollapsed: boolean;
  onToggle: (id: string) => void;
};

type LayerEntry = [string, Layer];

// -----------------------------
// Layer Item Component
// -----------------------------
// Renders a single layer with collapsible property details.
// Shows layer name, ID, and expandable property list.
const LayerItem: React.FC<LayerItemProps> = ({
  layerId,
  layerData,
  isCollapsed,
  onToggle,
}) => (
  <div className={styles['layer-data-container']}>
    <div
      className={styles['data-toggle-button']}
      onClick={() => onToggle(`layer-${layerId}`)}
      role="button"
      aria-expanded={isCollapsed}
      tabIndex={0}
    >
      {isCollapsed ? '-' : '+'}
    </div>
    <div className={styles['layer-data']}>
      <div>
        <span className={styles['data-key']}>Layer Name:</span>{' '}
        {layerData.name || 'Unnamed Layer'}
        <span className={styles['data-key']} style={{ marginLeft: '10px' }}>
          ID:
        </span>{' '}
        {layerId}
      </div>
      {isCollapsed && <PropertyList data={layerData} />}
    </div>
  </div>
);

// -----------------------------
// Property List Props
// -----------------------------
// Interface for the PropertyList component props.
type PropertyListProps = {
  data: Layer;
};

// -----------------------------
// Property List Component
// -----------------------------
// Renders a list of layer properties in key-value format.
// Filters out the 'name' property and formats all other data.
const PropertyList: React.FC<PropertyListProps> = ({ data }) => (
  <div className={styles['layer-properties']}>
    {Object.entries(data)
      .filter(([key]) => key !== 'name')
      .map(([key, value]) => (
        <div key={key} className={styles['property-item']}>
          <span className={styles['data-key']}>{key}:</span>{' '}
          <span className={styles['data-value']}>{formatJSON(value)}</span>
        </div>
      ))}
  </div>
);

// -----------------------------
// Data Display Component
// -----------------------------
// Main component that displays all layers in the current composition.
// Manages collapsed state for each layer and renders the layer tree.
// Uses useAppState hook to access global state directly.
import { useAppState } from '../../../context/AppStateContext';

const DataDisplayDebug: React.FC = () => {
  // Access global state directly using useAppState hook
  const {
    compData,
    composition: { currentCompId },
    physics: { simulationStatus },
    simulation: { frameData },
    timing: { currentTime }
  } = useAppState();

  const [collapsedLayers, setCollapsedLayers] = useState<Set<string>>(
    new Set()
  );

  // Toggle the collapsed state of a layer
  const toggleLayer = (layerId: string) => {
    setCollapsedLayers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(layerId)) {
        newSet.delete(layerId);
      } else {
        newSet.add(layerId);
      }
      return newSet;
    });
  };

  if (currentCompId === null) return null;

  // Convert string ID to number for accessing compData
  const compIdNum = currentCompId;
  if (compIdNum === null || !compData[compIdNum]) return null;

  // Extract gravity angle, scale, and drag from compData[compIdNum]
  const currentComp = compData[compIdNum];
  const currentGravityAngle = currentComp?.gravityAngle ?? 'N/A';
  const currentScale = currentComp?.gravityScale ?? 'N/A';
  const currentDrag = currentComp?.drag ?? 'N/A';

  const currentCompLayers = currentComp.layers;
  const layerEntries = Object.entries(currentCompLayers) as LayerEntry[];

  return (
    <div>
      {/* Display current gravity angle, scale, and drag */}
      <div className={styles['global-properties']}>
        <div><span>Gravity Angle:</span> {currentGravityAngle}</div>
        <div><span>Gravity Scale:</span> {currentScale}</div>
        <div><span>Drag:</span> {currentDrag}</div>
      </div>
      <div className={styles['data-display']}>
        {layerEntries.map(([layerId, layerData]) => (
          <LayerItem
            key={layerId}
            layerId={layerId}
            layerData={layerData}
            isCollapsed={collapsedLayers.has(`layer-${layerId}`)}
            onToggle={toggleLayer}
          />
        ))}

      </div>

    </div>
  );
};

export default DataDisplayDebug;
