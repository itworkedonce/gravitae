// -----------------------------
// Gravitae Hook: useSimulationRunner
// -----------------------------
// Orchestrates the physics simulation execution in the background.
// Pre-calculates simulation frames, handles time stepping, and records frame data.

import { useEffect, useRef } from "react";
import { Engine, Body, Sleeping } from "matter-js";
import { ProjectCompositions, FrameData, AnimationPlan } from "../types/types";
import { buildAnimationPlan } from "../utils/animationPlan";
import log from "../../utils/logger";

interface UseSimulationRunnerProps {
    engineRef: React.MutableRefObject<Engine>;
    runnerRef: React.MutableRefObject<any>;
    simulationStatus: string;
    setSimulationStatus: (status: "idle" | "preparing" | "running" | "completed") => void;
    setFrameData: (data: FrameData[]) => void;
    workarea: [number, number];
    compFramerate: number;
    compData: ProjectCompositions | null;
    currentCompId: string | number | null;
    frameDataRef: React.MutableRefObject<FrameData[]>;
}

// -----------------------------
// Use Simulation Runner Hook
// -----------------------------
// Runs the physics simulation loop and captures frame data for playback/application.
// Manages animation plans and updates body states based on keyframe data.
export const useSimulationRunner = ({
    engineRef,
    runnerRef,
    simulationStatus,
    setSimulationStatus,
    setFrameData,
    workarea,
    compFramerate,
    compData,
    currentCompId,
    frameDataRef,
}: UseSimulationRunnerProps) => {
    const SIMULATION_FPS = 50;
    const SIMULATION_DELTA = 1000 / SIMULATION_FPS;

    const animPlanRef = useRef<AnimationPlan | null>(null);
    const propsCheckDoneRef = useRef(false);

    // Reset “once” guard when preparing a new simulation
    useEffect(() => {
        if (simulationStatus === "preparing") {
            propsCheckDoneRef.current = false;
            animPlanRef.current = null;
        }
    }, [simulationStatus]);

    // Pre-calculates all physics frames as fast as possible without rendering
    useEffect(() => {
        if (!engineRef.current || !runnerRef.current) return;

        if (simulationStatus === "running") {
            // Build plan and alert once
            if (!propsCheckDoneRef.current) {
                const plan = buildAnimationPlan(currentCompId, compData);
                animPlanRef.current = plan;
                propsCheckDoneRef.current = true;
            }

            // Pre-calculate all simulation frames as fast as possible
            const calculateAllFrames = async () => {
                const frames: FrameData[] = [];
                const workareaDurationSeconds = workarea[1] - workarea[0];
                const totalPhysicsFrames = Math.ceil(
                    workareaDurationSeconds * SIMULATION_FPS
                );
                const samplingRatio = SIMULATION_FPS / compFramerate;

                // Reset engine timestamp
                engineRef.current.timing.timestamp = 0;

                // Capture frame 0
                const initialFrameData: FrameData = {
                    time: workarea[0],
                    bodies: engineRef.current.world.bodies.map((body) => ({
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
                frames.push(initialFrameData);

                // Expected total composition frames (including frame 0)
                const expectedCompFrames = Math.round(
                    workareaDurationSeconds * compFramerate
                );

                const plan = animPlanRef.current;
                let nextCompFrame = 1;

                for (
                    let physicsFrame = 0;
                    physicsFrame <= totalPhysicsFrames;
                    physicsFrame++
                ) {
                    const currentCompIdx = Math.max(0, nextCompFrame - 1);

                    // Apply AE-driven position forcing and handle in-point timing before physics step
                    if (plan && engineRef.current?.world?.bodies) {
                        const compIdStr = currentCompId || null;
                        const compIdNum =
                            compIdStr !== null && compIdStr !== undefined
                                ? Number(compIdStr)
                                : NaN;
                        const comp =
                            (compIdStr && (compData as any)[compIdStr]) ||
                            (Number.isFinite(compIdNum)
                                ? (compData as any)[compIdNum]
                                : undefined);

                        const gravitySeries = comp?.animatedGravityProperties;
                        const angleSeries = gravitySeries?.gravityAngle?.values;
                        const scaleSeries = gravitySeries?.gravityScale?.values;
                        const dragSeries = gravitySeries?.drag?.values;
                        const angleRaw = Array.isArray(comp?.gravityAngle)
                            ? comp?.gravityAngle[0]
                            : comp?.gravityAngle;
                        const scaleRaw = Array.isArray(comp?.gravityScale)
                            ? comp?.gravityScale[0]
                            : comp?.gravityScale;
                        const dragRaw = Array.isArray(comp?.drag)
                            ? comp?.drag[0]
                            : comp?.drag;

                        const tsMs = engineRef.current.timing.timestamp || 0;
                        const compIdxTime = Math.max(
                            0,
                            Math.floor((tsMs / 1000) * compFramerate)
                        );
                        const angleVal =
                            angleSeries && compIdxTime < angleSeries.length
                                ? angleSeries[compIdxTime]
                                : typeof angleRaw === "number"
                                    ? angleRaw
                                    : 90;
                        const scaleVal =
                            scaleSeries && compIdxTime < scaleSeries.length
                                ? scaleSeries[compIdxTime]
                                : typeof scaleRaw === "number"
                                    ? scaleRaw
                                    : 9.8;

                        const dragVal =
                            dragSeries && compIdxTime < dragSeries.length
                                ? dragSeries[compIdxTime]
                                : typeof dragRaw === "number"
                                    ? dragRaw
                                    : 0;
                        const rad = (angleVal * Math.PI) / 180;
                        engineRef.current.gravity.x = Math.sin(rad) * -1;
                        engineRef.current.gravity.y = Math.cos(rad);
                        engineRef.current.gravity.scale = (scaleVal / (9.8 * 3)) * 0.01;

                        const frictionAirDefault = Math.max(dragVal, 0) / 100;
                        engineRef.current.world.bodies.forEach((body) => {
                            const layerId = (body as any)?.plugin?.layerData?.layerId;
                            const inOut = (body as any)?.plugin?.layerData?.inOut;
                            const posSeries = plan.layers[layerId]?.position?.values;
                            const rotSeries = plan.layers[layerId]?.rotation?.values;

                            // Get in/out point times in frames (inOut[0] and inOut[1] are in seconds)
                            const inPointFrame =
                                inOut && inOut[0] ? Math.round(inOut[0] * compFramerate) : 0;
                            const outPointFrame =
                                inOut && inOut[1]
                                    ? Math.round(inOut[1] * compFramerate)
                                    : Infinity;

                            // Convert workarea start to frames
                            const workareaStartFrame = Math.round(workarea[0] * compFramerate);

                            // Check if we're before in-point or after out-point, but only consider in-point if it's after workarea start
                            const isBeforeInPoint =
                                inPointFrame > workareaStartFrame && nextCompFrame < inPointFrame;
                            const isAfterOutPoint = nextCompFrame >= outPointFrame;
                            const isDisabled = isBeforeInPoint || isAfterOutPoint;

                            if (isDisabled) {
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
                                return;
                            }

                            const inPointAfterWorkarea = inPointFrame > workareaStartFrame;

                            if (!isDisabled && !inPointAfterWorkarea) {
                                if (body.render) {
                                    const normalOpacity = body.isStatic ? 0.5 : 1;
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
                            } else if (nextCompFrame === inPointFrame) {
                                const bodyTypeSeries = plan.layers[layerId]?.bodyType?.values;
                                const lastBodyTypeIdx =
                                    plan.layers[layerId]?.bodyType?.last ?? -1;
                                const initialBodyTypePre = plan.layers[layerId]?.bodyType?.pre;
                                const wasStaticInitial = (body as any)?.plugin?.layerData
                                    ?.isStaticInitial;

                                let atInPointStatic = wasStaticInitial;

                                if (bodyTypeSeries && bodyTypeSeries.length > 0) {
                                    const candidateIdx = Math.min(
                                        currentCompIdx,
                                        bodyTypeSeries.length - 1
                                    );
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

                                if (body.render) {
                                    const normalOpacity = atInPointStatic ? 0.5 : 1;
                                    body.render.opacity = normalOpacity;

                                    if (atInPointStatic) {
                                        if (!(body.plugin as any)?.originalFillStyle) {
                                            (body.plugin as any).originalFillStyle =
                                                body.render.fillStyle;
                                            (body.plugin as any).originalStrokeStyle =
                                                body.render.strokeStyle;
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
                                                if (atInPointStatic) {
                                                    part.render.fillStyle = "#545454";
                                                    part.render.strokeStyle = "#545454";
                                                } else {
                                                    const origFill =
                                                        (body.plugin as any)?.originalFillStyle ||
                                                        body.render.fillStyle;
                                                    const origStroke =
                                                        (body.plugin as any)?.originalStrokeStyle ||
                                                        body.render.strokeStyle;
                                                    if (origFill) part.render.fillStyle = origFill;
                                                    if (origStroke) part.render.strokeStyle = origStroke;
                                                }
                                            }
                                        });
                                    }
                                }

                                body.collisionFilter.category = 0x0001;
                                body.collisionFilter.mask = 0xffff;
                            }

                            if (!isDisabled && !body.isStatic) {
                                Sleeping.set(body, false);
                            }

                            const lastPosIdx = plan.layers[layerId]?.position?.last ?? -1;
                            const posIsHold = plan.layers[layerId]?.position?.isHold ?? false;
                            const lastPosInside =
                                typeof lastPosIdx === "number" &&
                                lastPosIdx >= 0 &&
                                lastPosIdx < expectedCompFrames;
                            const shouldForcePos =
                                !!posSeries &&
                                (!lastPosInside || posIsHold || currentCompIdx <= lastPosIdx);
                            if (
                                shouldForcePos &&
                                posSeries &&
                                currentCompIdx < posSeries.length
                            ) {
                                const [x, y] = posSeries[currentCompIdx];
                                Body.setPosition(body, { x, y });
                                if (currentCompIdx < lastPosIdx || posIsHold || !lastPosInside) {
                                    Body.setVelocity(body, { x: 0, y: 0 });
                                }
                                Sleeping.set(body, false);
                            }

                            const lastRotIdx = plan.layers[layerId]?.rotation?.last ?? -1;
                            const rotIsHold = plan.layers[layerId]?.rotation?.isHold ?? false;
                            const lastRotInside =
                                typeof lastRotIdx === "number" &&
                                lastRotIdx >= 0 &&
                                lastRotIdx < expectedCompFrames;
                            const shouldForceRot =
                                !!rotSeries &&
                                (!lastRotInside || rotIsHold || currentCompIdx <= lastRotIdx);
                            if (
                                shouldForceRot &&
                                rotSeries &&
                                currentCompIdx < rotSeries.length
                            ) {
                                const rot = rotSeries[currentCompIdx];
                                Body.setAngle(body, (rot * Math.PI) / 180);
                                if (currentCompIdx < lastRotIdx || rotIsHold || !lastRotInside) {
                                    Body.setAngularVelocity(body, 0);
                                }
                                Sleeping.set(body, false);
                            }

                            const scaleSeries = plan.layers[layerId]?.scale?.values;
                            const lastScaleIdx = plan.layers[layerId]?.scale?.last ?? -1;
                            const shouldForceScale =
                                !!scaleSeries && currentCompIdx <= lastScaleIdx;
                            if (
                                shouldForceScale &&
                                scaleSeries &&
                                currentCompIdx < scaleSeries.length
                            ) {
                                const [scaleXPercent, scaleYPercent] = scaleSeries[currentCompIdx];
                                const scaleX = scaleXPercent / 100;
                                const scaleY = scaleYPercent / 100;

                                const EPS = 1e-6;
                                const prevScaleXRaw = (body.plugin as any)?.scaleX;
                                const prevScaleYRaw = (body.plugin as any)?.scaleY;
                                const prevScaleX = Math.max(
                                    typeof prevScaleXRaw === "number" ? prevScaleXRaw : 1,
                                    EPS
                                );
                                const prevScaleY = Math.max(
                                    typeof prevScaleYRaw === "number" ? prevScaleYRaw : 1,
                                    EPS
                                );

                                const targetScaleX = Math.max(scaleX, EPS);
                                const targetScaleY = Math.max(scaleY, EPS);
                                Body.scale(
                                    body,
                                    targetScaleX / prevScaleX,
                                    targetScaleY / prevScaleY
                                );

                                if (!body.plugin) body.plugin = {};
                                (body.plugin as any).scaleX = targetScaleX;
                                (body.plugin as any).scaleY = targetScaleY;

                                Sleeping.set(body, false);
                            }

                            const densitySeries = plan.layers[layerId]?.density?.values;
                            const frictionSeries = plan.layers[layerId]?.friction?.values;
                            const frictionAirSeries = plan.layers[layerId]?.frictionAir?.values;
                            const restitutionSeries = plan.layers[layerId]?.restitution?.values;
                            const bodyTypeSeries = plan.layers[layerId]?.bodyType?.values;

                            const lastDensityIdx = plan.layers[layerId]?.density?.last ?? -1;
                            const lastFrictionIdx = plan.layers[layerId]?.friction?.last ?? -1;
                            const lastFrictionAirIdx =
                                plan.layers[layerId]?.frictionAir?.last ?? -1;
                            const lastRestitutionIdx =
                                plan.layers[layerId]?.restitution?.last ?? -1;
                            const lastBodyTypeIdx = plan.layers[layerId]?.bodyType?.last ?? -1;

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
                                const frictionValue = frictionSeries[currentCompIdx];
                                (body as any).friction = frictionValue;
                                Sleeping.set(body, false);
                            }

                            if (
                                frictionAirSeries &&
                                currentCompIdx <= lastFrictionAirIdx &&
                                currentCompIdx < frictionAirSeries.length
                            ) {
                                const frictionAirValue = frictionAirSeries[currentCompIdx];
                                (body as any).frictionAir = frictionAirValue;
                                Sleeping.set(body, false);
                            } else {
                                (body as any).frictionAir = frictionAirDefault;
                            }

                            if (
                                restitutionSeries &&
                                currentCompIdx <= lastRestitutionIdx &&
                                currentCompIdx < restitutionSeries.length
                            ) {
                                const restitutionValue = restitutionSeries[currentCompIdx];
                                (body as any).restitution = restitutionValue;
                                Sleeping.set(body, false);
                            }

                            if (
                                bodyTypeSeries &&
                                currentCompIdx <= lastBodyTypeIdx &&
                                currentCompIdx < bodyTypeSeries.length
                            ) {
                                const initialBodyTypePre = plan.layers[layerId]?.bodyType?.pre;
                                const isInitialStatic =
                                    Math.round(initialBodyTypePre ?? -1) === 2 ||
                                    (body as any)?.plugin?.layerData?.isStaticInitial;

                                const currentValRounded = Math.round(
                                    bodyTypeSeries[currentCompIdx]
                                );
                                const prevValRounded =
                                    currentCompIdx > 0
                                        ? Math.round(bodyTypeSeries[currentCompIdx - 1])
                                        : Math.round(initialBodyTypePre ?? currentValRounded);

                                if (
                                    !isInitialStatic &&
                                    !isDisabled &&
                                    currentValRounded !== prevValRounded
                                ) {
                                    const toStatic = currentValRounded === 2;

                                    Body.setStatic(body, toStatic);
                                    if (!toStatic) Sleeping.set(body, false);

                                    if (body.render) {
                                        const opacity = toStatic ? 0.5 : 1.0;
                                        body.render.opacity = opacity;

                                        if (toStatic) {
                                            if (!(body.plugin as any)?.originalFillStyle) {
                                                (body.plugin as any).originalFillStyle =
                                                    body.render.fillStyle;
                                                (body.plugin as any).originalStrokeStyle =
                                                    body.render.strokeStyle;
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
                                                    part.render.opacity = opacity;
                                                    if (toStatic) {
                                                        part.render.fillStyle = "#545454";
                                                        part.render.strokeStyle = "#545454";
                                                    } else {
                                                        const origFill =
                                                            (body.plugin as any)?.originalFillStyle ||
                                                            body.render.fillStyle;
                                                        const origStroke =
                                                            (body.plugin as any)?.originalStrokeStyle ||
                                                            body.render.strokeStyle;
                                                        if (origFill) part.render.fillStyle = origFill;
                                                        if (origStroke) part.render.strokeStyle = origStroke;
                                                    }
                                                }
                                            });
                                        }
                                    }
                                }
                            }

                            if (
                                rotSeries &&
                                currentCompIdx === plan.layers[layerId]?.rotation?.last
                            ) {
                                if (currentCompIdx > 0) {
                                    const rotDiff =
                                        rotSeries[currentCompIdx] - rotSeries[currentCompIdx - 1];
                                    const angularVelocity =
                                        (rotDiff * Math.PI) /
                                        180 *
                                        (SIMULATION_FPS / compFramerate);
                                    Body.setAngularVelocity(body, angularVelocity);
                                } else {
                                    const rotDiff =
                                        rotSeries[currentCompIdx] -
                                        (plan.layers[layerId]?.rotation?.pre ??
                                            rotSeries[currentCompIdx]);
                                    const angularVelocity =
                                        (rotDiff * Math.PI) /
                                        180 *
                                        (SIMULATION_FPS / compFramerate);
                                    Body.setAngularVelocity(body, angularVelocity);
                                }
                            }

                            if (
                                posSeries &&
                                currentCompIdx === plan.layers[layerId]?.position?.last
                            ) {
                                if (currentCompIdx > 0) {
                                    const dx =
                                        posSeries[currentCompIdx][0] -
                                        posSeries[currentCompIdx - 1][0];
                                    const dy =
                                        posSeries[currentCompIdx][1] -
                                        posSeries[currentCompIdx - 1][1];
                                    Body.setVelocity(body, {
                                        x: dx * (SIMULATION_FPS / compFramerate),
                                        y: dy * (SIMULATION_FPS / compFramerate),
                                    });
                                } else {
                                    const dx =
                                        posSeries[currentCompIdx][0] -
                                        (plan.layers[layerId]?.position?.pre[0] ??
                                            posSeries[currentCompIdx][0]);
                                    const dy =
                                        posSeries[currentCompIdx][1] -
                                        (plan.layers[layerId]?.position?.pre[1] ??
                                            posSeries[currentCompIdx][1]);
                                    Body.setVelocity(body, {
                                        x: dx * (SIMULATION_FPS / compFramerate),
                                        y: dy * (SIMULATION_FPS / compFramerate),
                                    });
                                }
                            }
                        });
                    }

                    Engine.update(engineRef.current, SIMULATION_DELTA);
                    const expectedPhysicsFrame = Math.round(nextCompFrame * samplingRatio);
                    if (
                        physicsFrame === expectedPhysicsFrame &&
                        nextCompFrame <= expectedCompFrames
                    ) {
                        const currentTime = workarea[0] + nextCompFrame / compFramerate;
                        // Per-frame capture inside the physics loop
                        const frameData: FrameData = {
                            time: currentTime,
                            bodies: engineRef.current.world.bodies.map((body) => ({
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

                        frames.push(frameData);
                        nextCompFrame++;
                    }

                    if (physicsFrame % 10 === 0) {
                        await new Promise((resolve) => setTimeout(resolve, 0));
                    }
                }

                frameDataRef.current = frames;
                setFrameData(frames);
                setSimulationStatus("completed");
                log.info(`${frames.length} frames simulated`);
            };

            calculateAllFrames();
        }
    }, [
        simulationStatus,
        workarea,
        setFrameData,
        compFramerate,
        SIMULATION_FPS,
        SIMULATION_DELTA,
    ]);
};
