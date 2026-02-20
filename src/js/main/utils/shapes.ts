// -----------------------------
// Gravitae Utility: shapes
// -----------------------------
// Utility functions for retrieving shape, mask, and text data for After Effects layers.
// Used to extract geometry and mask information for simulation and display.

import { evalES,evalTS } from '../../lib/utils/bolt';

// -----------------------------
// Get Shape Layer Data
// -----------------------------
// Retrieves shape data for a shape layer by calling After Effects.
// Returns the layer data with an added 'shapes' property.
export const getShapeLayerData = async (layerId: number, layerData: any) => {
  const layerShapes = await evalTS('getShapeLayerInfo', layerId);
  return {
    ...layerData,
    shapes: layerShapes,
  };
};


// -----------------------------
// Get Text Layer Data
// -----------------------------
// Retrieves shape data for a text layer by calling After Effects.
// Returns the layer data with an added 'shapes' property.
export const getTextLayerData = async (layerId: number, layerData: any) => {
  const layerShapes = await evalTS('getTextLayerInfo', layerId);
  return {
    ...layerData,
    shapes: layerShapes,
  };
};
