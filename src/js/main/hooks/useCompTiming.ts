// -----------------------------
// Gravitae Hook: useCompTiming
// -----------------------------
// Custom hook for fetching and managing composition timing information.
// Provides framerate, duration, workarea, current time, and update function for timing data.

import { useState, useEffect } from "react";
import { getCompTimingInfo } from "../services";
import log from "../../utils/logger";

// -----------------------------
// Use Comp Timing Hook
// -----------------------------
// Fetches and manages composition timing information (framerate, duration, workarea, currentTime).
// Automatically updates timing info on mount and provides update function.
export const useCompTiming = () => {
  const [compFramerate, setCompFramerate] = useState(30); // Default visual framerate
  const [compDuration, setCompDuration] = useState(0); // Default duration
  const [workarea, setWorkarea] = useState<[number, number]>([0, 0]); // Default workarea
  const [currentTime, setCurrentTime] = useState<number>(0); // Default current time

  // Reset currentTime when workarea changes
  useEffect(() => {
    setCurrentTime(workarea[0]);
  }, [workarea]);

  // Function to update timing info from After Effects
  const updateTimingInfo = async () => {
    try {
      const {
        framerate,
        duration,
        workarea: newWorkarea,
        compId,
      } = await getCompTimingInfo();
      if (framerate) setCompFramerate(framerate);
      if (duration) setCompDuration(duration);
      if (
        newWorkarea &&
        (newWorkarea[0] !== workarea[0] || newWorkarea[1] !== workarea[1])
      ) {
        setWorkarea(newWorkarea);
      }
      // Always reset currentTime to workarea start when updating timing info
      if (newWorkarea) {
        setCurrentTime(newWorkarea[0]);
      }
      if (!compId) {
        // No active composition: do not log error or info
        return;
      }
      // Suppress error log if no comp is selected
      if (compId === null) {
        log.info("No active composition: timing info not available.");
      }
    } catch (error) {
      log.error("Error updating composition timing info:", error);
      // Keep existing values on error, don't reset to defaults
    }
  };

  // Get composition timing info when component mounts
  useEffect(() => {
    updateTimingInfo().catch((error) => {
      log.error("Error during initial timing info fetch:", error);
    });
  }, []);

  return {
    compFramerate,
    compDuration,
    workarea,
    currentTime,
    setCurrentTime,
    updateTimingInfo,
  };
};
