// -----------------------------
// Gravitae Component: ButtonIcons
// -----------------------------
// SVG icon components for the simulation control buttons.
// Each icon represents a specific action (Dynamic, Static, Run, Clear, Centro, Constraint, Magnet, Settings).

import React from 'react';
import styles from './Button.module.scss';

// -----------------------------
// Centro Button Icon
// -----------------------------
// Icon representing the centroid action with crosshairs and center point.
export const CentroidButtonIcon: React.FC = () => (
  <svg
    className={styles.icon} viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M34.53 24.5H29.27C29.16 23.57 28.76 22.66 28.04 21.95C27.33 21.24 26.42 20.85 25.5 20.74V15.48H24.5V20.74C23.56 20.84 22.65 21.24 21.93 21.96C21.22 22.67 20.83 23.58 20.73 24.51H15.47V25.51H20.73C20.84 26.45 21.24 27.35 21.96 28.07C22.67 28.78 23.57 29.17 24.5 29.28V34.54H25.5V29.29C26.44 29.19 27.36 28.79 28.07 28.07C28.78 27.35 29.17 26.45 29.27 25.51H34.52V24.51L34.53 24.5ZM27.36 27.36C26.07 28.65 23.96 28.65 22.66 27.36C21.36 26.06 21.34 23.95 22.63 22.66C23.27 22.01 24.12 21.69 24.97 21.69C25.82 21.69 26.68 22.01 27.33 22.66C28.63 23.96 28.65 26.07 27.36 27.36Z" fill="#D1D1D1" />
    <path d="M17.94 39.72H10.28V32.07H11.28V38.72H17.94V39.72Z" fill="#545454" />
    <path d="M39.72 39.72H32.07V38.72H38.72V32.07H39.72V39.72Z" fill="#545454" />
    <path d="M39.72 17.94H38.72V11.28H32.07V10.28H39.72V17.94Z" fill="#545454" />
    <path d="M11.28 17.94H10.28V10.28H17.94V11.28H11.28V17.94Z" fill="#545454" />
  </svg>

);

// -----------------------------
// Dynamic Button Icon
// -----------------------------
// Icon representing dynamic physics bodies (affected by gravity and forces).
// Shows a sphere with motion lines and a shadow.
export const DynamicButtonIcon: React.FC = () => (
  <svg
    className={styles.icon}
    viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 9.0505C7 4.63647 10.5758 1.03049 14.9899 1.00019C19.404 0.969889 22.9899 4.53546 23 8.9495C23 13.3635 19.4242 16.9695 15.0101 16.9998C10.596 17.0301 7.0101 13.4645 7 9.0505Z" stroke="#D1D1D1" stroke-miterlimit="10" />
    <path d="M15.0103 16.9998L14.9899 1.00015" stroke="#D1D1D1" stroke-miterlimit="10" />
    <path d="M23 8.9899L7 9.01028" stroke="#D1D1D1" stroke-miterlimit="10" />
    <path d="M26 24.2767H4V29.2767H26V24.2767Z" stroke="#545454" stroke-miterlimit="10" />
  </svg>

)
// -----------------------------
// Static Button Icon
// -----------------------------
// Icon representing static physics bodies (immovable, fixed in place).
// Shows a sphere with static lines and a solid base.
export const StaticButtonIcon: React.FC = () => (
  <svg
    className={styles.icon} viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M26 24H4V29H26V24Z" stroke="#D1D1D1" stroke-miterlimit="10" />
    <path d="M18.7 24H11V29H18.7V24Z" stroke="#D1D1D1" stroke-miterlimit="10" />
    <path d="M9.34257 14.6622C6.21914 11.5316 6.21914 6.46589 9.34257 3.34542C12.466 0.224955 17.534 0.214824 20.6574 3.33529C23.7809 6.45576 23.7809 11.5316 20.6574 14.6521C17.534 17.7826 12.466 17.7826 9.34257 14.6521V14.6622Z" stroke="#545454" stroke-miterlimit="10" />
  </svg>

);

// -----------------------------
// Run Button Icon
// -----------------------------
// Icon representing the play/run action for starting simulation.
// Shows a standard play triangle pointing right.
export const RunButtonIcon: React.FC = () => (
  <svg
    className={styles.icon}
    viewBox="0 0 29.42 29.42"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path fill="#adadad" d="M6.69,25.06l-1.06-.61V4.98l1.06-.61,16.86,9.73v1.23L6.69,25.06ZM7.05,6.2v17.01l14.73-8.5L7.05,6.2Z" />
  </svg>
);

// -----------------------------
// Clear Button Icon
// -----------------------------
// Icon representing the clear/delete action for removing bodies.
// Shows an X mark for deletion.
export const ClearButtonIcon: React.FC = () => (
  <svg
    className={styles.icon} viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M34.35 16.35L33.65 15.65L25 24.29L16.35 15.65L15.65 16.35L24.29 25L15.65 33.65L16.35 34.35L25 25.71L33.65 34.35L34.35 33.65L25.71 25L34.35 16.35Z" fill="#D1D1D1" />
  </svg>

);

// -----------------------------
// Constraint Button Icon
// -----------------------------
// Icon representing constraint connections between bodies.
// Shows connected elements with constraint points.
export const ConstraintButtonIcon: React.FC = () => (
  <svg
    className={styles.icon}
    viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M25.56 37.08V31.71H28.22V17.81H25.56V11.72H16.33V12.72H24.56V17.81H21.79V31.71H24.56V38.08H33.8V37.08H25.56ZM22.8 18.81H27.23V30.71H22.8V18.81Z" fill="#D1D1D1" />
    <path d="M37.46 41.52C35.16 41.52 33.28 39.65 33.28 37.35C33.28 35.05 35.15 33.18 37.46 33.18C39.77 33.18 41.64 35.05 41.64 37.35C41.64 39.65 39.77 41.52 37.46 41.52ZM37.46 34.17C35.71 34.17 34.28 35.59 34.28 37.34C34.28 39.09 35.7 40.51 37.46 40.51C39.22 40.51 40.64 39.09 40.64 37.34C40.64 35.59 39.22 34.17 37.46 34.17Z" fill="#545454" />
    <path d="M13.15 16.35C10.85 16.35 8.96997 14.48 8.96997 12.18C8.96997 9.88001 10.84 8.01001 13.15 8.01001C15.46 8.01001 17.33 9.88001 17.33 12.18C17.33 14.48 15.46 16.35 13.15 16.35ZM13.15 9.00001C11.4 9.00001 9.96997 10.42 9.96997 12.17C9.96997 13.92 11.39 15.34 13.15 15.34C14.91 15.34 16.33 13.92 16.33 12.17C16.33 10.42 14.91 9.00001 13.15 9.00001Z" fill="#545454" />
  </svg>

);

// -----------------------------
// Magnet Button Icon
// -----------------------------
// Icon representing magnetic forces and attraction.
// Shows a magnet with field lines and center point.
export const MagnetButtonIcon: React.FC = () => (
  <svg
    className={styles.icon}
    viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.89 35.4C16.55 33.59 14.31 29.68 14.31 25.69C14.31 19.8 19.1 15.01 24.99 15.01C30.88 15.01 35.67 19.8 35.67 25.69C35.67 29.6 33.53 33.19 30.09 35.06L29.61 34.18C32.73 32.48 34.67 29.23 34.67 25.68C34.67 20.34 30.33 16 24.99 16C19.65 16 15.31 20.34 15.31 25.68C15.31 29.32 17.34 32.87 20.37 34.51L19.89 35.39V35.4Z" fill="#D1D1D1" />
    <path d="M33.12 40.59L32.63 39.72C37.57 36.96 40.64 31.73 40.64 26.09C40.64 17.47 33.62 10.46 25 10.46C16.38 10.46 9.37 17.47 9.37 26.09C9.37 31.72 12.44 36.95 17.38 39.72L16.89 40.59C11.63 37.64 8.37 32.08 8.37 26.09C8.37 16.92 15.83 9.45999 25 9.45999C34.17 9.45999 41.64 16.92 41.64 26.09C41.64 32.1 38.37 37.66 33.12 40.6V40.59Z" fill="#D1D1D1" />
    <path d="M24.99 30.84C22.39 30.84 20.27 28.71 20.27 26.09C20.27 23.47 22.39 21.34 24.99 21.34C27.59 21.34 29.71 23.47 29.71 26.09C29.71 28.71 27.59 30.84 24.99 30.84ZM24.99 22.34C22.94 22.34 21.27 24.02 21.27 26.09C21.27 28.16 22.94 29.84 24.99 29.84C27.04 29.84 28.71 28.16 28.71 26.09C28.71 24.02 27.04 22.34 24.99 22.34Z" fill="#545454" />
  </svg>

);

// -----------------------------
// World Button Icon
// -----------------------------

interface WorldButtonIconProps {
  sliderColor?: string;
  knobColor?: string;
  className?: string;
}

export const WorldButtonIcon: React.FC<WorldButtonIconProps> = () => (
  <svg className={styles.icon} viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 21.0505C7 16.6365 10.5758 13.0305 14.9899 13.0002C19.404 12.9699 22.9899 16.5355 23 20.9495C23 25.3635 19.4242 28.9695 15.0101 28.9998C10.596 29.0301 7.0101 25.4645 7 21.0505Z" stroke="#545454" stroke-miterlimit="10" />
    <path d="M15.0103 28.9998L14.9899 13.0002" stroke="#545454" stroke-miterlimit="10" />
    <path d="M23 20.9899L7 21.0103" stroke="#545454" stroke-miterlimit="10" />
    <path d="M28 2H2V22C2 22 2 7 15 7C28 7 28 22 28 22V2Z" stroke="#D1D1D1" stroke-miterlimit="10" />
  </svg>









);
