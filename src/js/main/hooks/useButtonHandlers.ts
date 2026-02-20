// -----------------------------
// Gravitae Hook: useButtonHandlers
// -----------------------------
// Custom hook for managing button interactions and state.
// Provides button configurations and handlers for Dynamic, Static, Run, and Clear actions.

import { useState, useEffect } from "react";
import {
  handleDynamicButtonClick,
  handleStaticButtonClick,
  handleRunButtonClick,
  handleClearButtonClick,
  handleFetchButtonClick,
  handleSettingsButtonClick,
} from "../services";
import { handleApplyButtonClick } from "../services/applyService";
import { handleResetButtonClick } from "../services/resetService";
import log from "../../utils/logger";
import { useNotifyService } from "../services";
import {
  StaticButtonIcon,
  DynamicButtonIcon,
  RunButtonIcon,
  ClearButtonIcon,
  CentroidButtonIcon,
  ConstraintButtonIcon,
  MagnetButtonIcon,
  WorldButtonIcon,
} from "../components/Button/ButtonIcons";
import { useAppState, AppState } from "../context/AppStateContext";
import { ProjectCompositions } from "../types/types";
// -----------------------------
// Use Button Handlers Hook
// -----------------------------
// Manages button state and provides handlers for all button interactions.
// Includes processing state management and button configuration generation.
export const useButtonHandlers = () => {
  const {
    compData,
    setCompData,
    composition: { currentCompId },
    physics: { matterBodies, simulationStatus, setSimulationStatus, bodiesReady },
    timing: { workarea, updateTimingInfo },
    buttons: { isProcessing, setIsProcessing },
    simulation: { frameData, setFrameData },
  } = useAppState() as AppState;

  // Remove local state since we're using shared state now
  // const [isProcessing, setIsProcessing] = useState(false);

  // Reset processing state when simulation stops or completes
  useEffect(() => {
    if (simulationStatus === "idle" || simulationStatus === "completed") {
      setIsProcessing(false);
    }
  }, [simulationStatus]);

  // Disable interactions while pre-calculation or playback is in progress
  const duringAnimation =
    simulationStatus === "running" || simulationStatus === "completed";

  // -----------------------------
  // Dynamic Button Handler
  // -----------------------------
  // Creates dynamic physics bodies for selected layers.
  // Stops any running simulation before creating new bodies.
  const handleDynamicButton = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setSimulationStatus("preparing");
    try {
      await handleDynamicButtonClick({
        compData,
        setCompData,
        updateTimingInfo,
      });
    } catch (error) {
      const errorMessage =
        "Error creating dynamic bodies: " +
        (error instanceof Error ? error.message : String(error));
      // Log directly using the log utility
      log.error(errorMessage, {
        error,
        compData: Object.keys(compData).length,
      });
    } finally {
      setIsProcessing(false);
      // Keep simulationStatus as 'preparing' instead of resetting to 'idle'
    }
  };

  // -----------------------------
  // Static Button Handler
  // -----------------------------
  // Creates static physics bodies for selected layers.
  // Stops any running simulation before creating new bodies.
  const handleStaticButton = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setSimulationStatus("preparing");
    try {
      await handleStaticButtonClick({
        compData,
        setCompData,
        updateTimingInfo,
      });
    } catch (error) {
      const errorMessage =
        "Error creating static bodies: " +
        (error instanceof Error ? error.message : String(error));
      // Display error notification to user
      log.error(errorMessage, {
        error,
        compData: Object.keys(compData).length,
      });
    } finally {
      setIsProcessing(false);
      // Keep simulationStatus as 'preparing' instead of resetting to 'idle'
    }
  };

  // -----------------------------
  // Run Button Handler
  // -----------------------------
  // Starts the physics simulation with existing layer data.
  // Ensures bodies are freshly fetched and reloaded before running.
  const handleRunButton = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // Reset isApplied if it was true
      if (currentCompId && compData[currentCompId]?.isApplied) {
        setCompData((prev: ProjectCompositions) => ({
          ...prev,
          [currentCompId]: {
            ...prev[currentCompId],
            isApplied: false,
          },
        }));
      }

      // Always fetch and update layer data first (via AE)
      await handleRunButtonClick({
        compData,
        setCompData,
        updateTimingInfo,
      });

      // Move to 'preparing' so renderer reloads bodies from latest compData
      setSimulationStatus("preparing");

      // Wait for bodies to be rebuilt from compData (useLayerPhysics sets bodiesReady)
      const start = performance.now();
      while (!bodiesReady && performance.now() - start < 1000) {
        await new Promise((resolve) => setTimeout(resolve, 25));
      }

      // Small buffer to ensure Matter world has refreshed in usePreviewRenderer
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Start simulation with freshly loaded bodies
      setSimulationStatus("running");
    } catch (error) {
      log.error("Run button error:", error);
      setSimulationStatus("idle");
    } finally {
    }
  };

  // -----------------------------
  // Apply Button Handler
  // -----------------------------
  // Applies the simulation results to After Effects layers.
  const handleApplyButton = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      await handleApplyButtonClick({
        frameData,
        compData,
        currentCompId,
      });

      // Mark composition as applied
      if (currentCompId && compData[currentCompId]) {
        setCompData((prev: ProjectCompositions) => ({
          ...prev,
          [currentCompId]: {
            ...prev[currentCompId],
            isApplied: true,
          },
        }));
      }
    } catch (error) {
      log.error("Error applying simulation:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // -----------------------------
  // Reset Button Handler
  // -----------------------------
  // Resets the isApplied flag and clears simulation expressions from layers.
  const handleResetButton = async () => {
    log.info("handleResetButton called, isProcessing:", isProcessing);
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      log.info("Starting reset process...");

      // Clear simulation expressions from After Effects layers
      await handleResetButtonClick({
        compData,
        currentCompId,
      });

      log.info("After handleResetButtonClick completed");

      // Clear frameData
      setFrameData([]);
      log.info("setFrameData([]) called");

      // Reset isApplied flag
      if (currentCompId && compData[currentCompId]) {
        setCompData((prev: ProjectCompositions) => ({
          ...prev,
          [currentCompId]: {
            ...prev[currentCompId],
            isApplied: false,
          },
        }));
        log.info("isApplied set to false");
      } else {
        log.warn("Could not reset isApplied - no currentCompId or compData");
      }

      log.info("Reset completed - isApplied set to false, frameData cleared");
    } catch (error) {
      log.error("Error resetting simulation:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // -----------------------------
  // Clear Button Handler
  // -----------------------------
  // Removes physics bodies for selected layers.
  // Stops simulation and clears layer data.
  const handleClearButton = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setSimulationStatus("preparing");
    try {
      await handleClearButtonClick({
        compData,
        setCompData,
        updateTimingInfo,
      });

      // Wait for state updates to propagate, especially with many bodies
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Now trigger the render update
    } catch (error) {
      const errorMessage =
        "Error clearing bodies: " +
        (error instanceof Error ? error.message : String(error));
      // Log directly using the log utility
      log.error(errorMessage, {
        error,
        compData: Object.keys(compData).length,
      });
      // Reset to idle on error as well
      setSimulationStatus("idle");
    } finally {
      // Dynamic timeout based on number of bodies cleared
      const bodyCount = Object.keys(matterBodies).length;
      const baseTimeout = 200; // Base processing timeout
      const perBodyTimeout = 5; // Additional timeout per body
      const timeout = Math.min(baseTimeout + bodyCount * perBodyTimeout, 400); // Cap at 400ms

      setTimeout(() => setIsProcessing(false), timeout);
    }
  };

  // -----------------------------
  // Centroid Button Handler
  // -----------------------------
  // Sets layer anchor points to match their matter body positions.
  // Maintains visual position by updating layer position to match.
  const handleCentroidButton = async () => {
    // await handleCentroidButtonClick({
    //   compData,
    //   setCompData,
    //   matterBodies,
    //   setMatterBodies,
    //   updateTimingInfo,
    //   workarea,
    //   notify,
    // });
    await handleFetchButtonClick({
      compData,
      setCompData,
      updateTimingInfo,
    });
  };

  const handleSettingsButton = async () => {
    if (currentCompId) {
      await handleSettingsButtonClick(Number(currentCompId));
    }
  };
  // -----------------------------
  // Get Button Configuration
  // -----------------------------
  // Returns array of button configurations with labels, handlers, and disabled states.
  // Used by ButtonContainer to render the UI buttons.
  const getButtonConfig = () => [
    {
      label: "Dynamic",
      onClick: handleDynamicButton,
      disabled: isProcessing || duringAnimation,
      icon: DynamicButtonIcon,
    },
    {
      label: "Static",
      onClick: handleStaticButton,
      disabled: isProcessing || duringAnimation,
      icon: StaticButtonIcon,
    },
    {
      label: "Centroid",
      onClick: handleCentroidButton,
      disabled: isProcessing || duringAnimation,
      icon: CentroidButtonIcon,
    },
    // Magnet and Constraint are already hard-disabled, keep as-is
    {
      label: "Magnet",
      onClick: () => { },
      disabled: true,
      icon: MagnetButtonIcon,
    },
    {
      label: "Constraint",
      onClick: () => { },
      disabled: true,
      icon: ConstraintButtonIcon,
    },

    {
      label: "World",
      onClick: handleSettingsButton,
      disabled: duringAnimation,
      icon: WorldButtonIcon,
    },
    {
      label: "Run",
      onClick: handleRunButton,
      disabled:
        Object.keys(matterBodies).length === 0 ||
        isProcessing ||
        duringAnimation ||
        (currentCompId && compData[currentCompId]?.isApplied),
      icon: RunButtonIcon,
    },
    {
      label: (currentCompId && compData[currentCompId]?.isApplied) ? "RESET" : "Apply",
      onClick: (currentCompId && compData[currentCompId]?.isApplied) ? handleResetButton : handleApplyButton,
      disabled:
        isProcessing ||
        duringAnimation ||
        ((currentCompId && compData[currentCompId]?.isApplied) ? false : (!frameData || frameData.length === 0)),
      icon: undefined, // Apply button usually doesn't have an icon in this design? Or maybe check icons.
    },
    {
      label: "Clear",
      onClick: handleClearButton,
      disabled:
        isProcessing || duringAnimation || Object.keys(compData).length === 0,
      icon: ClearButtonIcon,
    },
  ];

  return {
    isProcessing,
    simulationStatus,
    setSimulationStatus,
    buttonConfig: getButtonConfig(),
  };
};
