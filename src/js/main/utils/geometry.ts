// -----------------------------
// Gravitae Utility: geometry
// -----------------------------
// Handles complex geometric calculations for shape generation and Bezier curve processing.
// Provides mathematical algorithms for converting After Effects shape data into smooth curves.

import { Bezier } from 'bezier-js';
import simplify from 'simplify-js';
import { Vector } from 'matter-js';
import * as decomp from 'poly-decomp';
import { VertexPoint, BezierSegment, Vertex } from '../types/types';
import { crossProduct } from './maths';
import log from '../../utils/logger'

// Standard mathematical constant for circular Bezier approximation
const BEZIER_CONSTANT = 0.5522847498;

// -----------------------------
// Calculate Star Bezier Handles
// -----------------------------
// Generates Bezier control handles for star shapes with variable roundness.
// Uses tangential control points to create smooth curves between star vertices,
// with handle length scaled by roundness percentage and star complexity.
export const calculateStarBezierHandles = (vertices: VertexPoint[], points: number ) => {
  const bezierPath: BezierSegment[] = [];
  const vertexCount = vertices.length;

  for (let i = 0; i < vertexCount; i++) {
    const current = vertices[i];
    const angle = current.angle;
    // Create tangent direction perpendicular to radius for smooth curve flow
    const tangentAngle = angle + Math.PI / 2;
    const roundnessFactor = current.roundness / 100;
    // Scale handle length by star complexity (more points = shorter handles)
    const handleLength = Math.abs(roundnessFactor) * BEZIER_CONSTANT * current.radius/points*2.8;
    const direction = roundnessFactor >= 0 ? 1 : -1;
    
    // Position control points tangentially for natural curve progression
    const cp1 = {
      x: current.x + Math.cos(tangentAngle) * handleLength * direction,
      y: current.y + Math.sin(tangentAngle) * handleLength * direction
    };
    const cp2 = {
      x: current.x - Math.cos(tangentAngle) * handleLength * direction,
      y: current.y - Math.sin(tangentAngle) * handleLength * direction
    };
    bezierPath.push({
      point: current,
      cp1,
      cp2
    });
  }
  return bezierPath;
}


// -----------------------------
// Calculate Polygon Bezier Handles
// -----------------------------
// Calculates Bezier control handles for polygon shapes with precise circular approximation.
// Implements mathematical scaling to achieve perfect circles at 100% roundness,
// using chord length calculations for geometrically accurate curve generation.
export const  calculatePolygonBezierHandles = (vertices: VertexPoint[]) =>{
  const bezierPath: BezierSegment[] = [];
  const vertexCount = vertices.length;
  // Precise Bezier constant for optimal circular approximation
  const BEZIER_CONSTANT = 0.552284749831;

  for (let i = 0; i < vertexCount; i++) {
    const current = vertices[i];
    const next = vertices[(i + 1) % vertexCount];
    const prev = vertices[(i - 1 + vertexCount) % vertexCount];

    const distToPrev = Math.sqrt(
      Math.pow(current.x - prev.x, 2) + Math.pow(current.y - prev.y, 2)
    );
    const distToNext = Math.sqrt(
      Math.pow(next.x - current.x, 2) + Math.pow(next.y - current.y, 2)
    );

    const roundnessFactor = current.roundness / 100;
    const avgDistance = (distToPrev + distToNext) / 2;
    const points = vertexCount;

    // Normalize roundness to achieve perfect circle at 100% value
    const perfectCircleRoundness = 100;
    const normalizedRoundness =
      Math.abs(current.roundness) / perfectCircleRoundness;

    // Calculate chord length between adjacent vertices for mathematical precision
    const angleStep = (Math.PI * 2) / points;
    const chordLength = 2 * current.radius * Math.sin(angleStep / 2);

    // Derive handle length using geometric relationship for circular approximation
    const circleHandleLength = (chordLength * BEZIER_CONSTANT) / 2;
    const targetHandleLength = circleHandleLength * normalizedRoundness;
    const handleLength = Math.sign(roundnessFactor) * targetHandleLength;
    const direction = roundnessFactor >= 0 ? 1 : -1;

    // Position handles tangentially to create smooth circular transitions
    const perpAngle = current.angle + Math.PI / 2;
    const cp1X =
      current.x - Math.cos(perpAngle) * Math.abs(handleLength) * direction;
    const cp1Y =
      current.y - Math.sin(perpAngle) * Math.abs(handleLength) * direction;
    const cp2X =
      current.x + Math.cos(perpAngle) * Math.abs(handleLength) * direction;
    const cp2Y =
      current.y + Math.sin(perpAngle) * Math.abs(handleLength) * direction;

    bezierPath.push({
      point: current,
      cp1: { x: cp1X, y: cp1Y },
      cp2: { x: cp2X, y: cp2Y },
    });
  }

  return bezierPath;
}

// -----------------------------
// Resample Bezier Path
// -----------------------------
// Converts After Effects Bezier paths to discrete points for Matter.js physics simulation.
// Complex sampling and simplification prevents performance issues while preserving shape accuracy.
export const resampleBezierPath = (

  vertices: Vertex[],
  samplesPerSegment: number = 15
): { x: number; y: number }[] => {
  // Constants for validation and quality control
  const MIN_POINTS = 3; // Minimum points required for a valid polygon
  const MIN_AREA = 0.1; // Minimum area threshold to filter out degenerate shapes
  //Calculate the area of a polygon using the shoelace formula.
  //Used to validate that the resampled path represents a meaningful shape.

  const calculateArea = (points: { x: number; y: number }[]): number => {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    return Math.abs(area) / 2;
  };

  if (vertices.length < 2) return [];

  const resampled: { x: number; y: number }[] = [];

  // Calculate bounding box to establish reasonable limits for tangent validation
  // This prevents extremely large tangent handles from creating invalid curves
  const positions = vertices.map((v) => v.position);
  const minX = Math.min(...positions.map((p) => p[0]));
  const maxX = Math.max(...positions.map((p) => p[0]));
  const minY = Math.min(...positions.map((p) => p[1]));
  const maxY = Math.max(...positions.map((p) => p[1]));
  const shapeWidth = maxX - minX;
  const shapeHeight = maxY - minY;
  const maxDimension = Math.max(shapeWidth, shapeHeight);
  const maxOffset = maxDimension * 2; // Allow tangents up to 2x the shape size for reasonable curves

// Validates that a tangent handle contains finite, numeric values.
//After Effects can sometimes export invalid tangent data that would break curve generation.
  const isValidTangent = (tangent: [number, number] | undefined): boolean => {
    if (!tangent) return false;
    return (
      isFinite(tangent[0]) &&
      isFinite(tangent[1]) &&
      !isNaN(tangent[0]) &&
      !isNaN(tangent[1])
    );
  };

  // Validate input vertices
  if (!vertices || !Array.isArray(vertices) || vertices.length === 0) {
    log.error(
      'Invalid vertices data for Bezier path: ' +
        JSON.stringify({
          verticesLength: vertices ? vertices.length : 0,
        })
    );
    return [];
  }

  // Validate vertex positions
  const hasInvalidPositions = vertices.some(
    (v) =>
      !v.position ||
      !Array.isArray(v.position) ||
      v.position.length !== 2 ||
      !isFinite(v.position[0]) ||
      !isFinite(v.position[1]) ||
      isNaN(v.position[0]) ||
      isNaN(v.position[1])
  );

  if (hasInvalidPositions) {
    log.error(
      'Invalid vertex positions in Bezier path: ' +
        JSON.stringify({
          firstVertex: vertices[0],
          verticesLength: vertices.length,
        })
    );
    return [];
  }

  // Process all segments including the closing segment to create a complete closed path
  // Each segment becomes a cubic Bezier curve with 4 control points
  for (let i = 0; i < vertices.length; i++) {
    const current = vertices[i];
    const next = vertices[(i + 1) % vertices.length]; // Use modulo to wrap around to first vertex

    // Set up the 4 control points for a cubic Bezier curve:
    // p0: start point, p1: first control point, p2: second control point, p3: end point
    const p0 = current.position; // Start point
    const p3 = next.position;    // End point

    let p1 = p0; // Default first control point to start position (creates linear segment)
    let p2 = p3; // Default second control point to end position (creates linear segment)

    // Use current vertex's outgoing tangent as first control point
    // This defines how the curve leaves the current vertex
    if (isValidTangent(current.outTangent)) {
      const distance = Math.sqrt(
        (current.outTangent![0] - p0[0]) ** 2 +
          (current.outTangent![1] - p0[1]) ** 2
      );
      // Only use tangent if it's within reasonable bounds to prevent extreme curves
      if (distance <= maxOffset) {
        p1 = current.outTangent!;
      }
    }

    // Use next vertex's incoming tangent as second control point
    // This defines how the curve approaches the next vertex
    if (isValidTangent(next.inTangent)) {
      const distance = Math.sqrt(
        (next.inTangent![0] - p3[0]) ** 2 + (next.inTangent![1] - p3[1]) ** 2
      );
      // Only use tangent if it's within reasonable bounds
      if (distance <= maxOffset) {
        p2 = next.inTangent!;
      }
    }

    try {
      // Validate all points before creating Bezier curve
      const points = [p0, p1, p2, p3];
      const hasInvalidPoints = points.some(
        (p) =>
          !Array.isArray(p) ||
          p.length !== 2 ||
          !isFinite(p[0]) ||
          !isFinite(p[1]) ||
          isNaN(p[0]) ||
          isNaN(p[1])
      );

      if (hasInvalidPoints) {
        log.error(
          'Invalid control points for Bezier curve: ' +
            JSON.stringify({
              segmentIndex: i,
              p0,
              p1,
              p2,
              p3,
            })
        );
        continue;
      }

      // Create cubic Bezier curve using bezier-js library
      // This converts the 4 control points into a parametric curve
      const bezierCurve = new Bezier(
        p0[0],
        p0[1], // start point
        p1[0],
        p1[1], // first control point (outgoing tangent)
        p2[0],
        p2[1], // second control point (incoming tangent)
        p3[0],
        p3[1] // end point
      );

      // Generate lookup table of evenly spaced points along the curve
      // This discretizes the smooth curve into points for physics simulation
      const lut = bezierCurve.getLUT(samplesPerSegment);

      // Add curve points to resampled array with collinearity filtering
      // This prevents adding redundant points that lie on straight lines
      for (let j = 0; j < lut.length - 1; j++) {
        const point = { x: lut[j].x, y: lut[j].y };

        // Skip points that would create collinear segments to reduce point count
        // while preserving curve shape
        if (resampled.length >= 2) {
          const p1 = resampled[resampled.length - 2];
          const p2 = resampled[resampled.length - 1];
          const p3 = point;

          // Calculate vectors between consecutive points
          const v1x = p2.x - p1.x;
          const v1y = p2.y - p1.y;
          const v2x = p3.x - p2.x;
          const v2y = p3.y - p2.y;

          // Use cross product to measure how much the path "turns" at this point
          // Small cross product = nearly straight line = can skip this point
          const crossProduct = Math.abs(v1x * v2y - v1y * v2x);
          const minAngleThreshold = 0.005; // Minimum turn angle to keep point

          if (crossProduct < minAngleThreshold) {
            continue; // Skip this point to avoid collinearity
          }
        }

        resampled.push(point);
      }
    } catch (error) {
      // Fallback to linear interpolation if Bezier curve creation fails
      // This ensures we always get some points even with invalid curve data
      log.warn(
        'Bezier curve creation failed, using linear interpolation:',
        error
      );
      // Create straight line between vertices with the same sample count
      for (let j = 0; j < samplesPerSegment; j++) {
        const t = j / samplesPerSegment;
        const x = p0[0] + t * (p3[0] - p0[0]);
        const y = p0[1] + t * (p3[1] - p0[1]);
        resampled.push({ x, y });
      }
    }
  }

  // Validate final resampled points
  if (resampled.length < 3) {
    log.error(
      'Insufficient resampled points for Bezier path: ' +
        JSON.stringify({
          resampledLength: resampled.length,
        })
    );
    return [];
  }

  const hasInvalidResampledPoints = resampled.some(
    (p) => !isFinite(p.x) || !isFinite(p.y) || isNaN(p.x) || isNaN(p.y)
  );

  if (hasInvalidResampledPoints) {
    log.error(
      'Invalid resampled points in Bezier path: ' +
        JSON.stringify({
          firstPoint: resampled[0],
          resampledLength: resampled.length,
        })
    );
    return [];
  }

  // Check if the resampled shape has sufficient area
  const area = calculateArea(resampled);
  if (area < MIN_AREA) {
    log.error(
      'Resampled path has insufficient area: ' +
        JSON.stringify({
          points: resampled.length,
          area: area,
          vertices: resampled.slice(0, 3),
        })
    );
    return [];
  }

  // Apply Douglas-Peucker simplification to reduce point count while preserving shape fidelity
  // This is crucial for performance in physics simulation - fewer points = faster collision detection
  
  // Simplification parameters:
  const tolerance = 4; // Distance tolerance - higher values = more aggressive simplification
  const highQuality = true; // Use slower but more accurate algorithm

  // Pre-process: identify points at high-curvature areas that should be preserved
  // This prevents simplification from creating sharp peaks where smooth curves should be
  const curvatureThreshold = 0.05; // Threshold for detecting significant direction changes
  // Identify "important" points that represent significant curvature changes
  // These points should be preserved during simplification to maintain shape accuracy
  const importantPoints = resampled.filter((point, i, points) => {
    if (i === 0 || i === points.length - 1) return true; // Always preserve path endpoints

    // Analyze curvature at this point by comparing incoming and outgoing directions
    if (i > 0 && i < points.length - 1) {
      const prev = points[i - 1];
      const curr = point;
      const next = points[i + 1];

      // Calculate direction vectors
      const v1x = curr.x - prev.x;
      const v1y = curr.y - prev.y;
      const v2x = next.x - curr.x;
      const v2y = next.y - curr.y;

      // Normalize vectors to get pure direction (magnitude = 1)
      const v1len = Math.sqrt(v1x * v1x + v1y * v1y);
      const v2len = Math.sqrt(v2x * v2x + v2y * v2y);

      if (v1len > 0 && v2len > 0) {
        const v1nx = v1x / v1len;
        const v1ny = v1y / v1len;
        const v2nx = v2x / v2len;
        const v2ny = v2y / v2len;

        // Dot product gives cosine of angle between vectors
        // Value close to 1 = vectors nearly parallel = straight line
        // Value significantly less than 1 = significant direction change = important curve point
        const dotProduct = v1nx * v2nx + v1ny * v2ny;

        if (dotProduct < 0.98) {
          return true; // Keep points where path curves significantly
        }
      }
    }

    return false;
  });

  // Determine if we should use curvature-based constraints during simplification
  // Only use constraints if we have a reasonable number of important points
  const useConstraints =
    importantPoints.length >= MIN_POINTS &&
    importantPoints.length < resampled.length * 0.5;

  // Apply Douglas-Peucker simplification algorithm
  // Note: simplify-js library only accepts 3 parameters (points, tolerance, highQuality)
  // Constraint handling must be done as post-processing
  let simplified = simplify(resampled, tolerance, highQuality);

  // Post-process: restore any important curvature points that were removed during simplification
  // This ensures that significant shape features are preserved even with aggressive simplification
  if (useConstraints && importantPoints.length > 0) {
    // Create efficient lookup set for simplified points
    const simplifiedSet = new Set(simplified.map((p) => `${p.x},${p.y}`));

    // Find important points that were removed during simplification
    const missingImportantPoints = importantPoints.filter(
      (p) => !simplifiedSet.has(`${p.x},${p.y}`)
    );

    if (missingImportantPoints.length > 0) {
      // Add back the missing important points
      simplified = [...simplified, ...missingImportantPoints];
      
      // Re-sort points to maintain proper path order
      // This ensures the path remains continuous and properly oriented
      simplified.sort((a, b) => {
        const aIndex = resampled.findIndex((p) => p.x === a.x && p.y === a.y);
        const bIndex = resampled.findIndex((p) => p.x === b.x && p.y === b.y);
        return aIndex - bIndex;
      });
    }
  }

  // Final validation: ensure we still have enough points for a valid polygon
  // If simplification was too aggressive, fall back to the original resampled points
  if (simplified.length < MIN_POINTS) {
    return resampled; // Preserve shape integrity over optimization
  }

  return simplified;
};

// -----------------------------
// Map Vertices
// -----------------------------
// Converts coordinate pairs to Matter.js Vector objects for physics body creation.
// Ensures data integrity before physics simulation to prevent runtime errors.
export const mapVertices = (setsOfVertices: [number, number][]): Vector[] =>{
  // Validate minimum polygon requirements
  if (
    !setsOfVertices ||
    !Array.isArray(setsOfVertices) ||
    setsOfVertices.length < 3
  ) {
    log.warn(
      'Invalid vertices for mapping:',
      {
        verticesLength: setsOfVertices ? setsOfVertices.length : 0,
      }
    );
    return [];
  }

  // Ensure all coordinates are valid numbers for physics simulation
  const hasInvalidVertices = setsOfVertices.some(
    (vertex) =>
      !Array.isArray(vertex) ||
      vertex.length !== 2 ||
      !isFinite(vertex[0]) ||
      !isFinite(vertex[1]) ||
      isNaN(vertex[0]) ||
      isNaN(vertex[1])
  );

  if (hasInvalidVertices) {
    log.warn(
      'Invalid vertex coordinates for mapping:',
      {
        firstVertex: setsOfVertices[0],
        verticesLength: setsOfVertices.length,
      }
    );
    return [];
  }

  return setsOfVertices.map((vertex) => Vector.create(vertex[0], vertex[1]));
}

// -----------------------------
// Combine Vertices
// -----------------------------
// Handles multiple vertex sets for compound shapes by validating and selecting the first valid set.
// Currently returns first valid set as placeholder - future enhancement will implement true geometric union.
export const combineVertices=(
  setsOfVertices: { x: number; y: number }[][]
): { x: number; y: number }[] =>{
  // Validate input
  if (
    !setsOfVertices ||
    !Array.isArray(setsOfVertices) ||
    setsOfVertices.length === 0
  ) {
    log.warn('Invalid vertex sets for combining: empty or not an array');
    return [];
  }

  // If only one set of vertices, validate and return it
  if (setsOfVertices.length === 1) {
    const vertices = setsOfVertices[0];
    if (!vertices || !Array.isArray(vertices) || vertices.length < 3) {
      log.warn(
        'Invalid single vertex set: ' +
          JSON.stringify({
            verticesLength: vertices ? vertices.length : 0,
          })
      );
      return [];
    }

    const hasInvalidVertices = vertices.some(
      (v) =>
        !v ||
        typeof v.x !== 'number' ||
        typeof v.y !== 'number' ||
        !isFinite(v.x) ||
        !isFinite(v.y) ||
        isNaN(v.x) ||
        isNaN(v.y)
    );

    if (hasInvalidVertices) {
      log.warn(
        'Invalid vertices in single set: ' +
          JSON.stringify({
            firstVertex: vertices[0],
            verticesLength: vertices.length,
          })
      );
      return [];
    }

    return vertices;
  }

  // For multiple sets, validate each set and combine valid ones
  const validSets = setsOfVertices.filter(
    (vertices) =>
      vertices &&
      Array.isArray(vertices) &&
      vertices.length >= 3 &&
      vertices.every(
        (v) =>
          v &&
          typeof v.x === 'number' &&
          typeof v.y === 'number' &&
          isFinite(v.x) &&
          isFinite(v.y) &&
          !isNaN(v.x) &&
          !isNaN(v.y)
      )
  );

  if (validSets.length === 0) {
    log.warn('No valid vertex sets found for combining');
    return [];
  }

  // Return the first valid set (for now - could be enhanced to actually combine sets)
  return validSets[0];
}

// -----------------------------
// Decompose Concave Shape
// -----------------------------
// Converts complex After Effects shapes into physics-compatible convex parts for Matter.js simulation.
// Uses poly-decomp for optimal splitting or falls back to convex hull when shapes are too complex.
export const decomposeConcaveShape=(
  vertices: { x: number; y: number }[]
): { x: number; y: number }[][]    => {
  // Validate input vertices
  if (!vertices || !Array.isArray(vertices) || vertices.length < 3) {
    log.warn(
      'Invalid vertices for decomposition: ' +
        JSON.stringify({
          verticesLength: vertices ? vertices.length : 0,
        })
    );
    return [];
  }

  const hasInvalidVertices = vertices.some(
    (v) =>
      !v ||
      typeof v.x !== 'number' ||
      typeof v.y !== 'number' ||
      !isFinite(v.x) ||
      !isFinite(v.y) ||
      isNaN(v.x) ||
      isNaN(v.y)
  );

  if (hasInvalidVertices) {
    log.warn(
      'Invalid vertices detected before decomposition: ' +
        JSON.stringify({
          firstVertex: vertices[0],
          verticesLength: vertices.length,
        })
    );
    return [];
  }

  try {
    // Reduce vertex count before decomposition to prevent performance bottlenecks
    // Complex After Effects paths can have thousands of points that slow physics simulation
    const tolerance = 4; // Balance between shape accuracy and performance
    const highQuality = true;
    const simplified = simplify(vertices, tolerance, highQuality);

    // Ensure we have enough points after simplification
    const pointsToUse = simplified.length >= 3 ? simplified : vertices;

    // Convert to expected format
    const points: [number, number][] = pointsToUse.map(
      (v) => [v.x, v.y] as [number, number]
    );

    // Ensure counterclockwise winding for poly-decomp algorithm compatibility
    decomp.makeCCW(points);

    // Simple shapes can be optimally decomposed into minimal convex parts
    if (decomp.isSimple && decomp.isSimple(points)) {
      // Split concave shape into convex parts for physics engine
      const parts = decomp.quickDecomp(points);

      // Validate decomposed parts
      const validParts = parts.filter(
        (part) =>
          part &&
          Array.isArray(part) &&
          part.length >= 3 &&
          part.every(
            (p) =>
              Array.isArray(p) &&
              p.length === 2 &&
              isFinite(p[0]) &&
              isFinite(p[1]) &&
              !isNaN(p[0]) &&
              !isNaN(p[1])
          )
      );

      if (validParts.length === 0) {
        log.warn('No valid parts after decomposition');
        return [];
      }

      // Convert to Matter.js format
      return validParts.map((part) => part.map(([x, y]) => ({ x, y })));
    }

    // Complex shapes get simplified to single convex boundary for performance
    const externalPoints = computeConvexHull(points);

    // Validate convex hull points
    if (
      !externalPoints ||
      !Array.isArray(externalPoints) ||
      externalPoints.length < 3
    ) {
      log.warn(
        'Invalid convex hull result: ' +
          JSON.stringify({
            pointsLength: externalPoints ? externalPoints.length : 0,
          })
      );
      return [];
    }

    const hasInvalidHullPoints = externalPoints.some(
      (p) =>
        !Array.isArray(p) ||
        p.length !== 2 ||
        !isFinite(p[0]) ||
        !isFinite(p[1]) ||
        isNaN(p[0]) ||
        isNaN(p[1])
    );

    if (hasInvalidHullPoints) {
      log.warn('Invalid points in convex hull');
      return [];
    }

    return [externalPoints.map(([x, y]) => ({ x, y }))];
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.warn('Error during shape decomposition: ' + errorMessage);
    return [];
  }
}

// -----------------------------
// Compute Convex Hull
// -----------------------------
// Creates simplified collision boundary using Graham scan algorithm when complex shapes fail decomposition.
// Ensures physics engine gets valid convex shape for collision detection, preventing simulation crashes.
export const computeConvexHull=(points: [number, number][]): [number, number][] =>{
  if (points.length < 3) return points;

  // Start with guaranteed hull point to establish consistent orientation
  let bottom = 0;
  for (let i = 1; i < points.length; i++) {
    if (
      points[i][1] < points[bottom][1] ||
      (points[i][1] === points[bottom][1] && points[i][0] < points[bottom][0])
    ) {
      bottom = i;
    }
  }

  // Place starting point first for Graham scan algorithm
  [points[0], points[bottom]] = [points[bottom], points[0]];
  const pivot = points[0];

  // Order points by angle from pivot to build hull counterclockwise
  const sortedPoints = points.slice(1).sort((a, b) => {
    const angleA = Math.atan2(a[1] - pivot[1], a[0] - pivot[0]);
    const angleB = Math.atan2(b[1] - pivot[1], b[0] - pivot[0]);
    if (angleA !== angleB) return angleA - angleB;
    // Prefer closer points when angles match to avoid redundant vertices
    const distA = Math.pow(a[0] - pivot[0], 2) + Math.pow(a[1] - pivot[1], 2);
    const distB = Math.pow(b[0] - pivot[0], 2) + Math.pow(b[1] - pivot[1], 2);
    return distA - distB;
  });

  const hull: [number, number][] = [pivot];

  for (const point of sortedPoints) {
    // Maintain convex property by eliminating interior points
    while (
      hull.length > 1 &&
      crossProduct(hull[hull.length - 2], hull[hull.length - 1], point) <= 0
    ) {
      hull.pop();
    }
    hull.push(point);
  }

  return hull;
}