// -----------------------------
// Gravitae Service: notifyService
// -----------------------------
// Service that provides UI notifications without automatic logging.
// Uses the InfoDisplay component to show messages as overlays.

import { useInfoDisplay } from "../hooks/useInfoDisplay";

// -----------------------------
// Notify Service Hook
// -----------------------------
// Custom hook that provides notification functions.
// Only displays messages in the UI without automatic logging.
export const useNotifyService = () => {
  const { showMessage } = useInfoDisplay();
  let isDisabled = true;

  // Type for structured message objects
  type MessageObject = {
    message: string;
    [key: string]: any;
  };

  // Helper to extract message string from either string or object
  const extractMessage = (msg: string | MessageObject): string => {
    if (typeof msg === "string") {
      return msg;
    } else if (msg && typeof msg === "object" && "message" in msg) {
      return msg.message;
    }
    return String(msg);
  };

  // Controls whether notifications are currently disabled
  const disable = () => {
    isDisabled = true;
  };
  const enable = () => {
    isDisabled = false;
  };
  const toggle = () => {
    isDisabled = !isDisabled;
  };

  // Notification functions that only display messages in UI
  const info = (message: string | MessageObject) => {
    if (isDisabled) return;
    showMessage(extractMessage(message), "info");
  };

  const warn = (message: string | MessageObject) => {
    if (isDisabled) return;
    showMessage(extractMessage(message), "warn");
  };

  const error = (message: string | MessageObject) => {
    if (isDisabled) return;
    showMessage(extractMessage(message), "error");
  };

  return {
    info,
    warn,
    error,
    disable,
    enable,
    toggle,
    get isDisabled() {
      return isDisabled;
    },
  };
};
