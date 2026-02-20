// -----------------------------
// Gravitae Utility: timeUtils
// -----------------------------
// Utility functions for formatting time values in MM:SS:FF format.
// Used for displaying time in the UI, especially in the timer component.

// -----------------------------
// Format Time
// -----------------------------
// Format time in MM:SS:FF format (minutes:seconds:frame).
// Used for displaying current time in the simulation timeline.
export const formatTime = (timeInSeconds: number, fps: number = 30): string => {
  // Handle NaN or undefined values
  if (
    isNaN(timeInSeconds) ||
    timeInSeconds === undefined ||
    timeInSeconds === null
  ) {
    timeInSeconds = 0;
  }
  if (isNaN(fps) || fps === undefined || fps === null || fps <= 0) {
    fps = 30;
  }

  // Ensure timeInSeconds is a positive number
  timeInSeconds = Math.max(0, timeInSeconds);

  // Calculate minutes and seconds
  const totalSeconds = Math.floor(timeInSeconds);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);

  // Calculate frames from the fractional part with consistent rounding
  const fractionalPart = timeInSeconds - totalSeconds;

  // Use consistent rounding that matches the simulation frame calculation
  // Round to nearest frame instead of using epsilon and floor
  const frameIndex = Math.round(fractionalPart * fps);
  const frames = Math.min(frameIndex, Math.floor(fps) - 1);

  // Format each component with leading zeros
  const minutesStr = minutes.toString().padStart(2, "0");
  const secondsStr = seconds.toString().padStart(2, "0");
  const framesStr = frames.toString().padStart(2, "0");

  return `${minutesStr}:${secondsStr}:${framesStr}`;
};
