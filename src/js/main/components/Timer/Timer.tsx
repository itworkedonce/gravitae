// -----------------------------
// Gravitae Component: Timer
// -----------------------------
// Displays the current simulation time in MM:SS:FF format.
// Updates automatically when the simulation time changes.

import { useEffect, useLayoutEffect, useState } from 'react';
import styles from './Timer.module.scss';
import { formatTime } from '../../utils';
import { useAppState } from '../../context/AppStateContext';

// -----------------------------
// Timer Component
// -----------------------------
// Renders the current simulation time with proper formatting.
// Uses local state to prevent unnecessary re-renders.
const Timer = () => {
  const { timing: { currentTime, compFramerate, workarea } } = useAppState();
  const [displayTime, setDisplayTime] = useState(currentTime || 0);

  // Update display time when current time changes
  // Using useLayoutEffect to ensure display updates before browser paint
  useLayoutEffect(() => {
    setDisplayTime(currentTime || 0);
  }, [currentTime]);


  return (
    <div className={styles.timerContainer}>
      <span className={styles.timer}>
        {formatTime(displayTime, compFramerate || 30)}
      </span>
      <meter
          className={styles.timebar}
          min={workarea[0]}
          max={workarea[1]}
          value={currentTime}
      />
    </div>
  );
};

export default Timer;
