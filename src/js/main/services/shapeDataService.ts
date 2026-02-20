// -----------------------------
// Shape Data Service
// -----------------------------
// Service for processing and retrieving shape, mask, and text data for each layer.
// Used to update the composition data with the latest shape-related information from After Effects.

import { evalTS } from '../../lib/utils/bolt';
import {
  getShapeLayerData,
  getTextLayerData,
  filterDeletedLayers,
  getSelectedLayerIds,
} from '../utils/index';
import { ProjectCompositions } from '../types/types';
import log from '../../utils/logger';

// -----------------------------
// Process Layer Physics Data
// -----------------------------
// Processes all layers in the current composition to retrieve shape, mask, or text data.
// Updates the composition data with the latest information for each layer type.
export const processLayerPhysicsData = async (
  compData: ProjectCompositions,
  setCompData: React.Dispatch<React.SetStateAction<ProjectCompositions>>
) => {
  try {
    // Get current composition ID from After Effects
    const currentCompId = await evalTS('getCompId');

    if (!currentCompId) {
      log.warn('No current composition ID found');
      return compData;
    }

    // Prepare to update each layer with new shape/mask/text data
    const updatedData = { ...compData };
    const currentCompLayers = compData[currentCompId]?.layers || {};

    // Iterate through all layers in the current composition
    for (const layerId in currentCompLayers) {
      const layer = currentCompLayers[layerId];
      try {
        if (layer.type === 'shape') {
          // Retrieve shape data for shape layers
          const shapeData = await getShapeLayerData(Number(layerId), layer);
          if (!updatedData[currentCompId]) {
            updatedData[currentCompId] = { layers: {} };
          }
          updatedData[currentCompId].layers[layerId] = {
            ...layer,
            ...shapeData,
          };
        } else if (layer.type === 'text') {
          // Retrieve text data for text layers
          const textData = await getTextLayerData(Number(layerId), layer);
          if (!updatedData[currentCompId]) {
            updatedData[currentCompId] = { layers: {} };
          }
          updatedData[currentCompId].layers[layerId] = {
            ...layer,
            ...textData,
          };
        }
      } catch (error) {
        log.error(`Error processing layer ${layerId}:`, error);
      }
    }

    // Filter out any deleted layers from the data
    // Note: Deleted compositions are now handled by useLayerPhysics
    const filteredLayersData = await filterDeletedLayers(updatedData);

    // Update the state with the filtered data
    setCompData(filteredLayersData);

    return updatedData;
  } catch (error) {
    log.error('Error in processLayerPhysicsData:', error);
    return compData;
  }
};

// -----------------------------
// Get Shape Data Service
// -----------------------------
// Wrapper for processLayerPhysicsData for external usage.
export const getShapeDataService = async (
  compData: ProjectCompositions,
  setCompData: React.Dispatch<React.SetStateAction<ProjectCompositions>>
) => {
  return processLayerPhysicsData(compData, setCompData);
};
