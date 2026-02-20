// -----------------------------
// Button Handler Service
// -----------------------------
// Central service for handling all button interactions in the UI.
// Each function corresponds to a specific button action and manages
// the flow between UI, state management, and After Effects integration.
import { ProjectCompositions } from "../types/types";
import { clearLayerBodyService } from "./clearLayerService";
import { createOrUpdateWorldController } from "./worldControllerService";
import { fetchLayerDataService } from "./bodyService";
import exp from "constants";
// -----------------------------
// Type Definitions
// -----------------------------
// Interface for props passed to all button handler functions
export interface ButtonHandlerServiceProps {
  compData: ProjectCompositions;
  setCompData: React.Dispatch<React.SetStateAction<ProjectCompositions>>;
  updateTimingInfo: () => Promise<void>;
}

// -----------------------------
// Fetch Button
// -----------------------------
// runst fetchLayerDataService
export const handleFetchButtonClick = async (
  props: ButtonHandlerServiceProps
) => {
  const { compData, setCompData } = props;
  return await fetchLayerDataService(compData, setCompData, false);
};

// -----------------------------
// Dynamic Button Handler
// -----------------------------
// Creates physics bodies with dynamic physics (affected by gravity and forces)
// Used when user clicks the "Dynamic" button to make layers fall and bounce
export const handleDynamicButtonClick = async (
  props: ButtonHandlerServiceProps
) => {
  const { compData, setCompData, updateTimingInfo } = props;
  await updateTimingInfo();
  return await fetchLayerDataService(compData, setCompData, false);
};

// -----------------------------
// Static Button Handler
// -----------------------------
// Creates physics bodies with static physics (immovable, fixed in place)
// Used when user clicks the "Static" button to create anchor points
export const handleStaticButtonClick = async (
  props: ButtonHandlerServiceProps
) => {
  const { compData, setCompData, updateTimingInfo } = props;
  await updateTimingInfo();
  return await fetchLayerDataService(compData, setCompData, true);
};

// -----------------------------
// Run Button Handler
// -----------------------------
// Initiates the physics simulation with existing layer data.
// Uses undefined for isStatic to preserve existing layer states.
export const handleRunButtonClick = async (
  props: ButtonHandlerServiceProps
): Promise<void> => {
  const { compData, setCompData, updateTimingInfo } = props;
  await updateTimingInfo();
  // Preserve existing static/dynamic states and rely on fetch to return
  // the authoritative set of existing layers (deleted layers dropped)
  await fetchLayerDataService(compData, setCompData, undefined, true);
};

// -----------------------------
// Clear Button Handler
// -----------------------------
// Removes physics bodies for selected layers in After Effects
// Used when user clicks the "Clear" button to clean up simulation data
export const handleClearButtonClick = async (
  props: ButtonHandlerServiceProps
) => {
  const { compData, setCompData, updateTimingInfo } = props;
  await updateTimingInfo();
  await clearLayerBodyService(compData, setCompData);
};

export const handleSettingsButtonClick = async (compId: number) => {
  await createOrUpdateWorldController(compId);
};
// -----------------------------
// Centroid Button Handler
// -----------------------------
// Sets anchor points for selected layers to match their matter body positions
// Used when user clicks the "Centroid" button to align anchors
export const handleCentroidButtonClick = async (
  props: ButtonHandlerServiceProps
) => {
  const { compData } = props;
};
