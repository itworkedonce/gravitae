// -----------------------------
// Run Service
// -----------------------------
// Service used specifically for the 'Run' button to prepare and run the physics simulation.
// Performs steps similar to handleBodyService but works with existing layer data instead
// of creating new bodies with isStatic property.

import { ProjectCompositions } from "../types/types";
import { fetchLayerDataService } from "./bodyService";
import log from "../../utils/logger";
import { evalTS } from "../../lib/utils/bolt";

// -----------------------------
// Run Service Function
// -----------------------------
// Prepares and runs the physics simulation with existing layer data.
// Key differences from handleBodyService:
// 1. Works with existing layer data instead of creating new bodies with isStatic property
// 2. Specifically designed for the 'Run' button workflow where layers are already set up
// 3. Used with simulationStatus='running' to ensure proper styling during simulation
export const runService = async (
  compData: ProjectCompositions
  // setCompData: React.Dispatch<React.SetStateAction<ProjectCompositions>>,
  // updateTimingInfo: () => Promise<void>
) => {
  log.info("Shape data updated, matter body creation initiated");
  // return updatedWithBodies;
};
