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
    // Filter out potential sensitive fields just in case (e.g., content)
    const safeContext = { ...context };
    delete safeContext.content;
    payload.context = safeContext;
  }

  if (error) {
    payload.error = {
      name: error.name,
      message: error.message || String(error),
      stack: error.stack,
    };
  }

  // Output as a structured JSON string to stdout/stderr
  if (level === "ERROR") {
    console.error(JSON.stringify(payload));
  } else if (level === "WARN") {
    console.warn(JSON.stringify(payload));
  } else {
    console.log(JSON.stringify(payload));
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
