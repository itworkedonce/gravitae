// -----------------------------
// Gravitae Component: Button
// -----------------------------
// Reusable button component with icon support and tooltip functionality.
// Supports different button types with specific styling based on label.

import React, { useState } from 'react';
import styles from './Button.module.scss';

// -----------------------------
// Button Props
// -----------------------------
// Interface for the Button component props.
type ButtonProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>; // Changed to React component type
};

// -----------------------------
// Button Component
// -----------------------------
// Renders a button with optional icon, tooltip, and type-specific styling.
// Supports Static, Dynamic, Run, and Clear button types.
const Button = ({
  label,
  onClick,
  disabled = false,
  icon: Icon,
}: ButtonProps) => {
  // State to track if tooltip should be shown
  const [showTooltip, setShowTooltip] = useState(false);

  // Determine button type based on label for styling
  let buttonTypeClass = '';
  if (label === 'Static') buttonTypeClass = styles.staticButton;
  else if (label === 'Dynamic') buttonTypeClass = styles.dynamicButton;
  else if (label === 'Run') buttonTypeClass = styles.playButton;
  else if (label === 'Clear') buttonTypeClass = styles.deleteButton;
  else if (label === 'Centroid') buttonTypeClass = styles.centroidButton;
  else if (label === 'Constraint') buttonTypeClass = styles.constraintButton;
  else if (label === 'Magnet') buttonTypeClass = styles.magnetButton;
  else if (label === 'World' || label === 'Settings') buttonTypeClass = styles['worldButton+'];
  else if (label === 'Play') buttonTypeClass = styles.playTextButton;
  else if (label === 'Apply' || label === 'RESET') buttonTypeClass = styles.applyTextButton;

  // Combine base button class with type-specific and disabled classes
  const buttonClass = disabled
    ? `${styles.button} ${styles.disabled} ${buttonTypeClass}`
    : `${styles.button} ${buttonTypeClass}`;

  return (
    <div className={styles.buttonContainer}>
      <button
        className={buttonClass}
        onClick={onClick}
        disabled={disabled}
        title={label} // Keep title attribute for accessibility
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {Icon ? (
          <span className={styles.iconWrapper}>
            <Icon
              width="100%"
              height="100%"
              preserveAspectRatio="xMidYMax meet"
              className={styles.icon}
            />
          </span>
        ) : (
          label
        )}
      </button>
      {showTooltip && Icon && <div className={styles.tooltip}>{label}</div>}
    </div>
  );
};

export default React.memo(Button);
