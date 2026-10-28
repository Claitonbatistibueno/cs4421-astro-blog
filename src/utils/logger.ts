// Structured JSON logging: one JSON object per line on stdout/stderr.
// Amazon CloudWatch Logs collects the container output and can filter on the
// keys, e.g. `{ $.statusCode >= 500 }` (Week 5 and Week 7).

export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface RequestLog {
  route: string;
  method: string;
  statusCode: number;
  latencyMs: number;
}

export function buildLog(level: LogLevel, fields: Record<string, unknown>): string {
  return JSON.stringify({ timestamp: new Date().toISOString(), level, ...fields });
}

/** Logs one HTTP request. 5xx responses go to stderr with level ERROR. */
export function logRequest(entry: RequestLog): void {
  if (entry.statusCode >= 500) {
    console.error(buildLog('ERROR', { ...entry }));
  } else if (entry.statusCode >= 400) {
    console.log(buildLog('WARN', { ...entry }));
  } else {
    console.log(buildLog('INFO', { ...entry }));
  }
}
