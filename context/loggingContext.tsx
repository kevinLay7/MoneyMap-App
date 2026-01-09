import React, { createContext, useContext, useEffect, useMemo } from 'react';
import database from '@/model/database';
import Log from '@/model/models/log';
import { configureLogger, clearLogs as clearStoredLogs, logger } from '@/services/logging-service';

interface LoggingContextValue {
  readonly logger: typeof logger;
  readonly clearLogs: () => Promise<void>;
}

const LoggingContext = createContext<LoggingContextValue | undefined>(undefined);

export function LoggingProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    configureLogger(
      async entry => {
        try {
          await database.write(async () => {
            await database.get<Log>('logs').create(log => {
              log.type = entry.type;
              log.level = entry.level;
              log.message = entry.message;
              log.metadata = entry.metadata ?? null;
            });
          });
        } catch {
          // Ignore log persistence errors to avoid breaking app flow.
        }
      },
      async () => {
        await database.write(async () => {
          const logs = await database.get<Log>('logs').query().fetch();
          await database.batch(logs.map(log => log.prepareDestroyPermanently()));
        });
      }
    );

    return () => configureLogger(null);
  }, []);

  const value = useMemo(
    () => ({
      logger,
      clearLogs: clearStoredLogs,
    }),
    []
  );

  return <LoggingContext.Provider value={value}>{children}</LoggingContext.Provider>;
}

export const useLogging = () => {
  const context = useContext(LoggingContext);
  if (!context) {
    throw new Error('useLogging must be used within LoggingProvider');
  }
  return context;
};
