// -----------------------------
// Gravitae Utility: layers
// -----------------------------
// Utility functions for working with After Effects layers and compositions.
// Includes helpers for creating physics bodies, filtering deleted layers, and getting selected layers.

import { evalTS } from "../../lib/utils/bolt";
import { ProjectCompositions } from "../types/types";
import log from "../../utils/logger";
// import { removeInitialValue } from '../../../jsx/aeft/aeft-layers';
// Don't use React hooks in utility functions
// import { useNotifyService } from '../services';
// -----------------------------
// Create Physics Bodies
// -----------------------------
// Creates physics body data for selected layers in a composition.
// Used to initialize or update layer data for simulation.

// -----------------------------
// Get Selected Layer IDs
// -----------------------------
// Returns the IDs of currently selected layers in After Effects.
export const getSelectedLayerIds = async () => {
  return await evalTS("getSelectedLayersId");
};

// -----------------------------
// Filter Deleted Layers
// -----------------------------
// Removes layers from the composition data that no longer exist in After Effects.
// Also removes empty compositions from the data.
export const filterDeletedLayers = async (
  compData: ProjectCompositions,
  notify?: {
    warn: (msg: string) => void;
    info: (msg: string) => void;
    error: (msg: string) => void;
  }
): Promise<ProjectCompositions> => {
  const currentCompId = await evalTS("getCompId");
  if (!currentCompId) {
    log.warn("No current composition ID found");
    return compData;
  }

  // Create a copy of the data to modify
  const result = { ...compData };

  // Process each composition
  for (const compId in result) {
    const compIdNum = Number(compId);
    const comp = result[compIdNum];
    const compLayers = comp?.layers || {};

    // For the current composition, check which layers still exist
    if (compIdNum === currentCompId) {
      const layerIds = Object.keys(compLayers);

      // Create an array of promises for checking each layer in the current composition
      const checkPromises = layerIds.map(async (id) => {
        const layerId = Number(id);
        try {
          const layerIndex = await evalTS(
            "getLayerById",
            layerId,
            currentCompId
          );
          return { layerId, exists: layerIndex !== null };
        } catch (error) {
          return { layerId, exists: false };
        }
      });

      // Wait for all checks to complete
      const results = await Promise.all(checkPromises);

      // Process results and remove non-existent layers from the current composition
      results.forEach(({ layerId, exists }) => {
        if (!exists) {
          log.info(`${compLayers[layerId]?.name || layerId} filtered in Comp ${compIdNum}`);
          notify?.info(`${compLayers[layerId]?.name || layerId} filtered in Comp ${compIdNum}`);
          delete compLayers[layerId];
        }
      });
    }

    // If the composition is now empty, remove it
    if (Object.keys(compLayers).length === 0) {
      delete result[compIdNum];
      log.info(`Empty comp ${compIdNum} filtered`);
      notify?.info(`Empty comp ${compIdNum} filtered`);
    }
  }

  return result;
};

// -----------------------------
// Filter Deleted Compositions
// -----------------------------
// Removes compositions from the compData that no longer exist in After Effects.
// This ensures that deleted compositions don't remain in the state.
export const filterDeletedComps = async (
  compData: ProjectCompositions
): Promise<ProjectCompositions> => {
  // Create a copy of the data to modify
  const result = { ...compData };

  // Process each composition in the data
  for (const compId in result) {
    const compIdNum = Number(compId);

    try {
      // Check if the composition still exists in After Effects
      const compExists = await evalTS("doesCompExist", compIdNum);

      // If the composition doesn't exist or has no layers, remove it from the data
      if (!compExists || Object.keys(result[compIdNum]).length === 0) {
        delete result[compIdNum];
        log.info(`Comp ${compIdNum} filtered`);
      }
    } catch (error) {
      log.error(`Error checking if composition ${compIdNum} exists:`, error);
    }
  }

  return result;
};
