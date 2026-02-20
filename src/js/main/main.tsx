// -----------------------------
// Gravitae Component: Main Application Entry
// -----------------------------
// Root component that orchestrates the entire Gravitae application state and UI.
// Manages physics simulation, composition timing, and layer data through context providers.
// Uses a two-layer architecture: MainStateProvider manages state, MainContent renders UI.

import { useState, useEffect } from 'react';
import type { ProjectCompositions, FrameData } from './types/types';

import {
  useThemeSync,
  useLayerPhysics,
  useCompTiming,
  useCompSwitching,
  useButtonHandlers,
} from './hooks';
import {
  ButtonContainer,
  CanvasContainer,
  DataDisplay,
  Logger,
  SimulationButtonContainer
} from './components';
import { AppStateContext, LoggerProvider, useLogger } from './context';
import log, { setLoggerContext } from '../utils/logger';
import { useCentroidService } from "./services/centroidService";
import './main.scss';
// -----------------------------
// Main Content Component
// -----------------------------
// Inner component that renders the UI and initializes core application hooks.
// Separated from state management to maintain clean architecture boundaries.
const MainContent = () => {
  const logger = useLogger();

  // Initialize logger context for global logging access
  useEffect(() => {
    setLoggerContext(logger);
  }, [logger]);

  // Initialize core application functionality
  useThemeSync();
  useButtonHandlers();

  return (
    <div className="app">
      <div className="app-container">
        <ButtonContainer />
        <CanvasContainer />
        <SimulationButtonContainer />
        < DataDisplay />
        <Logger />
      </div>
    </div>
  );
};

// -----------------------------
// Main State Provider Component
// -----------------------------
// Outer wrapper that manages all application state and provides context to child components.
// Orchestrates timing, physics, composition, and simulation state through custom hooks.
const MainStateProvider = () => {
  try {
    // -----------------------------
    // Composition Timing State
    // -----------------------------
    // Manages framerate, duration, workarea, and current time from After Effects
    const { compFramerate, compDuration, workarea, currentTime, setCurrentTime, updateTimingInfo } =
      useCompTiming();

    // -----------------------------
    // Simulation State
    // -----------------------------
    // Tracks simulation lifecycle and recorded frame data
    const [simulationStatus, setSimulationStatus] = useState<'idle' | 'preparing' | 'running' | 'completed'>('idle');
    const [frameData, setFrameData] = useState<FrameData[]>([]);
    const [bodiesReady, setBodiesReady] = useState(false);

    // -----------------------------
    // Button Processing State
    // -----------------------------
    // Manages button processing state for UI feedback
    const [isProcessing, setIsProcessing] = useState(false);

    // Composition data state managed at component level to avoid circular dependencies
    const [compData, setCompData] = useState<ProjectCompositions>({});

    // -----------------------------
    // Composition and Physics State
    // -----------------------------
    // Manages composition switching and physics body creation from After Effects layers
    const { currentCompId, isCompSwitching } = useCompSwitching(
      compData,
      setCompData,
      setSimulationStatus,
      updateTimingInfo // Correctly pass updateTimingInfo as the fourth parameter
    );

    const { matterBodies, setMatterBodies, compSize } =
      useLayerPhysics({
        currentCompId,
        simulationStatus,
        bodiesReady,
        setBodiesReady,
        compData,
        setCompData,
      });

    // Initialize centroid calculations for physics bodies
    useCentroidService({
      compData,
      bodiesReady,
      simulationStatus,
    });

    // -----------------------------
    // Application State Structure
    // -----------------------------
    // Organizes state into logical domains for clean separation of concerns
    const appState = {
      compData,
      setCompData,
      composition: {
        currentCompId,
        isCompSwitching,
        compSize,
      },
      timing: {
        compFramerate,
        compDuration,
        workarea,
        currentTime,
        setCurrentTime,
        updateTimingInfo,
      },
      simulation: {
        frameData,
        setFrameData,
      },
      physics: {
        matterBodies,
        setMatterBodies,
        simulationStatus,
        setSimulationStatus,
        bodiesReady,
        setBodiesReady,
      },
      buttons: {
        isProcessing,
        setIsProcessing,
      },
    };

    return (
      <AppStateContext.Provider value={appState}>
        <LoggerProvider>
          <MainContent />
        </LoggerProvider>
      </AppStateContext.Provider>
    );
  } catch (error) {
    log.error('Error in MainStateProvider:', error);
    return <div>Error initializing application state</div>;
  }
};

export default MainStateProvider;
