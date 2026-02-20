// -----------------------------
// Gravitae Component: ErrorBoundary
// -----------------------------
// Provides graceful error handling for React component tree failures.
// Catches JavaScript errors anywhere in child component tree and displays fallback UI.

import React from 'react';
import log from '../../../utils/logger';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null; errorInfo: React.ErrorInfo | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  // Updates state to trigger fallback UI when error occurs during rendering
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  // Logs error details for debugging and stores error info for display
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    log.error('Error in app:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h3>Something went wrong</h3>
          <p>Error: {this.state.error?.message}</p>
          <pre>{this.state.error?.stack}</pre>
          <p>Please try refreshing the panel</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;