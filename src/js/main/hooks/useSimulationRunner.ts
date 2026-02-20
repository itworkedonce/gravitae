// -----------------------------
// Gravitae Hook: useSimulationRunner
// -----------------------------
// Orchestrates the physics simulation execution in the background.
// Pre-calculates simulation frames, handles time stepping, and records frame data.
// Uses helper modules for gravity, in/out points, keyframe forcing, physics props, and body type.

import { useEffect, useRef } from "react";
import { Engine, Sleeping } from "matter-js";
import { ProjectCompositions, FrameData, AnimationPlan } from "../types/types";
import { buildAnimationPlan } from "../utils/animationPlan";
import {
    updateGravity,
    checkInOutStatus,
    applyDisabledState,
    applyEnabledState,
    handleInPointActivation,
    forcePosition,
    forceRotation,
    forceScale,
    updatePhysicsProperties,
    handleBodyTypeSwitch,
    captureFrame,
} from "../utils/simulation";
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
    currentCompId: number | null;
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

    // Reset "once" guard when preparing a new simulation
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
                frames.push(captureFrame(engineRef.current, workarea[0]));

                // Expected total composition frames (including frame 0)
                const expectedCompFrames = Math.round(
                    workareaDurationSeconds * compFramerate
                );

                const plan = animPlanRef.current;
                let nextCompFrame = 1;

                // Resolve composition data for gravity updates
                const compIdStr = currentCompId !== null && currentCompId !== undefined
                    ? String(currentCompId) : null;
                const compIdNum = compIdStr !== null ? Number(compIdStr) : NaN;
                const comp =
                    (compIdStr && (compData as any)[compIdStr]) ||
                    (Number.isFinite(compIdNum) ? (compData as any)[compIdNum] : undefined);

                for (
                    let physicsFrame = 0;
                    physicsFrame <= totalPhysicsFrames;
                    physicsFrame++
                ) {
                    const currentCompIdx = Math.max(0, nextCompFrame - 1);

                    // Update gravity for this frame
                    const tsMs = engineRef.current.timing.timestamp || 0;
                    const compIdxTime = Math.max(0, Math.floor((tsMs / 1000) * compFramerate));
                    const frictionAirDefault = updateGravity(engineRef.current, comp, compIdxTime);

                    // Process each body
                    if (plan && engineRef.current?.world?.bodies) {
                        engineRef.current.world.bodies.forEach((body) => {
                            const layerId = (body as any)?.plugin?.layerData?.layerId;
                            const inOut = (body as any)?.plugin?.layerData?.inOut;

                            // Check in/out point status
                            const { isDisabled, isAtInPoint, inPointAfterWorkarea } =
                                checkInOutStatus(inOut, nextCompFrame, compFramerate, workarea[0]);

                            if (isDisabled) {
                                applyDisabledState(body);
                                return;
                            }

                            // Handle normal enabled state
                            if (!inPointAfterWorkarea) {
                                applyEnabledState(body, body.isStatic);
                            } else if (isAtInPoint) {
                                handleInPointActivation(body, layerId, plan, currentCompIdx);
                            }

                            if (!isDisabled && !body.isStatic) {
                                Sleeping.set(body, false);
                            }

                            // Force transforms from AE keyframes
                            forcePosition(body, layerId, plan, currentCompIdx, expectedCompFrames, SIMULATION_FPS, compFramerate);
                            forceRotation(body, layerId, plan, currentCompIdx, expectedCompFrames, SIMULATION_FPS, compFramerate);
                            forceScale(body, layerId, plan, currentCompIdx);

                            // Update physics properties (density, friction, etc.)
                            updatePhysicsProperties(body, layerId, plan, currentCompIdx, frictionAirDefault);

                            // Handle body type switching (static ↔ dynamic)
                            handleBodyTypeSwitch(body, layerId, plan, currentCompIdx, isDisabled);
                        });
                    }

                    Engine.update(engineRef.current, SIMULATION_DELTA);
                    const expectedPhysicsFrame = Math.round(nextCompFrame * samplingRatio);
                    if (
                        physicsFrame === expectedPhysicsFrame &&
                        nextCompFrame <= expectedCompFrames
                    ) {
                        const currentTime = workarea[0] + nextCompFrame / compFramerate;
                        frames.push(captureFrame(engineRef.current, currentTime));
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
