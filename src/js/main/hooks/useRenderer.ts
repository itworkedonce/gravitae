// -----------------------------
// Gravitae Hook: useRenderer
// -----------------------------
// Custom hook that manages a Matter.js renderer instance.
// Handles creation, running, and cleanup of the renderer for physics visualization.

import { useRef, useEffect } from "react";
import { Engine, Render, Common } from "matter-js";
import { useAppState } from "../context/AppStateContext";

/**
 * Props for the useRenderer hook
 */
interface UseRendererProps {
  /** Reference to the HTML container where the renderer will be attached */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Reference to the Matter.js physics engine */
  engineRef: React.RefObject<Engine>;
  /** Composition size as [width, height] in pixels */
  compSize: [number, number];
  /** Optional callback function to execute when playback is complete */
  onPlaybackComplete?: () => void;
}

// -----------------------------
// Use Renderer Hook
// -----------------------------
// Creates and manages the lifecycle of the Matter.js renderer.
// Implements a custom rendering loop synchronized with the composition framerate.
export const useRenderer = ({
  containerRef,
  engineRef,
  compSize,
}: UseRendererProps) => {
  // Reference to store the renderer instance
  const renderRef = useRef<Render | null>(null);

  // Get simulation status and compFramerate from app state
  const {
    timing: { compFramerate = 30 },
    physics: { simulationStatus },
  } = useAppState();

  // Effect to initialize and manage the renderer lifecycle
  useEffect(() => {
    // Only proceed if container and engine are available
    if (!containerRef.current || !engineRef.current) return;

    // Create renderer with only the necessary engine properties
    // Instead of passing the entire engine object, create a minimal object with just what's needed
    // This approach prevents potential circular references
    const render = Render.create({
      element: containerRef.current,
      engine: {
        world: engineRef.current.world,
        timing: engineRef.current.timing,
      } as Engine,
      options: {
        width: compSize[0],
        height: compSize[1],
        wireframes: false,
        background: "transparent",
        showDebug: false,
        showAngleIndicator: false,
        showCollisions: false,
        showVelocity: false,
        showBounds: false,
        showAxes: false,
        showPositions: false,
        showSleeping: false, // Add this line to prevent sleeping bodies from becoming translucent
      },
    });

    // Store the renderer reference for external access
    renderRef.current = render;

    // Instead of using Render.run(render), create a custom rendering loop at the same rate as physics
    // Use compFramerate from app state
    const RENDER_FPS =
      typeof compFramerate === "number" &&
      !isNaN(compFramerate) &&
      compFramerate > 5
        ? compFramerate
        : 30;
    const renderIntervalMs = 1000 / RENDER_FPS;

    // Create a custom rendering interval
    const renderIntervalId = setInterval(() => {
      // Render if we have a valid renderer and either:
      // 1. The engine is enabled, OR
      // 2. The engine is disabled but we have bodies to render (for completed state)
      if (
        renderRef.current &&
        engineRef.current &&
        (engineRef.current.enabled !== false ||
          (engineRef.current.world.bodies &&
            engineRef.current.world.bodies.length > 0))
      ) {
        // Manually render the current state of the world
        Render.world(renderRef.current);
      }
    }, renderIntervalMs);

    // Update dimensions to match the current composition size
    render.options.width = compSize[0];
    render.options.height = compSize[1];
    render.canvas.width = compSize[0];
    render.canvas.height = compSize[1];

    // Ensure the canvas is properly positioned
    render.canvas.style.width = "100%";
    render.canvas.style.height = "100%";
    render.canvas.style.position = "absolute";
    render.canvas.style.top = "0";
    render.canvas.style.left = "0";

    // Cleanup function to prevent memory leaks
    return () => {
      // Clear the custom rendering interval
      clearInterval(renderIntervalId);

      if (render) {
        // No need to call Render.stop since we're not using Render.run
        // But we still need to clean up the canvas and textures
        render.canvas.remove();
        render.textures = {};
      }
      // Reset the reference
      renderRef.current = null;
    };
  }, [
    containerRef.current,
    engineRef.current,
    compSize[0],
    compSize[1],
    compFramerate,
    simulationStatus, // Add simulationStatus as a dependency
  ]);

  // Return the renderer reference for external access
  return renderRef;
};
