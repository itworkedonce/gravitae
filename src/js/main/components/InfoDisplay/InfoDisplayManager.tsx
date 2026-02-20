// -----------------------------
// Gravitae Component: InfoDisplayManager
// -----------------------------
// Manager component that handles multiple InfoDisplay instances.
// Provides a context for showing messages from anywhere in the app.

import React, { createContext, useState, useCallback } from 'react';
import InfoDisplay, { InfoDisplayProps } from './InfoDisplay';
import styles from './InfoDisplay.module.scss';

// Define the shape of a message object
type Message = {
  id: number;
  text: string;
  type: 'info' | 'warn' | 'error';
  duration?: number;
};

// Define the shape of the context
type InfoDisplayContextType = {
  showMessage: (text: string, type: 'info' | 'warn' | 'error', duration?: number) => void;
};

// Create the context
export const InfoDisplayContext = createContext<InfoDisplayContextType | undefined>(undefined);

// Provider component
export const InfoDisplayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextId, setNextId] = useState(1);

  // Function to add a new message
  const showMessage = useCallback(
    (text: string, type: 'info' | 'warn' | 'error', duration = 3000) => {
      const id = nextId;
      setNextId(id + 1);

      setMessages((prevMessages) => [
        ...prevMessages,
        { id, text, type, duration },
      ]);
    },
    [nextId]
  );

  // Function to remove a message
  const removeMessage = useCallback((id: number) => {
    setMessages((prevMessages) =>
      prevMessages.filter((message) => message.id !== id)
    );
  }, []);

  return (
    <InfoDisplayContext.Provider value={{ showMessage }}>
      {children}
      <div className={styles['messages-container']}>
        {messages.map((message) => (
          <InfoDisplay
            key={message.id}
            message={message.text}
            type={message.type}
            duration={message.duration}
            onClose={() => removeMessage(message.id)}
          />
        ))}
      </div>
    </InfoDisplayContext.Provider>
  );
};