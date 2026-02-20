// -----------------------------
// Gravitae Utility: formatters
// -----------------------------
// Utility functions for formatting objects, especially for display in the UI.
// Includes pretty-printing for JSON with special handling for vectors and bounds.

import log from '../../utils/logger';

// -----------------------------
// JSON Formatter
// -----------------------------
// Formats objects as pretty-printed JSON, with special handling for vectors and bounds.
// Used for displaying simulation and layer data in a readable format in the UI.
export const formatJSON = (obj: any, indent = 2): string => {
  try {
    const spacer = ' '.repeat(indent);
    const jsonStr = JSON.stringify(
      obj,
      (key, value) => {
        // Handle Vector-like objects (position, velocity, force, bounds)
        if (value && typeof value === 'object') {
          if (value.x !== undefined && value.y !== undefined) {
            return `{x: ${value.x.toFixed(2)}, y: ${value.y.toFixed(2)}}`;
          }
          // Handle bounds object
          if (value.min && value.max) {
            return `{min: {x: ${value.min.x.toFixed(
              2
            )}, y: ${value.min.y.toFixed(2)}}, max: {x: ${value.max.x.toFixed(
              2
            )}, y: ${value.max.y.toFixed(2)}}}`;
          }
        }
        return value;
      },
      spacer
    );

    // Clean up JSON string for display
    return jsonStr
      .replace(/\n/g, '\n')
      .replace(/\'/g, "'")
      .replace(/\r/g, '')
      .replace(/\t/g, spacer)
      .replace(/"\["/g, '[')
      .replace(/"\]"/g, ']');
  } catch (error: any) {
    log.error('Error formatting object: ' + error);
    return `[Error formatting object: ${error.message || 'Unknown error'}]`;
  }
};
