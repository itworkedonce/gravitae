// -----------------------------
// Gravitae Utility: Mathematical Operations
// -----------------------------
// Core mathematical functions for physics simulation and geometric calculations.
// Provides angle conversion and vector operations for Matter.js integration.


// -----------------------------
// Convert to Radians
// -----------------------------
// Converts After Effects rotation values to physics engine format.
// After Effects uses degrees while Matter.js requires radians for all calculations.
export const  toRadians = (degrees: number): number=> {
  return (degrees * Math.PI) / 180;
}

// -----------------------------
// Cross Product
// -----------------------------
// Calculates cross product for determining point orientation in geometric algorithms.
// Used in convex hull computation and polygon winding direction validation.
export const  crossProduct=(
  o: [number, number],
  a: [number, number],
  b: [number, number]
): number => {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}
