// -----------------------------
// Gravitae Component: DataDisplay
// -----------------------------
// Displays layer data and properties in a collapsible tree structure.
// Shows composition and layer information for debugging and inspection.

import React, { useEffect } from 'react';
import styles from './DataDisplay.module.scss';
import { Layer } from '../../types/types';
import { RemoveIcon } from './DataDisplayIcons';
import { MagnetismIcon } from './DataDisplayIcons';
import { ConstraintIcon } from './DataDisplayIcons';
import { useNotifyService } from '../../services/notifyService';
import { evalTS } from '../../../lib/utils/bolt';
import { filterDeletedLayers } from '../../utils/layers';
import { ProjectCompositions } from '../../types/types';
import { Body } from 'matter-js';
import log from '../../../utils/logger';



type LayerEntry = [string, Layer];

// -----------------------------
// Clear Single Layer Service
// -----------------------------
// Custom service to remove a specific layer by ID instead of selected layers.
// Based on clearCurrentLayerService but targets a single layer.
const clearSingleLayerService = async (
  targetLayerId: number,
  compData: ProjectCompositions,
  setCompData: (data: ProjectCompositions) => void,
  notify?: {
    info: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
  }
) => {
  try {
    // Get current composition ID from After Effects
    const currentCompId = (await evalTS("getCompId")) || 0;

    // Filter out any deleted layers from the data
    const filteredLayersData = await filterDeletedLayers(compData);

    // Create a copy of the data to modify
    const updatedData = { ...filteredLayersData };

    // Track which bodies need to be removed for garbage collection
    const bodiesToRemove: Record<number, boolean> = {};

    // Track if the layer was actually deleted and its name
    let layerDeleted = false;
    let deletedLayerName = '';

    // Get the current composition's data
    const currentCompData = updatedData[currentCompId];
    if (currentCompData && typeof currentCompData === "object") {
      // Create a new object for the current composition
      const newCurrentCompData = { ...currentCompData };

      // Process the target layer
      const layerData = currentCompData.layers[targetLayerId];
      if (layerData) {
        // Mark that we're actually deleting a layer that exists
        layerDeleted = true;

        // Collect the layer name for notification
        if (layerData.name) {
          deletedLayerName = layerData.name;
          log.info(`${layerData.name} removed`);
        }

        // Mark layer's bodies for removal
        if (layerData.matterObject && Array.isArray(layerData.matterObject)) {
          layerData.matterObject.forEach((body: Body) => {
            if (body.id) {
              bodiesToRemove[body.id] = true;
            }
          });
        }

        // Remove Gravitae body control values from After Effects
        await evalTS("removeGravitaeBodyControlValues", targetLayerId, currentCompId);

        // Delete the layer from the new composition data
        delete newCurrentCompData.layers[targetLayerId];

        await evalTS("removeInitialValue", targetLayerId);
      }

      // Update the composition data with the new object
      updatedData[currentCompId] = newCurrentCompData;
    }

    // Matter bodies will be reconstructed by useLayerPhysics based on updated compData

    // Filter out any deleted layers and update state
    const finalData = await filterDeletedLayers(updatedData);
    setCompData(finalData);

    // Show notification with deleted layer name
    if (layerDeleted && notify && deletedLayerName) {
      notify.info(`${deletedLayerName} removed`);
    }
  } catch (error) {
    log.error("Error clearing single layer:", error);
    if (notify) {
      notify.error("Failed to remove layer");
    }
  }
};

// -----------------------------
// Layer Item Component
// -----------------------------
// Renders a single layer with essential information only.
// Shows layer name and static status in a simple format.
const LayerItem: React.FC<{
  layerId: string;
  layerData: Layer;
  onRemove: (layerId: string) => void;
}> = ({
  layerId,
  layerData,
  onRemove,
}) => (
    <div className={styles['layer-data-container']}>
      <div className={styles['layer-data']}>
        <span className={styles['layer-data-name']}>{layerData.name || 'Unnamed Layer'}</span>
        {/* <span className={styles['layer-data-symbol']}>
          <MagnetismIcon isActive={false} />
        </span> */}
        {/* <span className={styles['layer-data-symbol']}>   <ConstraintIcon isActive={false} /></span> */}
        <span className={styles['layer-data-type']}>
          {layerData.isStatic ? 'Static' : 'Dynamic'}
        </span>
        <span
          className={styles['layer-data-remove']}
          onClick={() => onRemove(layerId)}
          style={{ cursor: 'pointer' }}
        >
          <RemoveIcon />
        </span>
      </div>
    </div>

  );

// -----------------------------
// Data Display Component
// -----------------------------
// Main component that displays all layers in the current composition.
// Manages collapsed state for each layer and renders the layer tree.
// Uses useAppState hook to access global state directly.
import { useAppState } from '../../context/AppStateContext';

const DataDisplay: React.FC = () => {
  // Access global state directly using useAppState hook
  const {
    compData,
    setCompData,
    composition: { currentCompId },
  } = useAppState();

  const notify = useNotifyService();

  if (currentCompId === null) return null;

  const compIdNum = currentCompId;
  if (compIdNum === null || !compData[compIdNum]) return null;

  const currentCompLayers = compData[compIdNum].layers;
  const layerEntries = Object.entries(currentCompLayers) as LayerEntry[];

  // Handle removing a specific layer
  const handleRemoveLayer = async (layerId: string) => {
    try {
      // Create a custom version of clearCurrentLayerService for single layer
      await clearSingleLayerService(
        parseInt(layerId, 10),
        compData,
        setCompData,
        notify
      );
    } catch (error) {
      notify.error('Failed to remove layer');
    }
  };

  // Extract gravity angle, scale, and drag from compData[compIdNum]
  const currentComp = compData[compIdNum];
  const currentGravityAngle = currentComp?.gravityAngle ?? 'N/A';
  const currentScale = currentComp?.gravityScale ?? 'N/A';
  const currentDrag = currentComp?.drag ?? 'N/A';

  return (
    <div>
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
            onRemove={handleRemoveLayer}
          />
        ))}
      </div>
    </div>
  );
};

export default DataDisplay;
