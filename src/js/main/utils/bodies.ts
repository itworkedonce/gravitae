// -----------------------------
// Gravitae Utility: Physics Body Creation
// -----------------------------
// Converts layer shape data into Matter.js physics bodies with proper geometry.
// Handles complex shapes like stars, polygons, and rounded rectangles through
// vertex generation, Bezier curve processing, and convex decomposition.

import { Bodies, Body, Vertices } from "matter-js";
import { Layer, ProjectCompositions, Shape } from "../types/types";
import {
  calculateStarBezierHandles,
  calculatePolygonBezierHandles,
  resampleBezierPath,
  combineVertices,
  decomposeConcaveShape,
  mapVertices,
} from "./geometry";
import { VertexPoint } from "../types/types";
import { toRadians } from "./maths";
import log from "../../utils/logger";

// -----------------------------
// Generate Ellipse Points
// -----------------------------
// Generates vertex points for ellipse approximation using adaptive point distribution
// Uses Ramanujan's formula for accurate perimeter calculation to ensure smooth curves
const generateEllipsePoints = (
  centerX: number,
  centerY: number,
  width: number,
  height: number
) => {
  const a = width / 2;
  const b = height / 2;

  // Ramanujan's formula provides high accuracy for ellipse perimeter calculation
  const h = Math.pow(a - b, 2) / Math.pow(a + b, 2);
  const perimeter =
    Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));

  // Adaptive point density ensures smooth curves regardless of ellipse size
  // Maintains visual quality while optimizing physics performance
  const pointsPerUnit = 0.02; // 1 point per 50 pixels
  const calculatedPoints = Math.max(16, Math.ceil(perimeter * pointsPerUnit));

  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < calculatedPoints; i++) {
    const theta = (2 * Math.PI * i) / calculatedPoints;
    const x = centerX + a * Math.cos(theta);
    const y = centerY + b * Math.sin(theta);
    points.push({ x, y });
  }

  return points;
};

// -----------------------------
// Create Polystar
// -----------------------------
// Creates star vertices with alternating inner/outer points for complex star shapes
// Handles roundness constraints to prevent mathematical instability in Bezier calculations
function createPolystar(
  centerX: number,
  centerY: number,
  params: {
    points: number;
    outerRadius: number;
    innerRadius: number;
    rotation: number;
    outerRoundness: number;
    innerRoundness: number;
  }
) {
  const { points, outerRadius, innerRadius, rotation } = params;

  // Prevents mathematical instability in Bezier curve calculations
  const constrainRoundness = (value: number): number => {
    if (value === 0) return 0.01;
    if (value === 1) return 1.01;
    if (value === -1) return -1.01;
    return value;
  };

  const outerRoundness = constrainRoundness(params.outerRoundness);
  const innerRoundness = constrainRoundness(params.innerRoundness);

  const totalPoints = points * 2; // alternating outer and inner
  const angleStep = (Math.PI * 2) / totalPoints;
  // Align first point to top position for consistent star orientation
  const rotationRad = toRadians(rotation - 90);

  const vertices: VertexPoint[] = [];

  // Alternate between outer and inner radii to create star shape
  for (let i = 0; i < totalPoints; i++) {
    const angle = i * angleStep + rotationRad;
    const isOuter = i % 2 === 0;
    const radius = isOuter ? outerRadius : innerRadius;

    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;

    vertices.push({
      x,
      y,
      angle,
      radius,
      isOuter,
      roundness: isOuter ? outerRoundness : innerRoundness,
    });
  }

  return vertices;
}

// -----------------------------
// Create Polygon
// -----------------------------
// Creates regular polygon vertices with uniform angular distribution
// Simpler than star creation as it only uses outer radius points
function createPolygon(
  centerX: number,
  centerY: number,
  params: {
    points: number;
    outerRadius: number;
    rotation: number;
    outerRoundness: number;
  }
) {
  const { points, outerRadius, rotation } = params;

  // Prevents mathematical instability in Bezier curve calculations
  const constrainRoundness = (value: number): number => {
    if (value === 0) return 0.01;
    if (value === 1) return 1.01;
    if (value === -1) return -1.01;
    return value;
  };

  const outerRoundness = constrainRoundness(params.outerRoundness);

  const angleStep = (Math.PI * 2) / points;
  // Align first vertex to top position for consistent polygon orientation
  const rotationRad = toRadians(rotation - 90);

  const vertices: VertexPoint[] = [];

  // Generate only outer vertices since polygons don't have inner points
  for (let i = 0; i < points; i++) {
    const angle = i * angleStep + rotationRad;
    const x = centerX + Math.cos(angle) * outerRadius;
    const y = centerY + Math.sin(angle) * outerRadius;

    vertices.push({
      x,
      y,
      angle,
      radius: outerRadius,
      isOuter: true, // Polygons only have outer vertices unlike stars
      roundness: outerRoundness,
    });
  }

  return vertices;
}

// -----------------------------
// Extrac Body Properties
// -----------------------------
// Extracts physics properties from Matter.js body for serialization and state management.
// Uses the first part of compound bodies as the primary reference for physics data,
// while combining layer transform data for complete state representation.
export const extractBodyProperties = (body: any, layerData: any) => {
  // Use first part as primary body reference for compound bodies
  const currentBody = body.parts[0];
  return {
    id: currentBody.id,
    label: currentBody.label,
    type: "body" as const,
    position: {
      x: currentBody.position.x,
      y: currentBody.position.y,
    },
    velocity: {
      x: currentBody.velocity.x,
      y: currentBody.velocity.y,
    },
    force: {
      x: currentBody.force.x,
      y: currentBody.force.y,
    },
    torque: currentBody.torque,
    // Use layer data for transform properties to maintain After Effects consistency
    angle: layerData.layerRotation,
    scale: { x: layerData.layerScale[0], y: layerData.layerScale[1] },
    angularVelocity: currentBody.angularVelocity,
    angularSpeed: currentBody.angularSpeed,
    isStatic: currentBody.isStatic,
    isSleeping: currentBody.isSleeping,
    mass: currentBody.mass,
    density: currentBody.density,
    inertia: currentBody.inertia,
    inverseMass: currentBody.inverseMass,
    inverseInertia: currentBody.inverseInertia,
    friction: currentBody.friction,
    frictionStatic: currentBody.frictionStatic,
    frictionAir: currentBody.frictionAir,
    restitution: currentBody.restitution,
    // Extract collision filtering for physics interaction control
    collisionFilter: {
      category: currentBody.collisionFilter.category,
      mask: currentBody.collisionFilter.mask,
      group: currentBody.collisionFilter.group,
    },
    slop: currentBody.slop,
    timeScale: currentBody.timeScale,
    sleepThreshold: currentBody.sleepThreshold,
    plugin: {},
    // Track compound body complexity (excluding the main body itself)
    parts: body.parts.length - 1,
    parent: null,
    bounds: {
      min: {
        x: currentBody.bounds.min.x,
        y: currentBody.bounds.min.y,
      },
      max: {
        x: currentBody.bounds.max.x,
        y: currentBody.bounds.max.y,
      },
    },
  };
};

// -----------------------------
// Create Matter Body
// -----------------------------
// Creates a Matter.js body from layer data, handling both shapes and masks.
// Utilizes shape and mask data to generate a compound body with appropriate properties.
// -----------------------------
// Safe Body Type Change
// -----------------------------
// Safely changes a body's type between static and dynamic while preserving physical properties.
// Based on Matter.js limitations and community solutions for toggling static state.
export const setBodyType = (body: Matter.Body, isStatic: boolean) => {
  // Get the initial properties stored during creation
  const initialProps = (body.plugin as any)?.initialProperties;
  if (!initialProps) {
    console.warn('Body is missing initial properties, type change may not work correctly');
    return;
  }

  if (isStatic) {
    // Store current dynamic properties before making static
    (body.plugin as any).dynamicProperties = {
      mass: body.mass,
      inertia: body.inertia,
      friction: body.friction,
      frictionAir: body.frictionAir,
      restitution: body.restitution
    };

    // Set static (this will set mass and inertia to Infinity internally)
    Body.setStatic(body, true);
  } else {
    // First restore mass to a finite value to allow dynamic behavior
    Body.setMass(body, initialProps.mass);

    // Then unset static flag
    Body.setStatic(body, false);

    // Restore all other physical properties
    body.inertia = initialProps.inertia;
    body.friction = initialProps.friction;
    body.frictionAir = initialProps.frictionAir;
    body.restitution = initialProps.restitution;

    // Reset velocities to prevent unexpected movement
    Body.setVelocity(body, { x: 0, y: 0 });
    Body.setAngularVelocity(body, 0);
  }

  // Update plugin state
  (body.plugin as any).isStatic = isStatic;
};

export const createMatterBody = (
  layerData: Layer,
  layerId: number,
  startPropertiesValues?: {
    bodyType: number;
    density: number;
    friction: number;
    frictionAir: number;
    restitution: number;
  }
) => {
  if (!layerData) {
    return null;
  }
  const colors: string[] = ["#e9462f", "#8e8101", "#958aaa", "#286dff"];


  const { inOut } = layerData;

  // Provide default value for isStatic to handle optional property
  const isStatic =
    layerData.isStatic ??
    layerData.startPropertiesValues?.bodyType === 2;

  const applyColor = (
    body: Matter.Body,
    colors: string[],
    layerId: number,
    isStatic: boolean,
    inOut: number[]
  ) => {
    // Cycle through predefined colors based on layer ID for visual distinction
    const colorIndex = layerId % colors.length;
    const color = colors[colorIndex];

    // Initialize render property if it doesn't exist
    if (!body.render) {
      (body as any).render = {};
    }

    // Set default render properties
    body.render.fillStyle = color;
    body.render.strokeStyle = color;
    body.render.lineWidth = 1;
    body.render.opacity = 1;

    // Static bodies use reduced opacity and gray color for visual distinction
    if (isStatic) {
      body.render.opacity = 0.5;
      body.render.fillStyle = "#545454";
      body.render.strokeStyle = "#545454";
      body.render.lineWidth = 0;
    }




    // Apply render properties to all parts if it's a compound body
    if (body.parts && body.parts.length > 1) {
      body.parts.forEach(part => {
        if (part !== body) { // Skip the parent body
          if (!part.render) {
            (part as any).render = {};
          }
          part.render.fillStyle = body.render.fillStyle;
          part.render.strokeStyle = body.render.strokeStyle;
          part.render.lineWidth = body.render.lineWidth;
          part.render.opacity = body.render.opacity;
        }
      });
    }

    return body;
  };
  const shapes = Object.values(layerData.shapeInfo || []);

  const parts: Matter.Body[] = [];

  // Process all shapes in the layer and convert to physics bodies
  for (const shapeObj of shapes) {
    for (const shape of Object.values(shapeObj)) {
      let part: Matter.Body | null = null;
      // Rectangle shapes support both simple and rounded corner variants
      if (shape.type === "rectangle") {
        if (shape.roundness === 0) {
          // Simple rectangle uses native Matter.js rectangle body for optimal performance
          part = Bodies.rectangle(
            shape.position[0],
            shape.position[1],
            shape.size[0],
            shape.size[1],
            {
              isStatic,
              // ...applyColor(colors, layerId, isStatic, inOut || []),
              plugin: {
                layerData: {
                  inOut: inOut || [],
                  layerId,
                },
              },
            }
          );
        } else {
          // Create compound body for rounded rectangle using circles at corners
          // Algorithm switches between pill shape (2 circles) and full rounded rect (4 circles)
          const width = shape.size[0];
          const height = shape.size[1];
          const minDimension = Math.min(width, height);
          const maxRadius = minDimension / 2;

          // Prevent radius from exceeding half the minimum dimension to avoid overlap
          const scaledRoundness =
            shape.roundness *
            Math.min(shape.scale[0] / 100, shape.scale[1] / 100);
          const radius = Math.min(shape.roundness, maxRadius * 0.999);

          // Center rectangle provides the main body mass between rounded corners
          const rectWidth = Math.max(0, width - 2 * radius);
          const rectHeight = Math.max(0, height - 2 * radius);

          const roundedRectParts: Matter.Body[] = [];

          // Only create center rectangle if corners don't consume entire shape
          if (rectWidth > 0 && rectHeight > 0) {
            const topRect = Bodies.rectangle(
              shape.position[0],
              shape.position[1],
              rectWidth,
              rectHeight,
              {
                isStatic,
                plugin: {
                  layerData: {
                    inOut: inOut || [],
                    layerId,
                  },
                },
              }
            );
            roundedRectParts.push(topRect);
          }

          // Optimize for pill shapes to reduce physics complexity
          // When roundness is high relative to the shorter dimension, use only 2 circles
          const isWider = width > height;
          const isPillShape = radius >= (isWider ? height : width) * 0.4; // Threshold for pill shape

          if (isPillShape) {
            // Create only 2 circles for pill shape
            if (isWider) {
              // Left and right circles
              const leftCircle = Bodies.circle(
                shape.position[0] - (width / 2 - radius),
                shape.position[1],
                radius,
                {
                  isStatic,
                  plugin: {
                    layerData: {
                      inOut: inOut || [],
                      layerId,
                    },
                  },
                }
              );
              const rightCircle = Bodies.circle(
                shape.position[0] + (width / 2 - radius),
                shape.position[1],
                radius,
                {
                  isStatic,
                  plugin: {
                    layerData: {
                      inOut: inOut || [],
                      layerId,
                    },
                  },
                }
              );
              roundedRectParts.push(leftCircle, rightCircle);
            } else {
              // Top and bottom circles
              const topCircle = Bodies.circle(
                shape.position[0],
                shape.position[1] - (height / 2 - radius),
                radius,
                {
                  isStatic,
                  plugin: {
                    layerData: {
                      inOut: inOut || [],
                      layerId,
                    },
                  },
                }
              );
              const bottomCircle = Bodies.circle(
                shape.position[0],
                shape.position[1] + (height / 2 - radius),
                radius,
                {
                  isStatic,
                  plugin: {
                    layerData: {
                      inOut: inOut || [],
                      layerId,
                    },
                  },
                }
              );
              roundedRectParts.push(topCircle, bottomCircle);
            }
          } else {
            // Create all 4 corner circles for regular rounded rectangle
            const topLeftCircle = Bodies.circle(
              shape.position[0] - (width / 2 - radius),
              shape.position[1] - (height / 2 - radius),
              radius,
              {
                isStatic,
                plugin: {
                  layerData: {
                    inOut: inOut || [],
                    layerId,
                  },
                },
              }
            );

            const topRightCircle = Bodies.circle(
              shape.position[0] + (width / 2 - radius),
              shape.position[1] - (height / 2 - radius),
              radius,
              {
                isStatic,
                plugin: {
                  layerData: {
                    inOut: inOut || [],
                    layerId,
                  },
                },
              }
            );

            const bottomLeftCircle = Bodies.circle(
              shape.position[0] - (width / 2 - radius),
              shape.position[1] + (height / 2 - radius),
              radius,
              {
                isStatic,
                plugin: {
                  layerData: {
                    inOut: inOut || [],
                    layerId,
                  },
                },
              }
            );

            const bottomRightCircle = Bodies.circle(
              shape.position[0] + (width / 2 - radius),
              shape.position[1] + (height / 2 - radius),
              radius,
              {
                isStatic,
                plugin: {
                  layerData: {
                    inOut: inOut || [],
                    layerId,
                  },
                },
              }
            );

            roundedRectParts.push(
              topLeftCircle,
              topRightCircle,
              bottomLeftCircle,
              bottomRightCircle
            );
          }

          // Create the compound body
          part = Body.create({
            parts: roundedRectParts,
            isStatic: isStatic,
            // ...applyColor(colors, layerId, isStatic, inOut || []),
            plugin: {
              layerData: {
                inOut: inOut || [],
                layerId,
              },
            },
          });

          // Note: For compound bodies, we don't need to scale here as the individual parts
          // are already positioned correctly relative to each other
        }
      } else if (shape.type === "ellipse") {
        const points = generateEllipsePoints(
          shape.position[0],
          shape.position[1],
          shape.size[0],
          shape.size[1]
        );
        part = Bodies.fromVertices(
          shape.position[0],
          shape.position[1],
          [points],
          {
            isStatic,
            // ...applyColor(colors, layerId, isStatic, inOut || []),
            plugin: {
              layerData: {
                inOut: inOut || [],
                layerId,
              },
            },
          }
        );
      } else if ((shape as Shape).type === "star") {
        const position = shape.position;
        const originalPos = shape.originalPos;
        const anchor = shape.anchor || [0, 0];
        const starRotation = shape.starRotation;
        const rotation = shape.rotation;
        const scale = shape.scale;
        const points = shape.points;
        const innerRadius = shape.innerRadius;
        const outerRadius = shape.outerRadius;
        const innerRoundness = shape.innerRoundness;
        const outerRoundness = shape.outerRoundness;

        //  alert('Transform Anchor: '+ offsetPosition)
        // Fallback to generated star vertices
        const starVertices = createPolystar(position[0], position[1], {
          points,
          outerRadius: outerRadius,
          innerRadius: innerRadius,
          rotation: starRotation,
          outerRoundness,
          innerRoundness,
        });
        // Calculate bezier handles for smooth curves using star-specific method
        const bezierPath = calculateStarBezierHandles(starVertices, points);

        // Transform Bezier segments into standardized vertex data format
        const verticesData = bezierPath.map((segment, i) => ({
          index: i,
          position: [segment.point.x, segment.point.y] as [number, number],
          outTangent: [segment.cp1.x, segment.cp1.y] as [number, number],
          inTangent: [segment.cp2.x, segment.cp2.y] as [number, number],
        }));

        // Convert smooth Bezier curves to discrete vertices for physics simulation
        const points2D: { x: number; y: number }[] = resampleBezierPath(
          verticesData,
          Math.max(
            7,
            Math.min(5, (Math.min(shape.scale[0], shape.scale[1]) / 100) * 6)
          )
        );

        // Decompose polygon into convex parts for stable physics simulation
        const combinedVertices = combineVertices([points2D]);
        const convexParts = decomposeConcaveShape(combinedVertices);

        for (const partVertices of convexParts) {
          // Convert to simple coordinate arrays for Bodies.fromVertices
          const vertices = partVertices.map((v) => ({ x: v.x, y: v.y }));

          // Convert vertices to Matter.js Vector objects for centroid calculation
          const mappedVertices = mapVertices(
            vertices.map((p) => [p.x, p.y] as [number, number])
          );

          // Calculate centroid to preserve global positioning
          const centroid = Vertices.centre(mappedVertices);

          // Ensure vertices are valid numbers to prevent physics engine crashes
          const isValidVertices =
            vertices.length >= 3 &&
            vertices.every(
              (v) =>
                Number.isFinite(v.x) &&
                Number.isFinite(v.y) &&
                !Number.isNaN(v.x) &&
                !Number.isNaN(v.y)
            ) &&
            Number.isFinite(centroid.x) &&
            Number.isFinite(centroid.y);

          if (!isValidVertices) {
            alert(
              "Invalid vertices detected for star shape (fallback): " +
              JSON.stringify({
                vertices: vertices.slice(0, 3),
                centroid,
                layerId,
              })
            );
            continue;
          }

          const part = Bodies.fromVertices(centroid.x, centroid.y, [vertices], {
            isStatic,
            // ...applyColor(colors, layerId, isStatic, inOut || []),
            plugin: {
              layerData: {
                inOut: inOut || [],
                layerId,
              },
            },
          });

          if (part) {
            // Apply transformations in correct order: translate, scale, then rotate
            // This ensures anchor point behavior matches After Effects layer transforms
            Body.translate(part, { x: -anchor[0], y: -anchor[1] });
            Body.scale(part, scale[0] / 100, scale[1] / 100, {
              x: position[0],
              y: position[1],
            });
            // @ts-ignore: Matter.js docs show Body.rotate can accept a point parameter
            Body.rotate(part, (rotation * Math.PI) / 180, {
              x: position[0],
              y: position[1],
            });

            parts.push(part);
          }
        }
        // }
      } else if ((shape as Shape).type === "polygon") {
        // Polygon shapes use Bezier curve smoothing for rounded corners
        // Similar to stars but without inner radius complexity
        const position = shape.position;
        const anchor = shape.anchor || [0, 0];
        const polygonRotation = shape.starRotation; // Reuse star rotation property for consistency
        const rotation = shape.rotation;
        const scale = shape.scale;
        const points = shape.points;
        const outerRadius = shape.outerRadius;
        const outerRoundness = shape.outerRoundness;

        // Calculate rotated anchor point for proper transform origin
        // Precision rounding prevents floating point accumulation errors
        const rotatedAnchor = [
          (anchor[0] *
            Math.round(Math.cos((rotation * Math.PI) / 180) * 1000)) /
          1000 -
          (anchor[1] *
            Math.round(Math.sin((rotation * Math.PI) / 180) * 1000)) /
          1000,
          (anchor[0] *
            Math.round(Math.sin((rotation * Math.PI) / 180) * 1000)) /
          1000 +
          (anchor[1] *
            Math.round(Math.cos((rotation * Math.PI) / 180) * 1000)) /
          1000,
        ];

        const offsetRotadedAnchor = [rotatedAnchor[0], rotatedAnchor[1]];
        // Generate polygon vertices with applied scaling
        const polygonVertices = createPolygon(position[0], position[1], {
          points,
          outerRadius: (outerRadius * scale[0]) / 100,
          rotation: polygonRotation,
          outerRoundness,
        });

        // Generate smooth curves between polygon vertices using Bezier interpolation
        const bezierPath = calculatePolygonBezierHandles(polygonVertices);

        // Convert bezier path to verticesData format
        const verticesData = bezierPath.map((segment, i) => ({
          index: i,
          position: [segment.point.x, segment.point.y] as [number, number],
          inTangent: [segment.cp1.x, segment.cp1.y] as [number, number],
          outTangent: [segment.cp2.x, segment.cp2.y] as [number, number],
        }));

        // Resample the bezier path to create Matter.js vertices
        const points2D: { x: number; y: number }[] = resampleBezierPath(
          verticesData,
          Math.max(
            7,
            Math.min(5, (Math.min(shape.scale[0], shape.scale[1]) / 100) * 6)
          )
        );

        // Create the Matter.js body
        const combinedVertices = combineVertices([points2D]);
        const convexParts = decomposeConcaveShape(combinedVertices);

        for (const partVertices of convexParts) {
          const vertices = partVertices.map((v) => ({ x: v.x, y: v.y }));
          const mappedVertices = mapVertices(
            vertices.map((p) => [p.x, p.y] as [number, number])
          );
          const centroid = Vertices.centre(mappedVertices);

          // Validate vertices before creating body
          const isValidVertices =
            vertices.length >= 3 &&
            vertices.every(
              (v) =>
                Number.isFinite(v.x) &&
                Number.isFinite(v.y) &&
                !Number.isNaN(v.x) &&
                !Number.isNaN(v.y)
            ) &&
            Number.isFinite(centroid.x) &&
            Number.isFinite(centroid.y);

          if (!isValidVertices) {
            continue;
          }

          const part = Bodies.fromVertices(centroid.x, centroid.y, [vertices], {
            isStatic,
            // ...applyColor(colors, layerId, isStatic, inOut || []),
            plugin: {
              layerData: {
                inOut: inOut || [],
                layerId,
              },
            },
          });

          if (part) {
            // Apply transformations in correct order: translate, scale, then rotate
            // This ensures anchor point behavior matches After Effects layer transforms
            Body.translate(part, { x: -anchor[0], y: -anchor[1] });
            Body.scale(part, scale[0] / 100, scale[1] / 100, {
              x: position[0],
              y: position[1],
            });
            // @ts-ignore: Matter.js docs show Body.rotate can accept a point parameter
            Body.rotate(part, (rotation * Math.PI) / 180, {
              x: position[0],
              y: position[1],
            });
            parts.push(part);
          }
        }
      } else if (shape.type === "path") {
        // Path shapes use After Effects vertex data directly for precise shape matching
        // Handles complex custom shapes drawn in After Effects
        const path = shape as any;
        const verticesData = path.verticesData;

        // After Effects provides pre-transformed vertex data for custom paths
        const points: { x: number; y: number }[] = resampleBezierPath(
          verticesData,
          20
        );

        // Ensure resampled points are valid before physics body creation
        const isValidPoints =
          points.length >= 3 &&
          points.every(
            (p) =>
              Number.isFinite(p.x) &&
              Number.isFinite(p.y) &&
              !Number.isNaN(p.x) &&
              !Number.isNaN(p.y)
          );

        if (!isValidPoints) {
          continue;
        }

        // Combine multiple vertex sets into single shape for physics processing
        const combinedVertices = combineVertices([points]);
        // Ensure combined vertices maintain numerical validity
        const isValidCombined =
          combinedVertices.length >= 3 &&
          combinedVertices.every(
            (v) =>
              Number.isFinite(v.x) &&
              Number.isFinite(v.y) &&
              !Number.isNaN(v.x) &&
              !Number.isNaN(v.y)
          );

        if (!isValidCombined) {
          continue;
        }

        // Then decompose the combined shape into convex parts
        let convexParts;
        if (layerData.type === "text") {
          // For text layers, use the shape directly without decomposition
          convexParts = [combinedVertices.map((p) => ({ x: p.x, y: p.y }))];
        } else {
          // For other layers, decompose into convex parts
          convexParts = decomposeConcaveShape(combinedVertices);
        }

        // Validate convex parts after decomposition
        if (
          !convexParts ||
          !Array.isArray(convexParts) ||
          convexParts.length === 0
        ) {
          alert(
            "Invalid result after shape decomposition: " +
            JSON.stringify({
              convexPartsLength: convexParts ? convexParts.length : 0,
              layerId,
            })
          );
          continue;
        }

        // Create a body for each convex part
        for (const partVertices of convexParts) {
          // Convert vertices to Matter.js Vector objects
          const mappedVertices = mapVertices(
            partVertices.map((p) => [p.x, p.y] as [number, number])
          );

          const centroid = Vertices.centre(mappedVertices);

          // Validate vertices before creating body
          const isValidVertices =
            partVertices.length >= 3 &&
            partVertices.every(
              (v) =>
                Number.isFinite(v.x) &&
                Number.isFinite(v.y) &&
                !Number.isNaN(v.x) &&
                !Number.isNaN(v.y)
            ) &&
            Number.isFinite(centroid.x) &&
            Number.isFinite(centroid.y);

          if (!isValidVertices) {
            alert(
              "Invalid vertices detected for path shape: " +
              JSON.stringify({
                vertices: partVertices.slice(0, 3),
                centroid,
                layerId,
              })
            );
            continue;
          }
          const part = Bodies.fromVertices(
            centroid.x,
            centroid.y,
            [mappedVertices],
            {
              isStatic: isStatic,
              // ...applyColor(colors, layerId, isStatic, inOut || []),
              plugin: {
                layerData: {
                  inOut: inOut || [],
                  layerId,
                },
              },
            }
          );

          if (part) {
            // Scale the part before rotation

            // Body.scale(part, scale[0]/100, scale[1]/100, {x:position[0],y:position[1]})
            // // @ts-ignore: Matter.js docs show Body.rotate can accept a point parameter
            // Body.rotate(part, rotation * Math.PI / 180,{x:position[0],y:position[1]})
            // @ts-ignore: Matter.js docs show Body.rotate can accept a point parameter
            // Body.rotate(part, shape.rotation * Math.PI/ 180,{ x: shape.position[0], y: shape.position[1] })
            parts.push(part);
          } else {
            alert(
              "Bodies.fromVertices failed for path shape: " +
              JSON.stringify({
                vertexCount: partVertices.length,
                centroid,
                layerId,
              })
            );
          }
        }
      }

      // Add the created part to the parts array if it exists
      if (part) {
        //  alert('Creating a body')
        Body.scale(part, shape.scale[0] / 100, shape.scale[1] / 100);
        Body.setAngle(part, (shape.rotation * Math.PI) / 180);
        parts.push(part);
      }
    }
  }

  if (parts.length > 0) {
    const scaleX = layerData.layerScale[0] / 100;
    const scaleY = layerData.layerScale[1] / 100;
    const rotation = (layerData.layerRotation * Math.PI) / 180;
    const origin = {
      x: layerData.layerPosition[0],
      y: layerData.layerPosition[1],
    };

    const compoundBody = Body.create({
      parts: parts,
      isStatic:
        startPropertiesValues?.bodyType === 1 ? false : true || isStatic,
      density: startPropertiesValues?.density
        ? startPropertiesValues.density / 1000
        : 0.001,
      friction: startPropertiesValues?.friction || 0.1,
      frictionAir: startPropertiesValues?.frictionAir || 0.01,
      restitution: startPropertiesValues?.restitution || 0.1,
      label: `Body_${layerId}`,
      plugin: {
        layerData: {
          inOut: inOut || [],
          layerId,
          isStaticInitial: startPropertiesValues?.bodyType === 1 ? false : true || isStatic,
        },
      },
    });
    // Step 2: Apply transforms

    const EPS = 1e-6;
    const appliedScaleX = Math.max(scaleX, EPS);
    const appliedScaleY = Math.max(scaleY, EPS);
    Body.scale(compoundBody, appliedScaleX, appliedScaleY, origin);
    // Initialize plugin scale tracking to current applied layer scale
    if (!compoundBody.plugin) compoundBody.plugin = {} as any;
    (compoundBody.plugin as any).scaleX = appliedScaleX;
    (compoundBody.plugin as any).scaleY = appliedScaleY;
    // @ts-ignore: Matter.js docs show Body.rotate can accept a point parameter
    (Body as any).rotate(
      compoundBody,
      (layerData.layerRotation * Math.PI) / 180,
      origin
    );

    // Step 3: Reset physical state to avoid any bounce
    Body.setVelocity(compoundBody, { x: 0, y: 0 });
    Body.setAngularVelocity(compoundBody, 0);
    // Body.setInertia(compoundBody, Infinity);

    // Store initial properties before any modifications
    const initialProperties = {
      mass: compoundBody.mass,
      inertia: compoundBody.inertia,
      density: startPropertiesValues?.density ? startPropertiesValues.density / 1000 : 0.001,
      friction: startPropertiesValues?.friction || 0.1,
      frictionAir: startPropertiesValues?.frictionAir || 0.01,
      restitution: startPropertiesValues?.restitution || 0
    };

    // Store properties in plugin for state changes
    if (!compoundBody.plugin) compoundBody.plugin = {} as any;
    (compoundBody.plugin as any).initialProperties = initialProperties;
    (compoundBody.plugin as any).isStaticInitial = isStatic;

    // Apply initial state
    if (isStatic) {
      // Make it static while preserving properties
      Body.setStatic(compoundBody, true);
    } else {
      // Set dynamic properties
      Body.setMass(compoundBody, initialProperties.mass);
      Body.setDensity(compoundBody, initialProperties.density);
      compoundBody.friction = initialProperties.friction;
      compoundBody.frictionAir = initialProperties.frictionAir;
      compoundBody.restitution = initialProperties.restitution;
    }

    // Store body properties and apply visual styling
    const bodyProps = extractBodyProperties(compoundBody, layerData);
    layerData.matterObject = bodyProps;
    applyColor(compoundBody, colors, layerId, isStatic, inOut || []);
    return compoundBody;
  }

  return null;
};

// -----------------------------
// Filter Matter Bodies
// -----------------------------
// Filters physics bodies to only include those belonging to the current composition.
// This prevents physics simulation from processing bodies from inactive compositions,
// optimizing performance and avoiding cross-composition interference.
export const filterMatterBodies = (
  matterBodies: Record<number, any>,
  compData: ProjectCompositions,
  currentCompId: string | null
): Record<number, any> => {
  // Return all bodies when no specific composition is active
  if (currentCompId === null) {
    return matterBodies;
  }

  // Only keep bodies whose layers exist in the current composition
  return Object.fromEntries(
    Object.entries(matterBodies).filter(([layerId]) => {
      const compId = Number(currentCompId);
      return (
        compData[compId] && compData[compId].layers[Number(layerId)] !== undefined
      );
    })
  );
};
