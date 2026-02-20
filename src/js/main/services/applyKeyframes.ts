// -----------------------------
// Apply Keyframes Service
// -----------------------------
// Utilities for applying calculated simulation data as keyframes to specific layer properties.
// Provides individual functions for position and rotation application with logging.

import { evalTS } from "../../lib/utils/bolt";
import log from "../../utils/logger";
import { ProjectCompositions, Layer, CompositionLayers } from "../types/types";

// -----------------------------
// Apply Position Keyframes
// -----------------------------
// Sends calculated position data to After Effects for a specific layer.
// Logs the operation using the layer name from composition data if available.
export const applyPosition = (
  layerId: number,
  compId: number,
  value: [number, number][],
  compData?: ProjectCompositions
) => {
  evalTS("applyCalculatedPosition", layerId, compId, value);

  // Log layer name if compData is provided
  if (compData) {
    const compIdStr = compId.toString();
    const layerIdStr = layerId.toString();

    // Type-safe access to compData using string index
    const compLayers: CompositionLayers | undefined = compData[compIdStr]?.layers;
    if (compLayers) {
      // Convert string to number for type-safe access to layers
      const layerId_num = Number(layerIdStr);
      const layer = compLayers[layerId_num];
      if (layer) {
        log.info(`Position keyframes applied to: ${layer.name}`);
      }
    }
  }
};

// -----------------------------
// Apply Rotation Keyframes
// -----------------------------
// Sends calculated rotation data to After Effects for a specific layer.
// Logs the operation using the layer name from composition data if available.
export const applyRotation = (
  layerId: number,
  compId: number,
  value: number[],
  compData?: ProjectCompositions
) => {
  evalTS("applyCalculateRotation", layerId, compId, value);

  // Log layer name if compData is provided
  if (compData) {
    const compIdStr = compId.toString();
    const layerIdStr = layerId.toString();

    // Type-safe access to compData using string index
    const compLayers: CompositionLayers | undefined = compData[compIdStr]?.layers;
    if (compLayers) {
      // Convert string to number for type-safe access to layers
      const layerId_num = Number(layerIdStr);
      const layer = compLayers[layerId_num];
      if (layer) {
        log.info(`Rotation keyframes applied to: ${layer.name}`);
      }
    }
  }
};
