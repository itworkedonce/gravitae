// -----------------------------
// Simulation Service
// -----------------------------
// Provides utilities for controlling simulation playback, timing, and animation state.
// Used by the Canvas and button handlers to manage simulation lifecycle and timing info.

import { ProjectCompositions } from "../types/types";
import { evalTS } from "../../lib/utils/bolt";
import log from "../../utils/logger";

// -----------------------------
// Get Composition Timing Info
// -----------------------------
// Retrieves the composition's framerate, duration, and workarea from After Effects.
export const getCompTimingInfo = async (): Promise<{
  framerate: number;
  duration: number;
  workarea: [number, number];
  compId?: number | null;
}> => {
  // Skip if not in CEP environment
  if (!window.cep) {
    return { framerate: 30, duration: 10, workarea: [0, 10], compId: null };
  }

  let rawCompId;
  try {
    const timingInfo = await evalTS("getTimingInfo");
    rawCompId = timingInfo.compId;
    const compId =
      rawCompId !== null && rawCompId !== undefined ? Number(rawCompId) : null;
    if (!compId) {
      // No active composition: do not log error
      return { framerate: 30, duration: 10, workarea: [0, 10], compId: null };
    }

    const framerate = timingInfo.framerate;
    const duration = timingInfo.duration;
    const workarea = timingInfo.workarea;
    return { framerate, duration, workarea, compId };
  } catch (error) {
    // Only log error if compId was valid before error
    if (
      typeof rawCompId !== "undefined" &&
      rawCompId !== null &&
      String(rawCompId)
    ) {
      log.error(
        "Error fetching composition timing info from After Effects:",
        error
      );
    }
    // Return default values on error
    return { framerate: 30, duration: 10, workarea: [0, 10], compId: null };
  }
};

// Refactored: fetchCompSize is exported as a utility function only. All top-level refs and logic are removed.
export const fetchCompSize = async ({
  setCompSize,
  prevSize,
  prevCompId,
  currentCompId,
}: {
  setCompSize: (size: [number, number]) => void;
  prevSize: { current: [number, number] };
  prevCompId: { current: number | null | undefined };
  currentCompId: number | null | undefined;
}) => {
  try {
    // Skip composition size fetching if not running in CEP environment (browser preview)
    if (!window.cep) {
      const defaultSize: [number, number] = [1920, 1080];
      setCompSize(defaultSize);
      return;
    }

    const size = await evalTS("getCompSize");
    if (size && Array.isArray(size) && size.length === 2) {
      // Check if size has changed or composition ID has changed
      const sizeChanged =
        size[0] !== prevSize.current[0] || size[1] !== prevSize.current[1];
      const compIdChanged = prevCompId.current !== currentCompId;

      // Update the size state without triggering re-renders if unchanged
      if (sizeChanged) {
        setCompSize([size[0], size[1]] as [number, number]);
      }

      // Only notify if:
      // 1. Same comp with new size, OR
      // 2. Different comp (but only if the size has actually changed from previous comp)
      const sameCompWithNewSize = !compIdChanged && sizeChanged;
      const differentCompWithNewSize = compIdChanged && sizeChanged;

      if (sameCompWithNewSize || differentCompWithNewSize) {
        log.info(`Comp ${currentCompId} size: ${size[0]}x${size[1]}`);
      }

      // Update the previous references
      prevCompId.current = currentCompId;
      prevSize.current = [size[0], size[1]];
    }
  } catch (error) {
    log.error("Error fetching composition size:", error);
  }
};

// -----------------------------
// Toggle Simulation Playback
// -----------------------------
// Controls the simulation playback state. Returns a promise for interface consistency.
// The actual simulation control is handled in the Canvas component based on simulationStatus.
export const toggleSimulationPlayback = (
  isPlaying: boolean,
  compData?: ProjectCompositions,
  setCompData?: React.Dispatch<React.SetStateAction<ProjectCompositions>>
) => {
  // This function doesn't modify any objects
  // It just returns a promise to maintain the same interface as other services
  // The actual control of the simulation happens in the Canvas component
  // based on the simulationStatus state
  return Promise.resolve(isPlaying);
};


