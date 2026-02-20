// -----------------------------
// Gravitae Hook: useInfoDisplay
// -----------------------------
// Custom hook for accessing the InfoDisplay context.
// Provides access to the showMessage function for displaying notifications.

import { useContext } from 'react';
import { InfoDisplayContext } from '../components/InfoDisplay/InfoDisplayManager';

export const useInfoDisplay = () => {
  const context = useContext(InfoDisplayContext);
  if (!context) {
    throw new Error('useInfoDisplay must be used within an InfoDisplayProvider');
  }
  return context;
};