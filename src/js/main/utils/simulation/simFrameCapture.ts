// -----------------------------
// Simulation Helper: Frame Capture
// -----------------------------
// Captures a snapshot of all body states at a given simulation time.

import { Engine } from "matter-js";
import { FrameData, BodyState } from "../../types/types";

/**
 * Capture the current state of all bodies in the engine as a FrameData snapshot.
 */
export const captureFrame = (engine: Engine, time: number): FrameData => {
    return {
        time,
        bodies: engine.world.bodies.map((body): BodyState => ({
            id: body.id,
            position: { x: body.position.x, y: body.position.y },
            angle: body.angle,
            scale: {
                x: (body.plugin as any)?.scaleX || 1,
                y: (body.plugin as any)?.scaleY || 1,
            },
            isStatic: body.isStatic,
            opacity:
                typeof body.render?.opacity === "number"
                    ? body.render.opacity
                    : 1.0,
            fillStyle: body.render?.fillStyle,
            strokeStyle: body.render?.strokeStyle,
            plugin: body.plugin,
        })),
    };
};
