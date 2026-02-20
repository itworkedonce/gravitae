// -----------------------------
// Gravitae Utility: theme
// -----------------------------
// Utility functions for handling theme-related operations and CSS variable updates.
// Used to extract, subscribe, and apply theme colors from the host environment.
import { subscribeBackgroundColor } from "../../lib/utils/bolt";
import log from "../../utils/logger";

// Track last applied theme to prevent duplicate logging
let lastAppliedTheme: string | null = null;
// -----------------------------
// Calculate Luminance
// -----------------------------
// Calculates luminance from RGB values (0-255).
// Used to determine if a background is light, medium, or dark.
export const calculateLuminance = (r: number, g: number, b: number): number => {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};

// -----------------------------
// Get Font Color
// -----------------------------
// Determines appropriate font color based on background luminance.
// Returns a dark or light font color for contrast.
export const getFontColor = (luminance: number): string => {
  return luminance > 0.5 ? "#464646" : "#bbbbbb";
};

// -----------------------------
// Extract RGB Values
// -----------------------------
// Extracts RGB values from a CSS RGB string (e.g., "rgb(50,50,50)").
// Returns an array of [r, g, b] values or null if invalid.
export const extractRGBValues = (
  rgbString: string
): [number, number, number] | null => {
  const rgbValues = rgbString.match(/\d+/g);
  if (!rgbValues || rgbValues.length < 3) return null;

  return [
    parseInt(rgbValues[0]),
    parseInt(rgbValues[1]),
    parseInt(rgbValues[2]),
  ];
};

// -----------------------------
// Setup Theme Subscription
// -----------------------------
// Sets up theme subscription and returns a cleanup function.
// Listens for background color changes from the host environment.
export const setupThemeSubscription = (
  setBgColor: (color: string) => void
): { unsubscribe: () => void } => {
  if (window.cep) {
    // Get initial color immediately
    const initialColor = window.__adobe_cep__.getHostEnvironment();
    if (initialColor) {
      const skinInfo = JSON.parse(initialColor).appSkinInfo;
      if (skinInfo && skinInfo.panelBackgroundColor) {
        const { red, green, blue } = skinInfo.panelBackgroundColor.color;
        const color = `rgb(${red}, ${green}, ${blue})`;
        console.log("Initial theme color:", color);
        setBgColor(color);
      }
    }

    // Subscribe to future changes
    subscribeBackgroundColor((color) => {
      console.log("Theme color changed:", color);
      setBgColor(color);
    });

    return { unsubscribe: () => { } };
  }
  return { unsubscribe: () => { } };
};

// -----------------------------
// Apply Theme Variables
// -----------------------------
// Applies theme variables to document root based on background color and luminance.
// Sets CSS variables for background, color, and highlight shades.
export const applyThemeVariables = (bgColor: string, fontColor: string) => {
  // For light backgrounds, override with #F5F5F5
  const luminance = calculateLuminance(
    ...(extractRGBValues(bgColor) || [255, 255, 255])
  );
  // const actualBgColor = luminance > 0.5 ? '#f8f8f8' : bgColor;

  const themeType =
    luminance > 0.9 ? "Light" : luminance > 0.15 ? "Medium" : "Dark";
  const shouldLog = lastAppliedTheme !== themeType;
  lastAppliedTheme = themeType;

  // Example enhancement
  if (luminance > 0.9) {
    // Light UI
    document.documentElement.style.setProperty("--app--bg", "#f8f8f8");
    document.documentElement.style.setProperty("--app--color", "#464646");
    document.documentElement.style.setProperty("--app--deep", "#d5d5d5");
    document.documentElement.style.setProperty(
      "--app--deep__border",
      "#9f9f9f"
    );
    document.documentElement.style.setProperty("--app--highlight", "#b2b2b2");
    document.documentElement.style.setProperty(
      "--app--highlight__border",
      "#b2b2b2"
    );
  } else if (luminance > 0.15) {
    // Medium UI
    document.documentElement.style.setProperty("--app--bg", "#323232");
    document.documentElement.style.setProperty("--app--color", "#d1d1d1");
    document.documentElement.style.setProperty("--app--deep", "#262626");
    document.documentElement.style.setProperty(
      "--app--deep__border",
      "#3f3f3f"
    );
    document.documentElement.style.setProperty("--app--highlight", "#545454");
    document.documentElement.style.setProperty(
      "--app--highlight__border",
      "#545454"
    );
  } else {
    // Dark UI
    document.documentElement.style.setProperty("--app--bg", "#1d1d1d");
    document.documentElement.style.setProperty("--app--color", "#d0d0d0");
    document.documentElement.style.setProperty("--app--deep", "#0e0e0e");
    document.documentElement.style.setProperty(
      "--app--deep__border",
      "#303030"
    );
    document.documentElement.style.setProperty("--app--highlight", "#4b4b4b");
    document.documentElement.style.setProperty(
      "--app--highlight__border",
      "#4b4b4b"
    );
  }
  if (shouldLog) {
    log.info(`${themeType} theme applied`);
  }
};
