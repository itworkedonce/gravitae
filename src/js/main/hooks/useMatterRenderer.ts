// -----------------------------
// Gravitae Hook: useMatterRenderer
// -----------------------------
// Manages the Matter.js Render instance for the simulation preview.
// Handles canvas sizing, clearing, and rendering updates based on simulation status.

import { useEffect, useRef } from "react";
import { Render, Engine } from "matter-js";

interface UseMatterRendererProps {
    containerRef: React.RefObject<HTMLDivElement>;
    engineRef: React.MutableRefObject<Engine>;
    compSize: [number, number];
    simulationStatus: string;
    matterBodies: any;
}

// -----------------------------
// Use Matter Renderer Hook
// -----------------------------
// Initializes the Matter.js renderer and synchronizes it with the engine and UI state.
// Ensures the canvas resizes correctly and renders only when necessary.
export const useMatterRenderer = ({
    containerRef,
    engineRef,
    compSize,
    simulationStatus,
    matterBodies,
}: UseMatterRendererProps) => {
    const renderRef = useRef<Render | null>(null);

    // Initialize renderer (runs once on mount)
    useEffect(() => {
        if (!containerRef.current || !engineRef.current) return;

        const render = Render.create({
            element: containerRef.current,
            engine: {
                world: engineRef.current.world,
                timing: engineRef.current.timing,
            } as Engine,
            options: {
                wireframes: false,
                background: "transparent",
                showDebug: false,
                showAngleIndicator: false,
                showCollisions: false,
                showVelocity: false,
                showBounds: false,
                showAxes: false,
                showPositions: false,
                showSleeping: false,
            },
        });

        renderRef.current = render;

        return () => {
            if (render) {
                render.canvas.remove();
                render.textures = {};
            }
            renderRef.current = null;
        };
    }, []); // Empty dependency array - runs only once

    // Handle canvas size updates
    useEffect(() => {
        if (!renderRef.current) return;

        const render = renderRef.current;
        render.options.width = compSize[0];
        render.options.height = compSize[1];
        render.canvas.width = compSize[0];
        render.canvas.height = compSize[1];

        // Update canvas styles
        render.canvas.style.width = "100%";
        render.canvas.style.height = "100%";
        render.canvas.style.position = "absolute";
        render.canvas.style.top = "0";
        render.canvas.style.left = "0";
    }, [compSize[0], compSize[1]]);

    // Handle rendering updates
    useEffect(() => {
        if (!renderRef.current) return;

        const render = renderRef.current;
        const hasBodies = (engineRef.current?.world?.bodies?.length ?? 0) > 0;

        if (hasBodies) {
            if (simulationStatus === "preparing" || simulationStatus === "idle") {
                Render.world(render);
            }
        } else {
            render.context.clearRect(
                0,
                0,
                render.canvas.width,
                render.canvas.height
            );
        }
    }, [simulationStatus, matterBodies]);

    return renderRef;
};
