// -----------------------------
// Simulation Helper: Gravity
// -----------------------------
// Updates engine gravity direction and scale based on animated or static gravity properties.

import { Engine } from "matter-js";
import { CompositionData } from "../../types/types";

/**
 * Update the engine gravity vector for the current frame.
 * Reads animated gravity series if present, otherwise falls back to static values.
 */
export const updateGravity = (
    engine: Engine,
    comp: CompositionData | undefined,
    compFrameIdx: number
): number => {
    if (!comp) return 0;

    const gravitySeries = comp.animatedGravityProperties;
    const angleSeries = gravitySeries?.gravityAngle?.values;
    const scaleSeries = gravitySeries?.gravityScale?.values;
    const dragSeries = gravitySeries?.drag?.values;

    const angleRaw = Array.isArray(comp.gravityAngle)
        ? comp.gravityAngle[0]
        : comp.gravityAngle;
    const scaleRaw = Array.isArray(comp.gravityScale)
        ? comp.gravityScale[0]
        : comp.gravityScale;
    const dragRaw = Array.isArray(comp.drag)
        ? comp.drag[0]
        : comp.drag;

    const angleVal =
        angleSeries && compFrameIdx < angleSeries.length
            ? angleSeries[compFrameIdx]
            : typeof angleRaw === "number"
                ? angleRaw
                : 90;
    const scaleVal =
        scaleSeries && compFrameIdx < scaleSeries.length
            ? scaleSeries[compFrameIdx]
            : typeof scaleRaw === "number"
                ? scaleRaw
                : 9.8;
    const dragVal =
        dragSeries && compFrameIdx < dragSeries.length
            ? dragSeries[compFrameIdx]
            : typeof dragRaw === "number"
                ? dragRaw
                : 0;

    const rad = (angleVal * Math.PI) / 180;
    engine.gravity.x = Math.sin(rad) * -1;
    engine.gravity.y = Math.cos(rad);
    engine.gravity.scale = (scaleVal / (9.8 * 3)) * 0.01;

    // Return the normalized frictionAir default from drag
    return Math.max(dragVal, 0) / 100;
};
