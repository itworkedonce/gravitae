// -----------------------------
// Simulation Helper: Physics Properties
// -----------------------------
// Updates per-body physics properties (density, friction, restitution, frictionAir)
// from AE keyframe animation plans.

import { Body, Sleeping } from "matter-js";
import { AnimationPlan } from "../../types/types";

/**
 * Update a body's physics properties from animated keyframe values.
 * Only applies values within the keyframed range; after the last keyframe, values hold.
 */
export const updatePhysicsProperties = (
    body: Body,
    layerId: number,
    plan: AnimationPlan,
    currentCompIdx: number,
    frictionAirDefault: number
): void => {
    const densitySeries = plan.layers[layerId]?.density?.values;
    const frictionSeries = plan.layers[layerId]?.friction?.values;
    const frictionAirSeries = plan.layers[layerId]?.frictionAir?.values;
    const restitutionSeries = plan.layers[layerId]?.restitution?.values;

    const lastDensityIdx = plan.layers[layerId]?.density?.last ?? -1;
    const lastFrictionIdx = plan.layers[layerId]?.friction?.last ?? -1;
    const lastFrictionAirIdx = plan.layers[layerId]?.frictionAir?.last ?? -1;
    const lastRestitutionIdx = plan.layers[layerId]?.restitution?.last ?? -1;

    if (
        densitySeries &&
        currentCompIdx <= lastDensityIdx &&
        currentCompIdx < densitySeries.length
    ) {
        const densityValue = densitySeries[currentCompIdx];
        const normalizedDensity = Math.max(densityValue / 1000, 1e-6);
        Body.setDensity(body, normalizedDensity);
        Sleeping.set(body, false);
    }

    if (
        frictionSeries &&
        currentCompIdx <= lastFrictionIdx &&
        currentCompIdx < frictionSeries.length
    ) {
        (body as any).friction = frictionSeries[currentCompIdx];
        Sleeping.set(body, false);
    }

    if (
        frictionAirSeries &&
        currentCompIdx <= lastFrictionAirIdx &&
        currentCompIdx < frictionAirSeries.length
    ) {
        (body as any).frictionAir = frictionAirSeries[currentCompIdx];
        Sleeping.set(body, false);
    } else {
        (body as any).frictionAir = frictionAirDefault;
    }

    if (
        restitutionSeries &&
        currentCompIdx <= lastRestitutionIdx &&
        currentCompIdx < restitutionSeries.length
    ) {
        (body as any).restitution = restitutionSeries[currentCompIdx];
        Sleeping.set(body, false);
    }
};
