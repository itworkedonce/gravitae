import log from 'loglevel';

// Create a function to get the logger context
// We need to do this because we can't use hooks outside of React components
let loggerContext: any = null;
export const setLoggerContext = (context: any) => {
  loggerContext = context;
};

// Patch loglevel to write to both console and Logger component
const originalFactory = log.methodFactory;
log.methodFactory = function (methodName, logLevel, loggerName) {
  const rawMethod = originalFactory(methodName, logLevel, loggerName);
  return function (...messages) {
    // Process messages to properly stringify objects
    const processedMessages = messages.map(msg => {
      if (typeof msg === 'object' && msg !== null) {
        try {
          return JSON.stringify(msg, null, 2);
        } catch (e) {
          return '[Unstringifiable Object]';
        }
      }
      return msg;
    });
    
    const message = processedMessages.join(' ');

    // Send to Logger component if context is available
    if (loggerContext?.addLog) {
      loggerContext.addLog(message, methodName);
    }

    // Always log to console
    rawMethod(...processedMessages);
  };
};

// Set log level
log.setLevel('debug');

export default log;
