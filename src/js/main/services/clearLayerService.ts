// -----------------------------
// Clear Layer Service
// -----------------------------
// Service to clear Matter.js bodies for selected layers in After Effects.
// Removes physics bodies from both the composition data and the matterBodies state.
// Used by the Clear button to clean up simulation data for selected layers.

import { evalTS } from "../../lib/utils/bolt";
import { ProjectCompositions, Layer } from "../types/types";
import { fetchLayerDataService } from "./bodyService";
import log from "../../utils/logger";

export const clearLayers = (
  compData: ProjectCompositions,
  layerIds: number[]
): ProjectCompositions => {
  const layerIdSet = new Set(layerIds);

  Object.values(compData).forEach((comp) => {
    const layers = comp.layers;
    if (!layers) return;
    layerIdSet.forEach((id) => {
      if (id in layers) {
        delete layers[id];
      }
    });
  });

  return compData;
};

// -----------------------------
// Clear Layer Body Service
// -----------------------------
// Removes physics bodies for selected layers and updates both compData and matterBodies state.
// Performs garbage collection by setting bodies to null before deletion.
export const clearLayerBodyService = async (
  compData: ProjectCompositions,
  setCompData: React.Dispatch<React.SetStateAction<ProjectCompositions>>
) => {

  try {
    // Get selected layer IDs from After Effects
    const selectedLayerIds = await evalTS("getSelectedLayersId");
    if (
      !selectedLayerIds ||
      !Array.isArray(selectedLayerIds) ||
      selectedLayerIds.length === 0
    ) {
      return;
    }
    const updatedCompData = clearLayers(compData, selectedLayerIds);
    await fetchLayerDataService(compData, setCompData, undefined, true);
  } catch (error) {
    log.error("Error clearing layer bodies:", error);
  }
};
