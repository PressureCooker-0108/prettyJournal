type LogLevel = "INFO" | "WARN" | "ERROR";

interface LogPayload {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: {
    name?: string;
    message: string;
    stack?: string;
  };
}

function writeLog(level: LogLevel, message: string, context?: Record<string, any>, error?: any) {
  const payload: LogPayload = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  if (context) {
    const safeContext = { ...context };
    delete safeContext.content; // Never log sensitive journal content
    payload.context = safeContext;
  }

  if (error) {
    payload.error = {
      name: error.name,
      message: error.message || String(error),
      stack: error.stack,
    };
  }

  const jsonString = JSON.stringify(payload);
  if (level === "ERROR") {
    console.error(jsonString);
  } else if (level === "WARN") {
    console.warn(jsonString);
  } else {
    console.log(jsonString);
  }
}

export const logger = {
  info(message: string, context?: Record<string, any>) {
    writeLog("INFO", message, context);
  },
  warn(message: string, context?: Record<string, any>) {
    writeLog("WARN", message, context);
  },
  error(message: string, error: any, context?: Record<string, any>) {
    writeLog("ERROR", message, context, error);
  },
};
