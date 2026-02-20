// -----------------------------
// Simulation Helper: In/Out Point Handling
// -----------------------------
// Manages body visibility and collision state based on After Effects layer in/out points.
// Bodies outside their in/out range are put to sleep and disabled from collisions.

import { Body, Sleeping } from "matter-js";
import { AnimationPlan } from "../../types/types";

interface InOutResult {
    isDisabled: boolean;
    isAtInPoint: boolean;
    inPointAfterWorkarea: boolean;
}

/**
 * Check if a body should be disabled based on its in/out points relative to the current frame.
 */
export const checkInOutStatus = (
    inOut: number[] | undefined,
    nextCompFrame: number,
    compFramerate: number,
    workareaStart: number
): InOutResult => {
    const inPointFrame = inOut && inOut[0] ? Math.round(inOut[0] * compFramerate) : 0;
    const outPointFrame = inOut && inOut[1] ? Math.round(inOut[1] * compFramerate) : Infinity;
    const workareaStartFrame = Math.round(workareaStart * compFramerate);

    const isBeforeInPoint = inPointFrame > workareaStartFrame && nextCompFrame < inPointFrame;
    const isAfterOutPoint = nextCompFrame >= outPointFrame;
    const isDisabled = isBeforeInPoint || isAfterOutPoint;
    const inPointAfterWorkarea = inPointFrame > workareaStartFrame;

    return {
        isDisabled,
        isAtInPoint: nextCompFrame === inPointFrame,
        inPointAfterWorkarea,
    };
};

/**
 * Apply disabled state to a body: sleep it, dim opacity, and disable collisions.
 */
export const applyDisabledState = (body: Body): void => {
    Sleeping.set(body, true);
    if (body.render) {
        body.render.opacity = 0.25;
        if (body.parts && body.parts.length > 1) {
            body.parts.forEach((part) => {
                if (part !== body && part.render) {
                    part.render.opacity = 0.25;
                }
            });
        }
    }
    body.collisionFilter.category = 0x0000;
    body.collisionFilter.mask = 0x0000;
};

/**
 * Apply enabled (normal) state to a body: restore opacity and enable collisions.
 */
export const applyEnabledState = (body: Body, isStatic: boolean): void => {
    if (body.render) {
        const normalOpacity = isStatic ? 0.5 : 1;
        body.render.opacity = normalOpacity;
        if (body.parts && body.parts.length > 1) {
            body.parts.forEach((part) => {
                if (part !== body && part.render) {
                    part.render.opacity = normalOpacity;
                }
            });
        }
    }
    body.collisionFilter.category = 0x0001;
    body.collisionFilter.mask = 0xffff;
};

/**
 * Handle body state at its in-point frame: determine static/dynamic and apply visual style.
 */
export const handleInPointActivation = (
    body: Body,
    layerId: number,
    plan: AnimationPlan,
    currentCompIdx: number
): void => {
    const bodyTypeSeries = plan.layers[layerId]?.bodyType?.values;
    const lastBodyTypeIdx = plan.layers[layerId]?.bodyType?.last ?? -1;
    const initialBodyTypePre = plan.layers[layerId]?.bodyType?.pre;
    const wasStaticInitial = (body as any)?.plugin?.layerData?.isStaticInitial;

    let atInPointStatic = wasStaticInitial;

    if (bodyTypeSeries && bodyTypeSeries.length > 0) {
        const candidateIdx = Math.min(currentCompIdx, bodyTypeSeries.length - 1);
        const preInPointIdx =
            lastBodyTypeIdx >= 0
                ? Math.min(candidateIdx, lastBodyTypeIdx)
                : candidateIdx;
        atInPointStatic = Math.round(bodyTypeSeries[preInPointIdx]) === 2;
    } else if (typeof initialBodyTypePre === "number") {
        atInPointStatic = Math.round(initialBodyTypePre) === 2;
    }

    Body.setStatic(body, atInPointStatic);
    if (!atInPointStatic) {
        Sleeping.set(body, false);
    }

    applyBodyTypeVisuals(body, atInPointStatic);
    body.collisionFilter.category = 0x0001;
    body.collisionFilter.mask = 0xffff;
};

/**
 * Apply visual styling based on whether a body is static or dynamic.
 */
export const applyBodyTypeVisuals = (body: Body, isStatic: boolean): void => {
    if (!body.render) return;

    const normalOpacity = isStatic ? 0.5 : 1;
    body.render.opacity = normalOpacity;

    if (isStatic) {
        if (!(body.plugin as any)?.originalFillStyle) {
            (body.plugin as any).originalFillStyle = body.render.fillStyle;
            (body.plugin as any).originalStrokeStyle = body.render.strokeStyle;
        }
        body.render.fillStyle = "#545454";
        body.render.strokeStyle = "#545454";
    } else {
        const origFill = (body.plugin as any)?.originalFillStyle;
        const origStroke = (body.plugin as any)?.originalStrokeStyle;
        if (origFill) body.render.fillStyle = origFill;
        if (origStroke) body.render.strokeStyle = origStroke;
    }

    if (body.parts && body.parts.length > 1) {
        body.parts.forEach((part) => {
            if (part !== body && part.render) {
                part.render.opacity = normalOpacity;
                if (isStatic) {
                    part.render.fillStyle = "#545454";
                    part.render.strokeStyle = "#545454";
                } else {
                    const origFill = (body.plugin as any)?.originalFillStyle || body.render!.fillStyle;
                    const origStroke = (body.plugin as any)?.originalStrokeStyle || body.render!.strokeStyle;
                    if (origFill) part.render.fillStyle = origFill;
                    if (origStroke) part.render.strokeStyle = origStroke;
                }
            }
        });
    }
};
