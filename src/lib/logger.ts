import { NextRequest } from 'next/server';

export interface LogContext {
  [key: string]: string | number | boolean | null | undefined | LogContext | string[];
}

export interface LogEvent {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: LogContext;
  requestId?: string;
  userId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  error?: Error;
}

export interface MetricValue {
  counter?: number;
  histogram?: number[];
  gauge?: number;
}

class Logger {
  private static instance: Logger;
  private logLevel: string;
  private enableRequestLogging: boolean;

  private constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.enableRequestLogging = process.env.ENABLE_REQUEST_LOGGING === 'true';
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private formatLog(event: LogEvent): string {
    const { timestamp, level, message, context, requestId, endpoint, method, statusCode, duration, error } = event;
    
    const logData = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(requestId && { requestId }),
      ...(endpoint && { endpoint }),
      ...(method && { method }),
      ...(statusCode && { statusCode }),
      ...(duration && { duration }),
      ...(context && { context }),
      ...(error && { 
        error: {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      })
    };

    return JSON.stringify(logData);
  }

  private writeLog(event: LogEvent): void {
    const formattedLog = this.formatLog(event);
    
    // In production, send to external logging service
    if (process.env.NODE_ENV === 'production') {
      // Send to Sentry, DataDog, or other logging service
      this.sendToExternalLogger(event);
    }
    
    // Console output for development
    switch (event.level) {
      case 'error':
        console.error(formattedLog);
        break;
      case 'warn':
        console.warn(formattedLog);
        break;
      case 'debug':
        console.debug(formattedLog);
        break;
      default:
        console.log(formattedLog);
    }
  }

  private async sendToExternalLogger(event: LogEvent): Promise<void> {
    try {
      // Example: Send to external logging service
      if (process.env.SENTRY_DSN && event.level === 'error') {
        // Send to Sentry
        // Sentry.captureException(event.error || new Error(event.message));
      }
      
      if (process.env.DATADOG_API_KEY) {
        // Send to DataDog
        // await sendToDataDog(event);
      }
    } catch (error) {
      console.error('Failed to send log to external service:', error);
    }
  }

  public info(message: string, context?: LogContext, requestId?: string): void {
    if (!this.shouldLog('info')) return;
    
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context,
      requestId
    });
  }

  public warn(message: string, context?: LogContext, requestId?: string): void {
    if (!this.shouldLog('warn')) return;
    
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      context,
      requestId
    });
  }

  public error(message: string, error?: Error, context?: LogContext, requestId?: string): void {
    if (!this.shouldLog('error')) return;
    
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      error,
      context,
      requestId
    });
  }

  public debug(message: string, context?: LogContext, requestId?: string): void {
    if (!this.shouldLog('debug')) return;
    
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'debug',
      message,
      context,
      requestId
    });
  }

  public logApiRequest(
    req: NextRequest,
    statusCode: number,
    duration: number,
    requestId: string,
    error?: Error
  ): void {
    if (!this.enableRequestLogging) return;

    const level = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info';
    
    this.writeLog({
      timestamp: new Date().toISOString(),
      level,
      message: `API Request ${req.method} ${req.nextUrl.pathname}`,
      endpoint: req.nextUrl.pathname,
      method: req.method,
      statusCode,
      duration,
      requestId,
      error,
      context: {
        userAgent: req.headers.get('user-agent'),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        params: Object.fromEntries(req.nextUrl.searchParams)
      }
    });
  }
}

// Metrics collection
class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: Map<string, MetricValue> = new Map();

  private constructor() {}

  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  public incrementCounter(name: string, labels?: Record<string, string>): void {
    const key = `${name}_${JSON.stringify(labels || {})}`;
    const current = this.metrics.get(key);
    this.metrics.set(key, { counter: (current?.counter || 0) + 1 });
  }

  public recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const key = `${name}_histogram_${JSON.stringify(labels || {})}`;
    const current = this.metrics.get(key);
    const histogram = current?.histogram || [];
    histogram.push(value);
    this.metrics.set(key, { histogram });
  }

  public getMetrics(): Record<string, MetricValue> {
    return Object.fromEntries(this.metrics);
  }

  public clearMetrics(): void {
    this.metrics.clear();
  }
}

// Request ID generator
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Performance monitoring
export function createPerformanceTimer() {
  const start = performance.now();
  
  return {
    end: () => performance.now() - start
  };
}

export const logger = Logger.getInstance();
export const metrics = MetricsCollector.getInstance();
