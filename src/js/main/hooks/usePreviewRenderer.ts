// -----------------------------
// Gravitae Hook: usePreviewRenderer
// -----------------------------
// Custom hook that manages the physics engine, runner, and renderer.
// Responsible for adding bodies to the world, controlling simulation,
// recording frame data for playback, and rendering the simulation.

import { useRef, useEffect, useLayoutEffect } from "react";
import { Engine, Runner, World } from "matter-js";
import { useAppState } from "../context/AppStateContext";
import { PreviewRendererProps, FrameData } from "../types/types";
import { useMatterRenderer } from "./useMatterRenderer";
import { useSimulationRunner } from "./useSimulationRunner";
import { usePlayback } from "./usePlayback";

// -----------------------------
// Use Preview Renderer Hook
// -----------------------------
export const usePreviewRenderer = ({
  matterBodies,
  simulationStatus = "idle",
  workarea,
  setSimulationStatus,
  compFramerate,
  containerRef,
  compSize,
  setIsProcessing,
}: PreviewRendererProps) => {
  const {
    simulation: { setFrameData },
    timing: { setCurrentTime },
    compData,
    composition: { currentCompId },
  } = useAppState();

  // Keep simulation at 50fps for physics accuracy
  const SIMULATION_FPS = 50;
  const SIMULATION_DELTA = 1000 / SIMULATION_FPS;

  const engineRef = useRef<Engine>(
    Engine.create({
      gravity: { x: 0, y: 1, scale: 0.01 },
      timing: { timeScale: 1 },
      // Improved collision detection settings
      positionIterations: 8, // Default is 6, increase for better accuracy
      velocityIterations: 6, // Default is 4, increase for stability
      constraintIterations: 4, // Default is 2, increase for constraint accuracy
      enableSleeping: true, // Helps performance with many objects
    })
  );
  const runnerRef = useRef<Runner | null>(null);
  const frameDataRef = useRef<FrameData[]>([]);

  // Initialize runner (runs once on mount)
  useEffect(() => {
    runnerRef.current = Runner.create({
      isFixed: true,
      delta: SIMULATION_DELTA,
    });

    return () => {
      if (runnerRef.current) {
        Runner.stop(runnerRef.current);
      }
    };
  }, [workarea, compFramerate, SIMULATION_DELTA]);

  // Use the extracted hooks
  const renderRef = useMatterRenderer({
    containerRef,
    engineRef,
    compSize,
    simulationStatus,
    matterBodies,
  });

  useSimulationRunner({
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
  });

  usePlayback({
    simulationStatus,
    frameDataRef,
    compFramerate,
    workarea,
    setCurrentTime,
    setSimulationStatus,
    setIsProcessing,
    engineRef,
    renderRef,
  });

  // Handle body initialization (runs when matterBodies changes)
  useLayoutEffect(() => {
    if (matterBodies) {
      if (simulationStatus === "running") {
        return;
      }
      const bodiesToAdd = Object.values(matterBodies);

      const workareaStartFrame = Math.round(workarea[0] * compFramerate);
      bodiesToAdd.forEach((body: any) => {
        const inOut = (body as any)?.plugin?.layerData?.inOut;
        const inPointFrame = inOut && inOut[0] ? Math.round(inOut[0] * compFramerate) : 0;
        const inAfterWorkarea = inPointFrame > workareaStartFrame;
        if (body.render) {
          const normalOpacity = body.isStatic ? 0.5 : 1;
          const targetOpacity = inAfterWorkarea ? 0.25 : normalOpacity;
          body.render.opacity = targetOpacity;
          if (body.parts && body.parts.length > 1) {
            body.parts.forEach((part: any) => {
              if (part !== body && part.render) {
                part.render.opacity = targetOpacity;
              }
            });
          }
        }
      });

      World.clear(engineRef.current.world, false);
      engineRef.current.world.bodies = [];
      engineRef.current.world.composites = [];

      World.add(engineRef.current.world, bodiesToAdd);

      if (renderRef.current && bodiesToAdd.length === 0) {
        const render = renderRef.current;
        render.context.clearRect(
          0,
          0,
          render.canvas.width,
          render.canvas.height
        );
      }
    }
  }, [matterBodies, simulationStatus]);

  return { engineRef, runnerRef };
};
