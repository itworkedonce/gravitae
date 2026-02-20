// -----------------------------
// Gravitae Utility: Animation Plan
// -----------------------------
// Transforms per-layer animated properties into a normalized plan for the runner.
// Gates physics start by last position keyframe; collects series for runtime application.
import type {
    ProjectCompositions,
    CompositionLayers,
    Layer,
    AnimationPlan
} from "../types/types";


// -----------------------------
// Build Animation Plan
// -----------------------------
// Computes global physicsStartFrame using last position key across layers,
// and aggregates per-layer series (rotation, scale, anchor, density,
// friction, frictionAir, restitution, bodyType) for the simulation runner.
export const buildAnimationPlan = (
    currentCompId: number | null,
    compData: ProjectCompositions | null
): AnimationPlan => {
    const compId = currentCompId;
    const data = compData;
    if (!compId || !data || !data[compId]) {
        return { physicsStartFrame: -1, layers: {} };
    }

    const compLayers = data[compId]?.layers as CompositionLayers;
    const layersPlan: AnimationPlan["layers"] = {};

    // -----------------------------
    // Physics Start Gating
    // -----------------------------
    // Only use last POSITION keyframe to gate physics start
    let lastPositionFrame = -1;

    Object.entries(compLayers).forEach(([layerIdStr, layer]) => {
        const typedLayer = layer as Layer;
        const ap = typedLayer.animatedProperties;
        if (!ap) return;

        const layerPlan: AnimationPlan["layers"][number] = { name: typedLayer.name };

        type AnimatedProps = NonNullable<Layer["animatedProperties"]>;
        const typedAp: AnimatedProps = ap as AnimatedProps;

        // Position — collect and update gating frame
        if (typedAp.position?.lastKeyFrame) {
            layerPlan.position = {
                pre: typedAp.position.preValue,
                values: typedAp.position.values,
                last: typedAp.position.lastKeyFrame.frame,
                isHold: typedAp.position.lastKeyFrame.isHold,
            };
            lastPositionFrame = Math.max(
                lastPositionFrame,
                typedAp.position.lastKeyFrame.frame
            );
        }

        // Rotation — collect (does NOT affect physics gating)
        if (typedAp.rotation?.lastKeyFrame) {
            layerPlan.rotation = {
                pre: typedAp.rotation.preValue,
                values: typedAp.rotation.values,
                last: typedAp.rotation.lastKeyFrame.frame,
                isHold: typedAp.rotation.lastKeyFrame.isHold,
            };
        }

        // Scale — collect (does NOT affect physics gating)
        if (typedAp.scale?.lastKeyFrame) {
            layerPlan.scale = {
                pre: typedAp.scale.preValue,
                values: typedAp.scale.values,
                last: typedAp.scale.lastKeyFrame.frame,
            };
        }

        // Anchor — collect (does NOT affect physics gating)
        if (typedAp.anchorPoint?.lastKeyFrame) {
            layerPlan.anchorPoint = {
                pre: typedAp.anchorPoint.preValue,
                values: typedAp.anchorPoint.values,
                last: typedAp.anchorPoint.lastKeyFrame.frame,
            };
        }

        // Physics properties — collect (do not gate physics start)
        if (typedAp.density?.lastKeyFrame) {
            layerPlan.density = {
                pre: typedAp.density.preValue,
                values: typedAp.density.values,
                last: typedAp.density.lastKeyFrame.frame,
            };
        }
        if (typedAp.friction?.lastKeyFrame) {
            layerPlan.friction = {
                pre: typedAp.friction.preValue,
                values: typedAp.friction.values,
                last: typedAp.friction.lastKeyFrame.frame,
            };
        }
        if (typedAp.frictionAir?.lastKeyFrame) {
            layerPlan.frictionAir = {
                pre: typedAp.frictionAir.preValue,
                values: typedAp.frictionAir.values,
                last: typedAp.frictionAir.lastKeyFrame.frame,
            };
        }
        if (typedAp.restitution?.lastKeyFrame) {
            layerPlan.restitution = {
                pre: typedAp.restitution.preValue,
                values: typedAp.restitution.values,
                last: typedAp.restitution.lastKeyFrame.frame,
            };
        }
        if (typedAp.bodyType?.lastKeyFrame) {
            layerPlan.bodyType = {
                pre: typedAp.bodyType.preValue,
                values: typedAp.bodyType.values,
                last: typedAp.bodyType.lastKeyFrame.frame,
            };
        }

        if (
            layerPlan.position ||
            layerPlan.rotation ||
            layerPlan.scale ||
            layerPlan.anchorPoint ||
            layerPlan.density ||
            layerPlan.friction ||
            layerPlan.frictionAir ||
            layerPlan.restitution ||
            layerPlan.bodyType
        ) {
            layersPlan[Number(layerIdStr)] = layerPlan;
        }
    });

    return {
        // Gate physics ONLY by last position keyframe; if none, remains -1
        physicsStartFrame: lastPositionFrame,
        layers: layersPlan,
    };
};
