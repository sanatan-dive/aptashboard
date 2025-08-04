import { NextResponse } from 'next/server';

// Standard error codes
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
  metadata?: {
    timestamp: string;
    requestId?: string;
    version?: string;
  };
}

// Success response helper
export function createSuccessResponse<T>(
  data: T,
  status: number = 200,
  metadata?: Record<string, unknown>
): NextResponse {
  const response: ApiResponse<T> = {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      version: process.env.API_VERSION || 'v1',
      ...metadata,
    },
  };

  return NextResponse.json(response, { status });
}

// Error response helper
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  status: number = 400,
  details?: unknown
): NextResponse {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      details,
    },
    metadata: {
      timestamp: new Date().toISOString(),
      version: process.env.API_VERSION || 'v1',
    },
  };

  return NextResponse.json(response, { status });
}

// Validation error helper
export function createValidationError(
  message: string,
  details?: unknown
): NextResponse {
  return createErrorResponse(
    ERROR_CODES.VALIDATION_ERROR,
    message,
    400,
    details
  );
}

// Internal error helper
export function createInternalError(
  message: string = 'Internal server error',
  details?: unknown
): NextResponse {
  // In production, don't expose internal details
  const exposedDetails = process.env.NODE_ENV === 'development' ? details : undefined;
  
  return createErrorResponse(
    ERROR_CODES.INTERNAL_ERROR,
    message,
    500,
    exposedDetails
  );
}

// Rate limit error helper
export function createRateLimitError(
  resetTime?: number
): NextResponse {
  const response = createErrorResponse(
    ERROR_CODES.RATE_LIMIT_EXCEEDED,
    'Too many requests. Please try again later.',
    429
  );

  if (resetTime) {
    response.headers.set('Retry-After', Math.ceil((resetTime - Date.now()) / 1000).toString());
  }

  return response;
}

// Transaction error helper
export function createTransactionError(
  message: string,
  details?: unknown
): NextResponse {
  return createErrorResponse(
    ERROR_CODES.TRANSACTION_FAILED,
    message,
    400,
    details
  );
}

// Input validation helpers
export function validateRequired(
  obj: Record<string, unknown>,
  requiredFields: string[]
): { valid: boolean; missing: string[] } {
  const missing = requiredFields.filter(field => 
    obj[field] === undefined || obj[field] === null || obj[field] === ''
  );
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

export function validateAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(address);
}

export function validateAmount(amount: unknown): { valid: boolean; parsed?: number; error?: string } {
  if (typeof amount === 'string') {
    const parsed = parseFloat(amount);
    if (isNaN(parsed)) {
      return { valid: false, error: 'Amount must be a valid number' };
    }
    amount = parsed;
  }
  
  if (typeof amount !== 'number') {
    return { valid: false, error: 'Amount must be a number' };
  }
  
  if (!isFinite(amount)) {
    return { valid: false, error: 'Amount must be finite' };
  }
  
  if (amount <= 0) {
    return { valid: false, error: 'Amount must be positive' };
  }
  
  if (amount > 1000000) {
    return { valid: false, error: 'Amount exceeds maximum limit' };
  }
  
  return { valid: true, parsed: amount };
}

export function validateInterestRate(rate: unknown): { valid: boolean; parsed?: number; error?: string } {
  if (typeof rate === 'string') {
    const parsed = parseFloat(rate);
    if (isNaN(parsed)) {
      return { valid: false, error: 'Interest rate must be a valid number' };
    }
    rate = parsed;
  }
  
  if (typeof rate !== 'number') {
    return { valid: false, error: 'Interest rate must be a number' };
  }
  
  if (!isFinite(rate)) {
    return { valid: false, error: 'Interest rate must be finite' };
  }
  
  if (rate < 0.1 || rate > 50) {
    return { valid: false, error: 'Interest rate must be between 0.1% and 50%' };
  }
  
  return { valid: true, parsed: rate };
}

// Sanitization helpers
export function sanitizeAmount(amount: number): number {
  return Math.floor(amount * 1_000_000) / 1_000_000; // 6 decimal precision
}

export function sanitizeString(str: string, maxLength: number = 1000): string {
  return str.slice(0, maxLength).trim();
}

// Logging helper
export function logApiCall(
  method: string,
  path: string,
  status: number,
  duration?: number,
  error?: Error
): void {
  const logData = {
    timestamp: new Date().toISOString(),
    method,
    path,
    status,
    duration,
    error: error ? {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    } : undefined,
  };
  
  if (status >= 500) {
    console.error('API Error:', JSON.stringify(logData));
  } else if (status >= 400) {
    console.warn('API Warning:', JSON.stringify(logData));
  } else {
    console.info('API Call:', JSON.stringify(logData));
  }
}

// Request timing decorator
export function withTiming<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  label: string
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const start = Date.now();
    try {
      const result = await fn(...args);
      const duration = Date.now() - start;
      console.log(`${label} completed in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error(`${label} failed after ${duration}ms:`, error);
      throw error;
    }
  };
}
