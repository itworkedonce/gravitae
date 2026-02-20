// -----------------------------
// Gravitae Context: LoggerContext
// -----------------------------
// Context provider for managing log messages throughout the application.
// Provides a centralized way to display logs in the Logger component.

import React, { createContext, useState, useContext, useCallback } from 'react';

type LogMessage = {
  id: number;
  text: string;
  type: 'info' | 'warn' | 'error' | 'debug';
  timestamp: string;
  timestampMs: number;
};

type LoggerContextType = {
  logs: LogMessage[];
  addLog: (text: string, type: 'info' | 'warn' | 'error' | 'debug') => void;
  clearLogs: () => void;
};

const LoggerContext = createContext<LoggerContextType | null>(null);

export const LoggerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [nextId, setNextId] = useState(1);

  const addLog = useCallback((text: string, type: 'info' | 'warn' | 'error' | 'debug') => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timestamp = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const timestampMs = now.getTime();

    setNextId((prevId) => {
      const id = prevId;
      setLogs((prevLogs) => [
        ...prevLogs,
        { id, text, type, timestamp, timestampMs },
      ]);
      return prevId + 1;
    });
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return (
    <LoggerContext.Provider value={{ logs, addLog, clearLogs }}>
      {children}
    </LoggerContext.Provider>
  );
};

export const useLogger = () => {
  const context = useContext(LoggerContext);
  if (!context) {
    throw new Error('useLogger must be used within LoggerProvider');
  }
  return context;
};
