// -----------------------------
// Body Service
// -----------------------------
// Handles creation and management of physics bodies for After Effects layers.
// Provides utilities for both simulation and static/dynamic body creation.

import { ProjectCompositions } from "../types/types";
import type { Layer } from "../types/types";
import { evalTS } from "../../lib/utils/bolt";
import log from "../../utils/logger";

export const fetchLayerDataService = async (
  compData: ProjectCompositions,
  setCompData: React.Dispatch<React.SetStateAction<ProjectCompositions>>,
  isStatic?: boolean,
  skipSelected: boolean = false
) => {
  const startTime = performance.now();
  const newCompData = await evalTS(
    "fetchLayerData",
    compData,
    isStatic,
    skipSelected
  );

  // Type assertion to ensure compatibility with ProjectCompositions
  const evalTSEndTime = performance.now();
  if (
    newCompData &&
    typeof newCompData === "object" &&
    !Array.isArray(newCompData)
  ) {
    // Handle empty compositions properly by checking if they should be cleared
    setCompData((prevCompData) => {
      const updatedData = { ...prevCompData };
      const newData: ProjectCompositions = Object.fromEntries(
        Object.entries(newCompData).map(([compId, compObj]) => {
          const typedCompObj = compObj as any; // Type assertion for evalTS return

          return [
            compId,
            {
              ...typedCompObj,
              layers: Object.fromEntries(
                Object.entries(typedCompObj.layers ?? {}).map(([layerId, layer]) => [Number(layerId), layer])
              )
            }
          ];
        })
      );

      // Check previous compositions: if they existed before but have no layers
      // in the new data, clear them (synchronous — no async inside setState)
      Object.keys(prevCompData).forEach((prevCompId) => {
        const prevCompIdNum = Number(prevCompId);
        if (
          prevCompData[prevCompIdNum]?.layers &&
          newData[prevCompIdNum] &&
          (!newData[prevCompIdNum].layers || Object.keys(newData[prevCompIdNum].layers).length === 0)
        ) {
          delete updatedData[prevCompIdNum];
          log.info(`Cleared empty composition ${prevCompId}`);
        }
      });

      // For each composition in the new data
      Object.keys(newData).forEach((compId) => {
        const compIdNum = Number(compId);
        const newCompLayers = newData[compIdNum];

        // If the new composition data is empty or has no layers, remove it entirely
        if (!newCompLayers || Object.keys(newCompLayers).length === 0) {
          delete updatedData[compIdNum];
        } else {
          // Otherwise, merge the new layer data with existing layers
          if (updatedData[compIdNum]) {
            const existingComp = updatedData[compIdNum];
            const mergedLayers: Record<number, Layer> = {} as any;
            Object.entries(newCompLayers.layers || {}).forEach(([lid, newLayer]) => {
              const idNum = Number(lid);
              const existingLayer = existingComp.layers ? existingComp.layers[idNum] : undefined;
              mergedLayers[idNum] = existingLayer ? { ...(existingLayer as Layer), ...(newLayer as Layer) } : (newLayer as Layer);
            });

            const nextComp: any = {
              ...existingComp,
              ...newCompLayers,
              layers: mergedLayers,
            };
            if (!('animatedGravityProperties' in newCompLayers)) {
              delete nextComp.animatedGravityProperties;
            }
            updatedData[compIdNum] = nextComp;
          } else {
            // If composition doesn't exist, create it with the new layers
            updatedData[compIdNum] = newCompLayers;
          }
        }
      });

      return updatedData;
    });
    const totalEndTime = performance.now();

    log.info(`evalTS execution: ${evalTSEndTime - startTime}ms`);
    log.info(`Total fetchLayerDataService: ${totalEndTime - startTime}ms`);
  } else if (newCompData === null || newCompData === undefined) {
    // Actual error from evalTS - log as warning
    log.warn("Fetch layer data returned null or undefined");
  } else if (
    typeof newCompData === "object" &&
    Object.keys(newCompData).length === 0
  ) {
    // Empty composition (legitimate case) - log as info or debug
    log.info("No composition data available");
    // Don't clear all data - just log the empty state
    // The composition switching logic in useLayerPhysics will handle cleanup
  } else {
    // Unexpected data type - log as warning
    log.warn(`Unexpected data type: ${typeof newCompData}`);
  }

  return compData;
};
