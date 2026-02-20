import { createContext, useContext } from 'react';
import type { FrameData } from '../types/types';

export type AppState = {
  compData: any;
  setCompData: (data: any) => void;

  composition: {
    currentCompId: string | null;
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
    matterBodies: any;
    setMatterBodies: (bodies: any) => void;
    simulationStatus: 'idle' | 'preparing' | 'running' | 'completed';
    setSimulationStatus: (status: 'idle' | 'preparing' | 'running' | 'completed') => void;
    bodiesReady: boolean;
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