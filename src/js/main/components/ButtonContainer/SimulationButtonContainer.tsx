// -----------------------------
// Gravitae Component: SimulationButtonContainer
// -----------------------------
// Container component that renders simulation-specific action buttons.
// Focused on simulation control with Settings, Play, and Apply buttons.

import React from 'react';
import styles from './SimulationButtonContainer.module.scss';
import Button from '../Button/Button';
import { useButtonHandlers } from '../../hooks/useButtonHandlers';

// -----------------------------
// Button Configuration Type
// -----------------------------
// Type definition for button configuration objects.
type ButtonConfig = {
  label: string;
  onClick: () => void;
  disabled: boolean;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

// -----------------------------
// Simulation Button Container Component
// -----------------------------
// Renders a container with simulation control buttons.
// Includes Settings button and two action buttons: Play and Apply.
const SimulationButtonContainer = () => {
  const { buttonConfig } = useButtonHandlers();

  // Get the Settings button from existing config
  const settingsButton = buttonConfig.find(button => button.label === 'Settings');

  // Get the Run button configuration to use its functionality for Play button
  const runButton = buttonConfig.find(button => button.label === 'Run');

  // Create Play and Apply button configurations
  const playButton: ButtonConfig = {
    label: 'Play',
    onClick: runButton?.onClick || (() => { }),
    disabled: runButton?.disabled || false,
    icon: undefined
  };

  // Get the Apply button from existing config (can be 'Apply' or 'RESET')
  const applyButtonConfig = buttonConfig.find(button => button.label === 'Apply' || button.label === 'RESET');

  const applyButton: ButtonConfig = {
    label: applyButtonConfig?.label || 'Apply',
    onClick: applyButtonConfig?.onClick || (() => { }),
    disabled: applyButtonConfig?.disabled || false,
    icon: undefined
  };

  // Create array with proper type safety
  const simulationButtons: ButtonConfig[] = [];
  // if (settingsButton) {
  //   simulationButtons.push(settingsButton);
  // }
  simulationButtons.push(playButton, applyButton);

  return (
    <div className={styles['simulation-button-container']}>
      <div className={styles['simulation-buttons']}>
        {simulationButtons.map((button, index: number) => {
          // Determine wrapper class based on whether button has an icon
          const wrapperClass = button.icon
            ? styles['icon-button']
            : styles['text-button'];

          return (
            <div key={`simulation-${index}`} className={wrapperClass}>
              <Button
                label={button.label}
                onClick={button.onClick}
                disabled={button.disabled}
                icon={button.icon}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(SimulationButtonContainer);