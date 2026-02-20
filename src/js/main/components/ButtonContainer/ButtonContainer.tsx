// -----------------------------
// Gravitae Component: ButtonContainer
// -----------------------------
// Container component that renders all action buttons for the simulation.
// Uses button configuration from useButtonHandlers hook.

import React from 'react';
import styles from './ButtonContainer.module.scss';
import Button from '../Button/Button';
import { useButtonHandlers } from '../../hooks/useButtonHandlers';

// -----------------------------
// Button Container Component
// -----------------------------
// Renders a container with all simulation control buttons.
// Groups buttons with Dynamic and Static on the left, Run and Clear on the right.
const ButtonContainer = () => {
  const { buttonConfig } = useButtonHandlers();

  // Separate buttons into left and right groups
  const leftButtons = buttonConfig.filter(button =>
    ['Dynamic', 'Static'].includes(button.label)
  );

  const rightButtons = buttonConfig.filter(button =>
    ['World'].includes(button.label)
  );
  // Get the Settings button from existing config
  const settingsButton = buttonConfig.find(button => button.label === 'World');

  return (
    <div className={styles['button-container']}>
      <div className={styles['left-buttons']}>
        {leftButtons.map((button, index: number) => (
          <Button
            key={`left-${index}`}
            label={button.label}
            onClick={button.onClick}
            disabled={button.disabled}
            icon={button.icon}
          />
        ))}
      </div>
      <div className={styles['right-buttons']}>
        {rightButtons.map((button, index: number) => (
          <Button
            key={`right-${index}`}
            label={button.label}
            onClick={button.onClick}
            disabled={button.disabled}
            icon={button.icon}
          />
        ))}
      </div>
    </div>
  );
};

export default React.memo(ButtonContainer);
