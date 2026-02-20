// -----------------------------
// Gravitae Service: worldControllerService
// -----------------------------
// Manages the creation and validation of the Gravitae World controller layer.
// Ensures the world controller exists and has the proper effect applied for physics simulation.

import { evalTS } from "../../lib/utils/bolt";
import log from "../../utils/logger";

// Global reference to the world layer ID
let worldLayer: number | null = null;

// -----------------------------
// Create or Update World Controller
// -----------------------------
// Creates the Gravitae World controller layer if it doesn't exist,
// or ensures the existing layer has the proper effect applied.
export const createOrUpdateWorldController = async (
  compId: number
): Promise<void> => {
  let char = "\u25CE";
  let name = `Gravitae World`;
  const layerExist = await evalTS("checkLayerExist", name);
  if (!layerExist) {
    worldLayer = await evalTS("createWorldController", 1);
    log.info("World controller created");
  } else {
    const gravitaeWorldController = await evalTS(
      "checkEffectExist",
      worldLayer ?? 0,
      compId,
      "Pseudo/GravitaeWorld"
    );
    if (!gravitaeWorldController) {
      if (worldLayer !== null) {
        worldLayer = await evalTS(
          "createWorldController",
          worldLayer
        );
        log.info("World controller updated");
      }
    }
  }
};
