import { LogLevel, LogRecordInput, LogType } from '@/types/logging';

type LogWriter = (entry: LogRecordInput) => Promise<void>;
type LogClearer = () => Promise<void>;

let logWriter: LogWriter | null = null;
let logClearer: LogClearer | null = null;
const pendingLogs: LogRecordInput[] = [];
const MAX_PENDING_LOGS = 100;

const normalizeMetadata = (metadata: unknown): string | null => {
  if (metadata === undefined || metadata === null) {
    return null;
  }

  if (metadata instanceof Error) {
    return JSON.stringify({
      name: metadata.name,
      message: metadata.message,
      stack: metadata.stack,
    });
  }

  if (typeof metadata === 'string') {
    return metadata;
  }

  try {
    return JSON.stringify(metadata, (_key, value) => {
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack,
        };
      }
      return value;
    });
  } catch {
    return String(metadata);
  }
};

const enqueueLog = (entry: LogRecordInput) => {
  if (pendingLogs.length >= MAX_PENDING_LOGS) {
    pendingLogs.shift();
  }
  pendingLogs.push(entry);
};

const flushPendingLogs = () => {
  if (!logWriter || pendingLogs.length === 0) {
    return;
  }

  const queued = [...pendingLogs];
  pendingLogs.length = 0;
  queued.forEach(entry => {
    void logWriter(entry);
  });
};

const emitLog = (entry: LogRecordInput) => {
  if (!logWriter) {
    enqueueLog(entry);
    return;
  }

  void logWriter(entry);
};

export const configureLogger = (writer: LogWriter | null, clearer?: LogClearer | null) => {
  logWriter = writer;
  logClearer = clearer ?? null;
  flushPendingLogs();
};

const recordLog = (level: LogLevel, type: LogType, message: string, metadata?: unknown) => {
  const entry: LogRecordInput = {
    level,
    type,
    message,
    metadata: normalizeMetadata(metadata),
    timestamp: Date.now(),
  };

  // Log to console as well
  const consoleMessage = `[${type}] ${message}`;
  switch (level) {
    case LogLevel.Info:
      console.log(consoleMessage, metadata ?? '');
      break;
    case LogLevel.Warn:
      console.warn(consoleMessage, metadata ?? '');
      break;
    case LogLevel.Error:
      console.error(consoleMessage, metadata ?? '');
      break;
  }

  emitLog(entry);
};

export const logger = {
  info: (type: LogType, message: string, metadata?: unknown) => {
    recordLog(LogLevel.Info, type, message, metadata);
  },
  warn: (type: LogType, message: string, metadata?: unknown) => {
    recordLog(LogLevel.Warn, type, message, metadata);
  },
  error: (type: LogType, message: string, metadata?: unknown) => {
    recordLog(LogLevel.Error, type, message, metadata);
  },
};

export const clearLogs = async () => {
  if (!logClearer) {
    return;
  }

  await logClearer();
};
