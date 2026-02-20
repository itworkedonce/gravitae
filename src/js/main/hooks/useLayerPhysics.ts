// -----------------------------
// Gravitae Hook: useLayerPhysics
// -----------------------------
// Manages physics body lifecycle and composition metadata for Matter.js simulation.
// Coordinates layer data fetching, body creation, and composition size tracking.
// Handles composition switching and automatic cleanup of deleted compositions.

import { useState, useEffect, useRef } from "react";
import { ProjectCompositions, Layer } from "../types/types";
import { createMatterBody } from "../utils/bodies";
import { fetchLayerDataService } from "../services/bodyService";
import { filterDeletedComps } from "../utils/layers";
import { evalTS } from "../../lib/utils/bolt";
import log from "../../utils/logger";

// -----------------------------
// Hook Definition
// -----------------------------
export const useLayerPhysics = ({
  currentCompId,
  setBodiesReady,
  compData,
}: {
  currentCompId?: number | null;
  simulationStatus: string;
  bodiesReady: boolean;
  setBodiesReady: (ready: boolean) => void;
  compData: ProjectCompositions;
  setCompData: (
    data:
      | ProjectCompositions
      | ((prev: ProjectCompositions) => ProjectCompositions)
  ) => void;
}) => {
  // -----------------------------
  // State Management
  // -----------------------------
  // Composition-organized structure for layer data and physics bodies
  // Remove compData and setCompData from state since they're now props
  // const [compData, setCompData] = useState<ProjectCompositions>({});

  const [matterBodies, setMatterBodies] = useState<{ [key: number]: any }>({});
  const [compSize, setCompSize] = useState<[number, number]>([0, 0]);

  // -----------------------------
  // Tracking References
  // -----------------------------
  // Prevent duplicate processing during composition switches
  const lastProcessedCompId = useRef<string | null | undefined>(null);
  const prevCompId = useRef(currentCompId);
  const prevSize = useRef<[number, number]>([0, 0]);
  const prevHadData = useRef(false);

  // -----------------------------
  // Composition Size Management
  // -----------------------------
  // Fetches composition dimensions from After Effects when composition changes.
  // Handles CEP environment detection and prevents unnecessary re-renders.
  useEffect(() => {
    const fetchCompSize = async () => {
      try {
        // Use default dimensions for browser preview mode
        if (!window.cep) {
          const defaultSize: [number, number] = [1920, 1080];
          setCompSize(defaultSize);
          return;
        }

        const size = await evalTS("getCompSize");
        if (size && Array.isArray(size) && size.length === 2) {
          const sizeChanged =
            size[0] !== prevSize.current[0] || size[1] !== prevSize.current[1];
          const compIdChanged = prevCompId.current !== currentCompId;

          // Only update state when dimensions actually change
          if (sizeChanged) {
            setCompSize([size[0], size[1]] as [number, number]);
          }

          // Log size changes for debugging composition switches
          const sameCompWithNewSize = !compIdChanged && sizeChanged;
          const differentCompWithNewSize = compIdChanged && sizeChanged;

          if (
            (sameCompWithNewSize || differentCompWithNewSize) &&
            currentCompId
          ) {
            // Uncomment for size change debugging
            // log.info(`Comp ${currentCompId} size: ${size[0]}x${size[1]}`);
          }

          prevCompId.current = currentCompId;
          prevSize.current = [size[0], size[1]];
        }
      } catch (error) {
        log.error("Error fetching composition size:", error);
      }
    };

    fetchCompSize();
  }, [currentCompId, compData]); // Add currentCompId to dependencies

  // -----------------------------
  // Remove the entire "Layer Data Management" section (lines 99-151)
  // This logic has been moved to useCompSwitching hook

  // -----------------------------
  // Physics Body Creation
  // -----------------------------
  // Creates Matter.js bodies from layer data when composition or simulation state changes.
  // Only processes layers with shape information and handles body creation errors gracefully.
  useEffect(() => {
    const updateBodies = async () => {
      const startTime = performance.now();

      // Normalize currentCompId to a number to match compData keys
      const compIdNum =
        currentCompId !== null && currentCompId !== undefined
          ? currentCompId
          : NaN;

      const currentCompLayers =
        Number.isFinite(compIdNum) && compData[compIdNum]
          ? compData[compIdNum].layers
          : {};

      const hasData = Object.keys(currentCompLayers).length > 0;

      if (!hasData) {
        // Clear bodies and mark as not ready when no valid data exists
        setMatterBodies({});
        setBodiesReady(false);
        prevHadData.current = false;
        return;
      }

      prevHadData.current = true;
      let bodies: { [key: number]: any } = {};

      // Create physics bodies only for layers with shape data
      for (const [id, data] of Object.entries(currentCompLayers)) {
        const layerData = data as Layer;
        const layerId = Number(id);

        if (layerData.shapeInfo) {
          try {
            const storedStartPropertiesValues =
              layerData.startPropertiesValues || {
                bodyType: 1,
                density: 1,
                friction: 0.1,
                frictionAir: 0.01,
                restitution: 0.1,
              };

            const body = createMatterBody(
              layerData,
              layerId,
              storedStartPropertiesValues
            );

            if (body) {
              bodies[layerId] = body;
            }
          } catch (error) {
            log.warn(`Error creating matter body for layer ${id}:`, error);
          }
        } else {
          log.debug(
            `Skipping layer ${layerData.name} (ID: ${id}) - no shapes data`
          );
        }
      }

      // Replace all bodies atomically to prevent partial updates
      setMatterBodies(bodies);
      const endTime = performance.now();
      log.info(`UpdateBodies execution: ${endTime - startTime}ms`);

      setBodiesReady(true);
      log.debug(`Created ${Object.keys(bodies).length} matter bodies`);
    };

    updateBodies();
  }, [currentCompId, compData, setBodiesReady]); // Add currentCompId to dependencies

  // -----------------------------
  // Hook Return Interface
  // -----------------------------
  return {
    matterBodies,
    setMatterBodies,
    compSize,
    // Remove compData and setCompData from return since they're now managed externally
  };
};
