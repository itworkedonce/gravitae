// -----------------------------
// Gravitae Hook: useCompSwitching
// -----------------------------
// Custom hook for tracking composition switching and providing the current composition ID.
// Monitors After Effects for composition changes and manages switching state.
// Handles composition data fetching, cleanup, and cross-composition contamination prevention.

import { useState, useEffect, useRef } from "react";
import { evalTS } from "../../lib/utils/bolt";
import { ProjectCompositions } from "../types/types";
import { fetchLayerDataService } from "../services/bodyService";
import { filterDeletedComps } from "../utils/layers";
import log from "../../utils/logger";

// -----------------------------
// Use Comp Switching Hook
// -----------------------------
// Tracks composition switching and provides the current composition ID.
// Includes retry logic for when no composition is selected.
export const useCompSwitching = (
  compData?: ProjectCompositions | null,
  setCompData?: (
    data:
      | ProjectCompositions
      | ((prev: ProjectCompositions) => ProjectCompositions)
  ) => void,
  setSimulationStatus?: (
    status: "idle" | "preparing" | "running" | "completed"
  ) => void,
  updateTimingInfo?: () => Promise<void> // Add timing update function
) => {
  const [currentCompId, setCurrentCompId] = useState<string | null>(null);
  const lastProcessedCompId = useRef<string | null>(null);

  // -----------------------------
  // Composition Data Management
  // -----------------------------
  // Handles composition switching, layer data fetching, and cleanup of deleted compositions.
  // Clears physics bodies before fetching new data to prevent stale state.
  useEffect(() => {
    // Only process when composition actually changes
    if (currentCompId && currentCompId !== lastProcessedCompId.current) {
      // Fetch layer data and handle empty compositions
      (async () => {
        if (setCompData) {
          await fetchLayerDataService(
            compData || {},
            setCompData,
            undefined,
            true // Don't skip selected layers during composition switching
          );

          // Remove empty compositions from state to prevent memory leaks
          const currentCompId_num = Number(currentCompId);
          if (compData && compData[currentCompId_num]) {
            const layerCount = Object.keys(compData[currentCompId_num].layers).length;

            if (layerCount === 0) {
              setCompData((prevData) => {
                const newData = { ...prevData };
                delete newData[currentCompId_num];
                log.info(`Cleared empty composition ${currentCompId}`);
                return newData;
              });
            }
          }
        }
      })();

      // Periodic cleanup of compositions deleted in After Effects
      const checkDeletedComps = async () => {
        if (compData && Object.keys(compData).length > 0 && setCompData) {
          try {
            const filteredData = await filterDeletedComps(compData);

            // Only update state if compositions were actually removed
            if (JSON.stringify(filteredData) !== JSON.stringify(compData)) {
              setCompData(filteredData);
            }
          } catch (error) {
            log.error(
              "Error checking for deleted compositions during composition switch:",
              error
            );
          }
        }
      };

      checkDeletedComps();
      lastProcessedCompId.current = currentCompId;
    }
  }, [currentCompId, compData, setCompData]);

  // Log when composition actually changes
  useEffect(() => {
    const updateCompData = async () => {
      if (currentCompId !== null && setSimulationStatus) {
        log.info("Switched to Comp " + currentCompId);
        // Use fetchLayerDataService to refresh composition data when switching
        setSimulationStatus("preparing");

        // Reset timer to workarea start when switching compositions
        if (updateTimingInfo) {
          try {
            await updateTimingInfo();
            log.info(
              "Timer reset to workarea start for composition " + currentCompId
            );
          } catch (error) {
            log.error(
              "Error updating timing info on composition switch:",
              error
            );
          }
        }
      }
    };

    updateCompData();
  }, [currentCompId, setSimulationStatus]);
  const [isCompSwitching, setIsCompSwitching] = useState(false);
  const lastCompIdRef = useRef<string | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 5;
  const retryDelay = 500; // 500ms between retries

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const getCurrentCompId = async () => {
      try {
        // Skip composition ID checking if not running in CEP environment (browser preview)
        if (!window.cep) {
          return;
        }

        const compId = await evalTS("getCompId");

        // Convert compId to string if not null
        const stringCompId = compId !== null ? String(compId) : null;

        // If composition ID changed, update state immediately
        if (compId !== null && stringCompId !== lastCompIdRef.current) {
          setIsCompSwitching(true);

          // Update the reference and state
          lastCompIdRef.current = stringCompId;
          setCurrentCompId(stringCompId);

          // Reset retry count on successful update
          retryCountRef.current = 0;

          // Dynamic delay based on existing bodies in the composition
          const existingBodies =
            compData && stringCompId && compData[stringCompId]
              ? Object.keys(compData[stringCompId].layers).length
              : 0;
          const baseDelay = 200; // Base switching delay
          const perBodyDelay = 5; // Additional delay per existing body
          const switchDelay = Math.min(
            baseDelay + existingBodies * perBodyDelay,
            400
          ); // Cap at 400ms

          setTimeout(() => setIsCompSwitching(false), switchDelay);
        } else if (compId === null) {
          // If no composition is selected or it's a 0x0 composition
          if (
            lastCompIdRef.current !== null &&
            retryCountRef.current < maxRetries
          ) {
            // Only retry if we had a valid composition before and lost it
            retryCountRef.current++;
            timeoutId = setTimeout(getCurrentCompId, retryDelay);
          } else if (lastCompIdRef.current !== null) {
            // If we've reached max retries, update the state to null
            lastCompIdRef.current = null;
            setCurrentCompId(null);
            log.info(
              "No valid composition selected or composition has 0x0 dimensions"
            );
          }
        }
      } catch (error) {
        // Only log actual errors, not expected null returns
        if (error && typeof error === "object" && "message" in error) {
          log.error("Error communicating with After Effects:", error.message);
        } // Do not log when no comp is selected; this is not an error
        // Don't update state on error to prevent UI flickering
      }
    };

    // Initial call
    getCurrentCompId();

    // Set up interval to check for composition changes
    const intervalId = setInterval(getCurrentCompId, 1000);

    // Clean up interval and timeout on unmount
    return () => {
      clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return { currentCompId, isCompSwitching };
};
