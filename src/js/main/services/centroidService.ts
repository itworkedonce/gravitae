// -----------------------------
// Gravitae Service: centroidService
// -----------------------------
// Provides centroid calculation and anchor/centroid update logic for layers.
// Centralizes centroid and anchor logic for reuse across application layers.

import { useEffect, useRef } from "react";
import log from "../../utils/logger";
import { evalTS } from "../../lib/utils/bolt";
import { ProjectCompositions } from "../types/types";

// -----------------------------
// Types
// -----------------------------

interface UseCentroidServiceProps {
  compData: ProjectCompositions;
  bodiesReady: boolean;
  simulationStatus: "idle" | "preparing" | "running" | "completed";
}

// -----------------------------
// Centroid Service Hook
// -----------------------------
// Updates layer centroids only when bodies are ready and simulation is running
export const useCentroidService = ({
  compData,
  bodiesReady,
  simulationStatus,
}: UseCentroidServiceProps) => {
  // Track if we've already set centroids for current bodies
  const centroidSetRef = useRef(false);

  useEffect(() => {
    const updateCentroids = async () => {
      // Only set centroids if bodies are ready, we haven't set them yet, and simulation is running
      if (
        bodiesReady &&
        (!centroidSetRef.current || simulationStatus === "preparing")
      ) {
        await evalTS("setLayersCentroid", compData);
        centroidSetRef.current = true;
        log.info("Layer centroids updated");
      }
    };

    updateCentroids();
  }, [bodiesReady, compData, simulationStatus]);

  // Reset centroid set flag when compData changes
  useEffect(() => {
    centroidSetRef.current = false;
  }, [compData]);
};

// Keep the original service for direct calls
// export const setLayersCentroidService = async (
//   compData: ProjectCompositions,
//   bodiesReady: boolean
// ) => {
//   if (!bodiesReady) {
//     log.warn("Cannot set layer centroids: bodies not ready");
//     return;
//   }
//   await evalTS("setLayersCentroid", compData);
// };
