// -----------------------------
// Gravitae Component: Application Bootstrap
// -----------------------------
// Entry point that initializes the React application with error boundaries and providers.
// Handles Bolt initialization and establishes the root component hierarchy.

import React from 'react';
import ReactDOM from 'react-dom/client';
import { initBolt } from '../lib/utils/bolt';
import MainStateProvider from './main';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import { InfoDisplayProvider } from './components';
import './index.scss';
import log from '../utils/logger';

// Initialize Bolt before React mounting to ensure CEP communication is ready
initBolt();
log.info('Gravitae initialized');
// Establishes provider hierarchy with error boundary as outermost layer for crash protection
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <ErrorBoundary>
    <InfoDisplayProvider>
      <MainStateProvider />
    </InfoDisplayProvider>
  </ErrorBoundary>
);
