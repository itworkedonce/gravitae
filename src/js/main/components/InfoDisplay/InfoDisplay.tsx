// -----------------------------
// Gravitae Component: InfoDisplay
// -----------------------------
// Overlay component that displays notification messages temporarily on the screen.
// Used to show info, warning, and error messages to the user.

import React, { useState, useEffect } from 'react';
import styles from './InfoDisplay.module.scss';

// -----------------------------
// Info Display Props
// -----------------------------
// Interface for the InfoDisplay component props.
export type InfoDisplayProps = {
  message: string;
  type: 'info' | 'warn' | 'error';
  duration?: number; // Duration in milliseconds
  onClose?: () => void;
};

// -----------------------------
// Info Display Component
// -----------------------------
// Renders a temporary overlay message with different styling based on message type.
const InfoDisplay: React.FC<InfoDisplayProps> = ({
  message,
  type,
  duration = 3000, // Default duration: 3 seconds
  onClose,
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Set a timeout to hide the message after the specified duration
    const timer = setTimeout(() => {
      setVisible(false);
      if (onClose) onClose();
    }, duration);

    // Clear the timeout if the component unmounts
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  // If not visible, don't render anything
  if (!visible) return null;

  // Determine the CSS class based on the message type
  const messageClass = `${styles.message} ${styles[type]}`;

  return (
    <div className={styles.overlay}>
      <div className={messageClass}>
        <span className={styles.icon}>{getIcon(type)}</span>
        <span className={styles.text}>{message}</span>
      </div>
    </div>
  );
};

// Helper function to get the appropriate icon based on message type
// You can uncomment any of the alternatives below to change the info icon
const getIcon = (type: 'info' | 'warn' | 'error') => {
  switch (type) {
    case 'info':
      return '✓'; // Checkmark - simple success indicator
      // Alternative icons for info messages:
      // return '💡'; // Light bulb - suggests a helpful tip
      // return '🔔'; // Bell - notification
      // return '📌'; // Pin - important information
      // return 'ℹ️'; // Information symbol - standard info
    case 'warn':
      return '⚠️';
    case 'error':
      return '❌';
    default:
      return '✓';
  }
};

export default InfoDisplay;