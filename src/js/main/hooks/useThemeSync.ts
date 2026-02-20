// -----------------------------
// Gravitae Hook: useThemeSync
// -----------------------------
// Custom hook for synchronizing the app theme with the host environment.
// Automatically updates CSS variables based on background color changes.
import { useEffect } from 'react';
import {
  setupThemeSubscription,
  applyThemeVariables,
  calculateLuminance,
  getFontColor,
  extractRGBValues,
} from '../utils/theme';

// -----------------------------
// Use Theme Sync Hook
// -----------------------------
// Sets up theme subscription and applies theme variables when background color changes.
// Calculates appropriate font color based on background luminance.
export function useThemeSync() {
  useEffect(() => {
    // Function to handle background color changes
    const setBgColor = (color: string) => {
      const rgb = extractRGBValues(color);
      if (!rgb) return;

      const [r, g, b] = rgb;
      const luminance = calculateLuminance(r, g, b);
      const fontColor = getFontColor(luminance);
      applyThemeVariables(color, fontColor);
    };

    // Set up theme subscription and return cleanup function
    const subscription = setupThemeSubscription(setBgColor);
    return () => subscription.unsubscribe();
  }, []);
}
