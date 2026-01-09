export enum LogLevel {
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
}

export enum LogType {
  Sync = 'sync',
  Plaid = 'plaid',
  Background = 'background',
  Api = 'api',
  Auth = 'auth',
  Database = 'database',
  UI = 'ui',
  General = 'general',
}

export interface LogRecordInput {
  readonly level: LogLevel;
  readonly type: LogType;
  readonly message: string;
  readonly metadata?: string | null;
  readonly timestamp: number;
}
