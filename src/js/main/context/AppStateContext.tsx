import { createContext, useContext } from 'react';
import type { FrameData, ProjectCompositions } from '../types/types';
import type { Body } from 'matter-js';

export type AppState = {
  compData: ProjectCompositions;
  setCompData: (data: ProjectCompositions | ((prev: ProjectCompositions) => ProjectCompositions)) => void;

  composition: {
    currentCompId: number | null;
    isCompSwitching: boolean;
    compSize: [number, number];
  };
  timing: {
    compFramerate: number;
    compDuration: number;
    workarea: [number, number];
    currentTime: number;
    setCurrentTime: (time: number) => void;
    updateTimingInfo: () => Promise<void>;
  };
  simulation: {
    frameData: FrameData[];
    setFrameData: (data: FrameData[]) => void;
  };
  physics: {
    matterBodies: Record<number, Body>;
    setMatterBodies: (bodies: Record<number, Body>) => void;
    simulationStatus: 'idle' | 'preparing' | 'running' | 'completed';
    setSimulationStatus: (status: 'idle' | 'preparing' | 'running' | 'completed') => void;
    bodiesReady: boolean;
    setBodiesReady: (ready: boolean) => void;
  };
  buttons: {
    isProcessing: boolean;
    setIsProcessing: (processing: boolean) => void;
  };
};

export const AppStateContext = createContext<AppState | undefined>(undefined);

export const useAppState = () => {
  const ctx = useContext(AppStateContext);
  if (!ctx)
    throw new Error('useAppState must be used within AppStateContext.Provider');
  return ctx;
};