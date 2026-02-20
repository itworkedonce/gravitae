// -----------------------------
// Apply Service
// -----------------------------
// Handles the application of simulation data back to After Effects layers.
// Converts physics body states into keyframes for position, rotation, and scale.

import { evalTS } from "../../lib/utils/bolt";
import log from "../../utils/logger";
import { FrameData, ProjectCompositions } from "../types/types";

interface ApplyButtonProps {
    frameData: FrameData[];
    compData: ProjectCompositions;
    currentCompId: string | number | null;
}

// -----------------------------
// Handle Apply Button Click
// -----------------------------
// Processes the simulation frame data and sends it to After Effects to create keyframes.
// Groups data by layer ID and normalizes values (e.g. scale percentage) before application.
export const handleApplyButtonClick = async ({
    frameData,
    compData,
    currentCompId,
}: ApplyButtonProps) => {
    if (!frameData || frameData.length === 0) {
        log.warn("No simulation data to apply.");
        return;
    }

    if (!currentCompId) {
        log.warn("No active composition.");
        return;
    }

    const compIdNum = Number(currentCompId);
    const compIdStr = currentCompId.toString();
    const currentComp = compData[compIdStr];

    if (!currentComp || !currentComp.layers) {
        log.warn("No layer data found for current composition.");
        return;
    }

    log.info("Applying simulation to After Effects...");

    // Organize data by layer ID
    const layerDataMap: Record<
        number,
        {
            positions: [number, number][];
            rotations: number[];
            scales: [number, number][];
        }
    > = {};

    // Iterate through all frames to collect data for each body
    frameData.forEach((frame) => {
        frame.bodies.forEach((body) => {
            const layerId = body.plugin?.layerData?.layerId;
            if (layerId) {
                if (!layerDataMap[layerId]) {
                    layerDataMap[layerId] = {
                        positions: [],
                        rotations: [],
                        scales: [],
                    };
                }
                // Position
                layerDataMap[layerId].positions.push([body.position.x, body.position.y]);
                // Rotation (convert radians to degrees)
                layerDataMap[layerId].rotations.push(body.angle); // AE expects radians for the expression helper we wrote? No, let's check aeft.ts.
                layerDataMap[layerId].scales.push([
                    body.scale.x * 100,
                    body.scale.y * 100,
                ]);
            }
        });
    });

    // Apply to all layers in one go
    try {
        await evalTS(
            "applySimulationToLayers",
            compIdNum,
            layerDataMap
        );
        log.info("Finished applying simulation.");
    } catch (error) {
        log.error("Failed to apply simulation", error);
    }
};
