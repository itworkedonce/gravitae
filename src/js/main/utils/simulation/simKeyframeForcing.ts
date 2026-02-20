// -----------------------------
// Simulation Helper: Keyframe Forcing
// -----------------------------
// Forces body position, rotation, and scale to match AE keyframe values.
// Handles velocity inheritance when transitioning from keyframed to physics-driven motion.

import { Body, Sleeping } from "matter-js";
import { AnimationPlan } from "../../types/types";

/**
 * Force body position from AE keyframes and handle velocity at the transition point.
 */
export const forcePosition = (
    body: Body,
    layerId: number,
    plan: AnimationPlan,
    currentCompIdx: number,
    expectedCompFrames: number,
    simulationFps: number,
    compFramerate: number
): void => {
    const posSeries = plan.layers[layerId]?.position?.values;
    if (!posSeries) return;

    const lastPosIdx = plan.layers[layerId]?.position?.last ?? -1;
    const posIsHold = plan.layers[layerId]?.position?.isHold ?? false;
    const lastPosInside =
        typeof lastPosIdx === "number" && lastPosIdx >= 0 && lastPosIdx < expectedCompFrames;

    const shouldForcePos = !lastPosInside || posIsHold || currentCompIdx <= lastPosIdx;

    if (shouldForcePos && currentCompIdx < posSeries.length) {
        const [x, y] = posSeries[currentCompIdx];
        Body.setPosition(body, { x, y });
        if (currentCompIdx < lastPosIdx || posIsHold || !lastPosInside) {
            Body.setVelocity(body, { x: 0, y: 0 });
        }
        Sleeping.set(body, false);
    }

    // Inherit velocity at the last keyframe (transition to physics)
    if (currentCompIdx === lastPosIdx) {
        if (currentCompIdx > 0) {
            const dx = posSeries[currentCompIdx][0] - posSeries[currentCompIdx - 1][0];
            const dy = posSeries[currentCompIdx][1] - posSeries[currentCompIdx - 1][1];
            Body.setVelocity(body, {
                x: dx * (simulationFps / compFramerate),
                y: dy * (simulationFps / compFramerate),
            });
        } else {
            const prePosX = plan.layers[layerId]?.position?.pre[0] ?? posSeries[currentCompIdx][0];
            const prePosY = plan.layers[layerId]?.position?.pre[1] ?? posSeries[currentCompIdx][1];
            const dx = posSeries[currentCompIdx][0] - prePosX;
            const dy = posSeries[currentCompIdx][1] - prePosY;
            Body.setVelocity(body, {
                x: dx * (simulationFps / compFramerate),
                y: dy * (simulationFps / compFramerate),
            });
        }
    }
};

/**
 * Force body rotation from AE keyframes and handle angular velocity at the transition point.
 */
export const forceRotation = (
    body: Body,
    layerId: number,
    plan: AnimationPlan,
    currentCompIdx: number,
    expectedCompFrames: number,
    simulationFps: number,
    compFramerate: number
): void => {
    const rotSeries = plan.layers[layerId]?.rotation?.values;
    if (!rotSeries) return;

    const lastRotIdx = plan.layers[layerId]?.rotation?.last ?? -1;
    const rotIsHold = plan.layers[layerId]?.rotation?.isHold ?? false;
    const lastRotInside =
        typeof lastRotIdx === "number" && lastRotIdx >= 0 && lastRotIdx < expectedCompFrames;

    const shouldForceRot = !lastRotInside || rotIsHold || currentCompIdx <= lastRotIdx;

    if (shouldForceRot && currentCompIdx < rotSeries.length) {
        const rot = rotSeries[currentCompIdx];
        Body.setAngle(body, (rot * Math.PI) / 180);
        if (currentCompIdx < lastRotIdx || rotIsHold || !lastRotInside) {
            Body.setAngularVelocity(body, 0);
        }
        Sleeping.set(body, false);
    }

    // Inherit angular velocity at the last keyframe (transition to physics)
    if (currentCompIdx === lastRotIdx) {
        if (currentCompIdx > 0) {
            const rotDiff = rotSeries[currentCompIdx] - rotSeries[currentCompIdx - 1];
            const angularVelocity = (rotDiff * Math.PI) / 180 * (simulationFps / compFramerate);
            Body.setAngularVelocity(body, angularVelocity);
        } else {
            const rotDiff =
                rotSeries[currentCompIdx] -
                (plan.layers[layerId]?.rotation?.pre ?? rotSeries[currentCompIdx]);
            const angularVelocity = (rotDiff * Math.PI) / 180 * (simulationFps / compFramerate);
            Body.setAngularVelocity(body, angularVelocity);
        }
    }
};

/**
 * Force body scale from AE keyframes.
 */
export const forceScale = (
    body: Body,
    layerId: number,
    plan: AnimationPlan,
    currentCompIdx: number
): void => {
    const scaleSeries = plan.layers[layerId]?.scale?.values;
    const lastScaleIdx = plan.layers[layerId]?.scale?.last ?? -1;

    if (!scaleSeries || currentCompIdx > lastScaleIdx || currentCompIdx >= scaleSeries.length) return;

    const [scaleXPercent, scaleYPercent] = scaleSeries[currentCompIdx];
    const scaleX = scaleXPercent / 100;
    const scaleY = scaleYPercent / 100;

    const EPS = 1e-6;
    const prevScaleXRaw = (body.plugin as any)?.scaleX;
    const prevScaleYRaw = (body.plugin as any)?.scaleY;
    const prevScaleX = Math.max(typeof prevScaleXRaw === "number" ? prevScaleXRaw : 1, EPS);
    const prevScaleY = Math.max(typeof prevScaleYRaw === "number" ? prevScaleYRaw : 1, EPS);

    const targetScaleX = Math.max(scaleX, EPS);
    const targetScaleY = Math.max(scaleY, EPS);
    Body.scale(body, targetScaleX / prevScaleX, targetScaleY / prevScaleY);

    if (!body.plugin) body.plugin = {};
    (body.plugin as any).scaleX = targetScaleX;
    (body.plugin as any).scaleY = targetScaleY;

    Sleeping.set(body, false);
};
