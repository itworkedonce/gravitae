// -----------------------------
// Gravitae Component: Logger
// -----------------------------
// Text display component that shows scrollable log messages with consistent styling.
// Displays log messages from the LoggerContext.

import React, { useState } from 'react';
import { useLogger } from '../../context/LoggerContext';
import styles from './Logger.module.scss';

const Logger: React.FC = () => {
  const { logs } = useLogger();
  const [isVisible, setIsVisible] = useState(false);

  // Toggle logger content visibility when button is clicked
  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  return (
    <div className={styles.logger}>
      <div className={styles['logger-header']}>
        <button className={styles['toggle-button']} onClick={toggleVisibility}>
          {isVisible ? 'Hide logs' : 'Show logs'}
        </button>
        <span className={styles['version-badge']}>alpha.2</span>
      </div>
      {isVisible && (
        <div className={styles['logger-content-wrapper']}>
          <div className={styles['logger-content']}>
            {[...logs]
              .sort((a, b) => (b.timestampMs ?? 0) - (a.timestampMs ?? 0) || b.id - a.id)
              .map((log) => (
                <div key={log.id} className={styles[`log-${log.type}`]}>
                  [{log.timestamp}] [{log.type.toUpperCase()}] {log.text}
                </div>
              ))}
          </div>
        </div>
      )}


    </div>
  );
};

export default Logger;
