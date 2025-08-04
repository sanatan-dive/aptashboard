import { NextResponse } from 'next/server';
import { logger } from './logger';

export interface ApiError {
  code: string;
  message: string;
  details?: string;
  statusCode: number;
  timestamp: string;
  requestId?: string;
  path?: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Predefined error types
export class ValidationError extends AppError {
  constructor(message: string, details?: string) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR', true);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR', true);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND', true);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', true);
  }
}

export class BlockchainError extends AppError {
  constructor(message: string, details?: string) {
    super(message, 502, 'BLOCKCHAIN_ERROR', true, details);
  }
}

export class PredictionServiceError extends AppError {
  constructor(message: string, details?: string) {
    super(message, 503, 'PREDICTION_SERVICE_ERROR', true, details);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: string) {
    super(message, 500, 'DATABASE_ERROR', true, details);
  }
}

// Error handler function
export function handleApiError(
  error: unknown,
  requestId?: string,
  path?: string
): NextResponse {
  let apiError: ApiError;
  
  if (error instanceof AppError) {
    apiError = {
      code: error.code,
      message: error.message,
      details: error.details,
      statusCode: error.statusCode,
      timestamp: new Date().toISOString(),
      requestId,
      path
    };
    
    // Log operational errors at appropriate level
    if (error.statusCode >= 500) {
      logger.error(`API Error: ${error.message}`, error, { requestId, path });
    } else {
      logger.warn(`API Warning: ${error.message}`, { requestId, path, code: error.code });
    }
  } else if (error instanceof Error) {
    // Handle unexpected errors
    apiError = {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : error.message,
      statusCode: 500,
      timestamp: new Date().toISOString(),
      requestId,
      path,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
    
    logger.error(`Unexpected API Error: ${error.message}`, error, { requestId, path });
  } else {
    // Handle unknown error types
    apiError = {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      statusCode: 500,
      timestamp: new Date().toISOString(),
      requestId,
      path
    };
    
    logger.error('Unknown API Error', new Error(String(error)), { requestId, path });
  }

  // Remove sensitive information in production
  if (process.env.NODE_ENV === 'production') {
    delete apiError.details;
  }

  return NextResponse.json(
    { error: apiError },
    { 
      status: apiError.statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId || 'unknown'
      }
    }
  );
}

// Async error wrapper for API handlers
export function withErrorHandling<T extends unknown[], R>(
  handler: (...args: T) => Promise<R>,
  context?: { path?: string; requestId?: string }
) {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error, context?.requestId, context?.path);
    }
  };
}

// Error recovery strategies
export class ErrorRecovery {
  private static retryAttempts = new Map<string, number>();
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000; // 1 second

  public static async withRetry<T>(
    operation: () => Promise<T>,
    operationId: string,
    maxRetries: number = this.MAX_RETRIES
  ): Promise<T> {
    const attempts = this.retryAttempts.get(operationId) || 0;
    
    try {
      const result = await operation();
      // Reset retry count on success
      this.retryAttempts.delete(operationId);
      return result;
    } catch (error) {
      if (attempts < maxRetries && this.isRetryableError(error)) {
        this.retryAttempts.set(operationId, attempts + 1);
        
        // Exponential backoff
        const delay = this.RETRY_DELAY * Math.pow(2, attempts);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        logger.warn(`Retrying operation ${operationId}, attempt ${attempts + 1}/${maxRetries}`, {
          error: error instanceof Error ? error.message : String(error),
          delay
        });
        
        return this.withRetry(operation, operationId, maxRetries);
      }
      
      // Max retries exceeded or non-retryable error
      this.retryAttempts.delete(operationId);
      throw error;
    }
  }

  private static isRetryableError(error: unknown): boolean {
    if (error instanceof AppError) {
      // Retry on server errors but not client errors
      return error.statusCode >= 500;
    }
    
    if (error instanceof Error) {
      // Retry on network errors, timeouts, etc.
      const retryableMessages = [
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND',
        'ECONNREFUSED',
        'timeout',
        'network'
      ];
      
      return retryableMessages.some(msg => 
        error.message.toLowerCase().includes(msg.toLowerCase())
      );
    }
    
    return false;
  }

  public static async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    timeoutMessage: string = 'Operation timed out'
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });

    return Promise.race([operation(), timeoutPromise]);
  }

  public static async withCircuitBreaker<T>(
    operation: () => Promise<T>,
    serviceId: string,
    failureThreshold: number = 5,
    resetTimeoutMs: number = 60000
  ): Promise<T> {
    // Simple circuit breaker implementation
    // In production, use a proper circuit breaker library
    const failures = this.retryAttempts.get(`circuit_${serviceId}`) || 0;
    
    if (failures >= failureThreshold) {
      const lastFailure = this.retryAttempts.get(`circuit_last_${serviceId}`) || 0;
      if (Date.now() - lastFailure < resetTimeoutMs) {
        throw new AppError(
          `Service ${serviceId} is currently unavailable`,
          503,
          'SERVICE_UNAVAILABLE'
        );
      }
      // Reset circuit breaker
      this.retryAttempts.delete(`circuit_${serviceId}`);
    }

    try {
      const result = await operation();
      // Reset failure count on success
      this.retryAttempts.delete(`circuit_${serviceId}`);
      return result;
    } catch (error) {
      // Increment failure count
      this.retryAttempts.set(`circuit_${serviceId}`, failures + 1);
      this.retryAttempts.set(`circuit_last_${serviceId}`, Date.now());
      throw error;
    }
  }
}

// Health check utilities
export interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  latency?: number;
  error?: string;
  timestamp: string;
}

export async function performHealthCheck(
  serviceName: string,
  healthCheckFn: () => Promise<boolean>
): Promise<HealthCheck> {
  const start = performance.now();
  const timestamp = new Date().toISOString();

  try {
    const isHealthy = await ErrorRecovery.withTimeout(
      healthCheckFn,
      5000,
      'Health check timed out'
    );
    
    const latency = performance.now() - start;
    
    return {
      service: serviceName,
      status: isHealthy ? 'healthy' : 'unhealthy',
      latency,
      timestamp
    };
  } catch (error) {
    const latency = performance.now() - start;
    
    return {
      service: serviceName,
      status: 'unhealthy',
      latency,
      error: error instanceof Error ? error.message : String(error),
      timestamp
    };
  }
}
