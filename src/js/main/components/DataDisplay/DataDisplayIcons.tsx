// -----------------------------
// Gravitae Component: DataDisplayIcons
// -----------------------------
// Icon components for DataDisplay component.
// Contains SVG icons used in layer data visualization.

import React from 'react';

export const RemoveIcon: React.FC = () => (
  <svg width="10" height="10" viewBox="0 0 11 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0.5 10.75L10.5 0.75" stroke="#D1D1D1" strokeMiterlimit="10" />
    <path d="M0.611389 0.972717L10.3886 10.75" stroke="#D1D1D1" strokeMiterlimit="10" />
  </svg>
);

interface MagnetismIconProps {
  isActive?: boolean;
}

export const MagnetismIcon: React.FC<MagnetismIconProps> = ({ isActive = false }) => {
  const strokeColor = isActive ? '#D1D1D1' : '#545454';

  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 10.584C2.2341 9.8124 1 8.05032 1 6C1 3.23858 3.23858 1 6 1C8.76142 1 11 3.23858 11 6C11 8.05032 9.7659 9.8124 8 10.584" stroke={strokeColor} />
      <circle cx="6" cy="6" r="1.5" stroke={strokeColor} />
    </svg>
  );
};

interface ConstraintIconProps {
  isActive?: boolean;
}

export const ConstraintIcon: React.FC<ConstraintIconProps> = ({ isActive = false }) => {
  const strokeColor = isActive ? '#D1D1D1' : '#545454';

  return (
    <svg width="11" height="10" viewBox="0 0 11 10" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="2" cy="2" r="1.5" stroke={strokeColor} />
      <circle cx="9" cy="8" r="1.5" stroke={strokeColor} />
      <path d="M3 2H5.5V8H8" stroke={strokeColor} />
    </svg>
  );
};