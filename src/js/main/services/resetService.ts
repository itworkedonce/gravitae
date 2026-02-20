// -----------------------------
// Reset Service
// -----------------------------
// Handles the resetting of simulation data on After Effects layers.
// Clears applied keyframes and expressions to return layers to their initial state.

import { evalTS } from "../../lib/utils/bolt";
import log from "../../utils/logger";
import { ProjectCompositions } from "../types/types";

interface ResetButtonProps {
    compData: ProjectCompositions;
    currentCompId: number | null;
}

// -----------------------------
// Handle Reset Button Click
// -----------------------------
// Triggers the reset process for all layers in the current composition.
// Calls the host script to remove simulation effects and keyframes.
export const handleResetButtonClick = async ({
    compData,
    currentCompId,
}: ResetButtonProps) => {
    if (!currentCompId) {
        log.warn("No active composition.");
        return;
    }

    const compIdNum = currentCompId!;
    const currentComp = compData[compIdNum];

    if (!currentComp || !currentComp.layers) {
        log.warn("No layer data found for current composition.");
        return;
    }

    log.info("Resetting simulation on After Effects layers...");

    // Get all layer IDs from the composition
    const layerIds = Object.keys(currentComp.layers).map(Number);

    try {
        await evalTS(
            "resetSimulationOnLayers",
            compIdNum,
            layerIds
        );

        log.info("Finished resetting simulation.");
    } catch (error) {
        log.error("Failed to reset simulation", error);
    }
};
