// -----------------------------
// Gravitae Hook: usePlayback
// -----------------------------
// Controls the playback of recorded simulation data.
// Manages frame timing, smooth interpolation, and updates Matter.js bodies for visualization.

import { useEffect, useRef } from "react";
import { Engine, Body, Sleeping, Render } from "matter-js";
import { FrameData } from "../types/types";
import log from "../../utils/logger";

interface UsePlaybackProps {
    simulationStatus: string;
    frameDataRef: React.MutableRefObject<FrameData[]>;
    compFramerate: number;
    workarea: [number, number];
    setCurrentTime: (time: number) => void;
    setSimulationStatus: (status: "idle" | "preparing" | "running" | "completed") => void;
    setIsProcessing: (processing: boolean) => void;
    engineRef: React.MutableRefObject<Engine>;
    renderRef: React.MutableRefObject<Render | null>;
}

// -----------------------------
// Use Playback Hook
// -----------------------------
// Executes the playback loop using requestAnimationFrame for smooth performance.
// Updates body positions, rotations, and styles from the recorded frame data.
export const usePlayback = ({
    simulationStatus,
    frameDataRef,
    compFramerate,
    workarea,
    setCurrentTime,
    setSimulationStatus,
    setIsProcessing,
    engineRef,
    renderRef,
}: UsePlaybackProps) => {
    useEffect(() => {
        if (simulationStatus !== "completed" || !frameDataRef.current) return;

        const frames = frameDataRef.current;
        if (frames.length === 0) return;

        log.info(`Playback started at ${compFramerate}fps`);

        let startTime: number | null = null;
        let animationId: number;
        let timerAnimationId: number;
        let frameIndex = 0;

        // Calculate frame timing based on composition framerate
        const frameDuration = 1000 / compFramerate; // milliseconds per frame
        const totalDuration = (frames.length - 2) * frameDuration;

        // Separate timer function for smooth time updates
        const playTimer = (timestamp: number) => {
            if (!startTime) return;

            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / totalDuration, 1);
            const currentTime = workarea[0] + (workarea[1] - workarea[0]) * progress;

            setCurrentTime(currentTime);

            if (progress < 1) {
                timerAnimationId = requestAnimationFrame(playTimer);
            }
        };

        const playAnimation = (timestamp: number) => {
            if (!startTime) {
                startTime = timestamp;
                // Start the timer animation
                timerAnimationId = requestAnimationFrame(playTimer);
            }

            const elapsed = timestamp - startTime;
            const targetFrameIndex = Math.floor(elapsed / frameDuration);
            const clampedIndex = Math.min(targetFrameIndex, frames.length - 1);

            // Only update when we move to a new frame (with clamped index)
            if (clampedIndex !== frameIndex) {
                frameIndex = clampedIndex;
                const currentFrame = frames[frameIndex];

                // Apply frame data to bodies
                if (engineRef.current?.world.bodies) {
                    currentFrame.bodies.forEach((bodyState) => {
                        const body = engineRef.current.world.bodies.find(
                            (b) => b.id === bodyState.id
                        );
                        if (body) {
                            // Always update position, angle, and scale first
                            Body.setPosition(body, {
                                x: bodyState.position.x,
                                y: bodyState.position.y,
                            });
                            Body.setAngle(body, bodyState.angle);

                            // Apply scale if it has changed
                            const EPS = 1e-6;
                            const currentScaleXRaw = (body.plugin as any)?.scaleX;
                            const currentScaleYRaw = (body.plugin as any)?.scaleY;
                            const currentScaleX = Math.max(
                                typeof currentScaleXRaw === "number" ? currentScaleXRaw : 1,
                                EPS
                            );
                            const currentScaleY = Math.max(
                                typeof currentScaleYRaw === "number" ? currentScaleYRaw : 1,
                                EPS
                            );
                            const targetScaleX = Math.max(bodyState.scale.x, EPS);
                            const targetScaleY = Math.max(bodyState.scale.y, EPS);
                            if (
                                currentScaleX !== targetScaleX ||
                                currentScaleY !== targetScaleY
                            ) {
                                Body.scale(
                                    body,
                                    targetScaleX / currentScaleX,
                                    targetScaleY / currentScaleY
                                );
                                (body.plugin as any).scaleX = targetScaleX;
                                (body.plugin as any).scaleY = targetScaleY;
                            }

                            // Apply recorded opacity and colors directly from frame data
                            if (body.render) {
                                body.render.opacity = bodyState.opacity;
                                if (bodyState.fillStyle)
                                    body.render.fillStyle = bodyState.fillStyle;
                                if (bodyState.strokeStyle)
                                    body.render.strokeStyle = bodyState.strokeStyle;

                                if (body.parts && body.parts.length > 1) {
                                    body.parts.forEach((part) => {
                                        if (part !== body && part.render) {
                                            part.render.opacity = bodyState.opacity;
                                            if (bodyState.fillStyle)
                                                part.render.fillStyle = bodyState.fillStyle;
                                            if (bodyState.strokeStyle)
                                                part.render.strokeStyle = bodyState.strokeStyle;
                                        }
                                    });
                                }
                            }

                            // Always keep body awake during playback
                            Sleeping.set(body, false);
                        }
                    });

                    // Force render update
                    if (renderRef.current) {
                        const render = renderRef.current;
                        render.context.clearRect(
                            0,
                            0,
                            render.canvas.width,
                            render.canvas.height
                        );
                        Render.world(render);
                    }
                }
            }

            // Continue or finish
            if (frameIndex < frames.length - 1) {
                animationId = requestAnimationFrame(playAnimation);
            } else {
                setIsProcessing(false);
                setSimulationStatus("idle");
                log.info("Playback ended");
            }
        };

        // Start playback using requestAnimationFrame for smooth timing
        animationId = requestAnimationFrame(playAnimation);

        return () => {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
            if (timerAnimationId) {
                cancelAnimationFrame(timerAnimationId);
            }
        };
    }, [simulationStatus, workarea, compFramerate, setSimulationStatus]);
};
