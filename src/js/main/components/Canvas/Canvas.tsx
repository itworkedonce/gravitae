// -----------------------------
// Gravitae Component: Canvas
// -----------------------------
// Main canvas component for displaying physics simulation.
// Uses single engine and runner for both preview and simulation.

import { useRef } from 'react';
import { usePreviewRenderer } from '../../hooks/usePreviewRenderer';
import Timer from '../Timer/Timer';
import styles from './Canvas.module.scss';
import { useAppState } from '../../context/AppStateContext';

const CanvasContainer = () => {
  const {
    physics: {
      matterBodies,
      simulationStatus,
      setSimulationStatus,
    },
    composition: { compSize },
    timing: { workarea, compFramerate },
    buttons: { setIsProcessing }
  } = useAppState();

  // Fallback to default size if compSize is undefined, invalid, or [0,0]
  const showDefaultCanvas = !Array.isArray(compSize) || compSize.length !== 2 ||
    typeof compSize[0] !== 'number' || typeof compSize[1] !== 'number' ||
    compSize[0] === 0 || compSize[1] === 0;
  const safeCompSize: [number, number] = showDefaultCanvas ? [1920, 1080] : [compSize[0], compSize[1]];

  const containerRef = useRef<HTMLDivElement>(null as any);
  const hasBodies = Object.keys(matterBodies).length > 0;

  // Initialize preview renderer with engine, runner, and renderer
  const { engineRef } = usePreviewRenderer({
    matterBodies,
    simulationStatus,
    workarea,
    setSimulationStatus,
    compFramerate,
    containerRef,
    compSize: safeCompSize,
    setIsProcessing
  });

  return (
    <div className={styles['app-canvas']} style={{ position: 'relative' }}>
      <div
        ref={containerRef}
        className={styles['canvas-container']}
        style={{
          aspectRatio: `${safeCompSize[0]} / ${safeCompSize[1]}`,
          width: showDefaultCanvas ? '100%' : '100%',
          maxWidth: showDefaultCanvas ? '640px' : undefined,
          height: showDefaultCanvas ? 'auto' : '100%',
          margin: showDefaultCanvas ? 'auto' : undefined,
          display: showDefaultCanvas ? 'flex' : undefined,
          alignItems: showDefaultCanvas ? 'center' : undefined,
          justifyContent: showDefaultCanvas ? 'center' : undefined
        }}
      >
        {!hasBodies && (
          <div className={styles['empty-state-overlay']}>
            <span>{showDefaultCanvas ? 'No composition selected' : 'No elements yet'}</span>
          </div>
        )}
      </div>
      <Timer />
    </div>
  );
};

export default CanvasContainer;