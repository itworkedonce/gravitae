// -----------------------------
// Simulation Helper: Body Type Switching
// -----------------------------
// Handles mid-simulation switching between static and dynamic body types
// based on AE keyframed bodyType property.

import { Body, Sleeping } from "matter-js";
import { AnimationPlan } from "../../types/types";
import { applyBodyTypeVisuals } from "./simInOutPoints";
import { setBodyType } from "../bodies";

/**
 * Handle dynamic ↔ static body type switching based on AE keyframes.
 * Only switches when the bodyType value actually changes between frames.
 */
export const handleBodyTypeSwitch = (
    body: Body,
    layerId: number,
    plan: AnimationPlan,
    currentCompIdx: number,
    isDisabled: boolean
): void => {
    const bodyTypeSeries = plan.layers[layerId]?.bodyType?.values;
    const lastBodyTypeIdx = plan.layers[layerId]?.bodyType?.last ?? -1;

    if (
        !bodyTypeSeries ||
        currentCompIdx > lastBodyTypeIdx ||
        currentCompIdx >= bodyTypeSeries.length
    ) return;

    const initialBodyTypePre = plan.layers[layerId]?.bodyType?.pre;

    const currentValRounded = Math.round(bodyTypeSeries[currentCompIdx]);
    const prevValRounded =
        currentCompIdx > 0
            ? Math.round(bodyTypeSeries[currentCompIdx - 1])
            : Math.round(initialBodyTypePre ?? currentValRounded);

    if (!isDisabled && currentValRounded !== prevValRounded) {
        const toStatic = currentValRounded === 2;

        setBodyType(body, toStatic);
        if (!toStatic) Sleeping.set(body, false);

        applyBodyTypeVisuals(body, toStatic);
    }
};
