import { NextResponse, NextRequest } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { validator, apiSchemas } from '@/lib/validation';
import { logger, generateRequestId, createPerformanceTimer, metrics } from '@/lib/logger';
import { 
  handleApiError, 
  ValidationError, 
  PredictionServiceError,
  RateLimitError,
  ErrorRecovery 
} from '@/lib/error-handling';

// Rate limiting configuration
const REQUEST_CACHE = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT = Number(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE) || 60;
const RATE_LIMIT_WINDOW = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000;
const PYTHON_TIMEOUT = Number(process.env.PYTHON_SCRIPT_TIMEOUT) || 30000;

// Model caching
const MODEL_CACHE = new Map<string, { result: unknown; timestamp: number }>();
const CACHE_TTL = Number(process.env.MODEL_CACHE_TTL) || 300000; // 5 minutes

function getRateLimitKey(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  return ip;
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = REQUEST_CACHE.get(key);
  
  if (!record || now - record.lastReset > RATE_LIMIT_WINDOW) {
    REQUEST_CACHE.set(key, { count: 1, lastReset: now });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

function validatePredictionData(data: unknown): { valid: boolean; error?: string; parsed?: number[] } {
  if (!Array.isArray(data)) {
    return { valid: false, error: 'Data must be an array' };
  }
  
  if (data.length !== 3) {
    return { valid: false, error: 'Data must contain exactly 3 numbers' };
  }
  
  const parsed: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const num = parseFloat(data[i]);
    if (isNaN(num) || !isFinite(num)) {
      return { valid: false, error: `Invalid number at position ${i}` };
    }
    // Add reasonable bounds
    if (i === 0 && (num < 0.001 || num > 10)) { // Gas price
      return { valid: false, error: `Gas price at position ${i} out of bounds (0.001-10)` };
    }
    if (i === 1 && (num < 1 || num > 1000000)) { // Transaction volume
      return { valid: false, error: `Transaction volume at position ${i} out of bounds (1-1000000)` };
    }
    if (i === 2 && (num < 0 || num > 1440)) { // Timestamp (minutes in day)
      return { valid: false, error: `Timestamp at position ${i} out of bounds (0-1440)` };
    }
    parsed.push(num);
  }
  
  return { valid: true, parsed };
}

async function runPythonScript(type: string, data: number[]): Promise<unknown> {
  const cacheKey = `${type}_${JSON.stringify(data)}`;
  
  // Check cache first
  if (process.env.ENABLE_MODEL_CACHING === 'true') {
    const cached = MODEL_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      logger.debug('Using cached prediction result', { type, cacheKey });
      return cached.result;
    }
  }

  return new Promise((resolve, reject) => {
    const pythonExecutable = process.env.PYTHON_EXECUTABLE || 'python3';
    const scriptPath = path.join(process.cwd(), 'src', 'scripts', 'ai_models.py');
    
    const args = [
      scriptPath,
      '--type', type,
      '--data', JSON.stringify(data)
    ];
    
    logger.debug('Executing Python script', { pythonExecutable, args });
    
    const pythonProcess = spawn(pythonExecutable, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: PYTHON_TIMEOUT,
      killSignal: 'SIGTERM'
    });
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout.trim());
          
          // Cache the result
          if (process.env.ENABLE_MODEL_CACHING === 'true') {
            MODEL_CACHE.set(cacheKey, { result, timestamp: Date.now() });
          }
          
          resolve(result);
        } catch (parseError) {
          logger.error('Failed to parse Python script output', parseError as Error, { stdout, stderr });
          reject(new PredictionServiceError('Invalid script output format'));
        }
      } else {
        logger.error('Python script execution failed', new Error(stderr), { code, stdout, stderr });
        reject(new PredictionServiceError(`Script execution failed with code ${code}`, stderr));
      }
    });
    
    pythonProcess.on('error', (error) => {
      logger.error('Python process error', error, { pythonExecutable, scriptPath });
      reject(new PredictionServiceError('Failed to execute prediction script', error.message));
    });
    
    pythonProcess.on('timeout', () => {
      logger.error('Python script timeout', new Error('Timeout'), { timeout: PYTHON_TIMEOUT });
      pythonProcess.kill('SIGKILL');
      reject(new PredictionServiceError(`Script execution timed out after ${PYTHON_TIMEOUT}ms`));
    });
  });
}

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const timer = createPerformanceTimer();

  try {
    // Increment API call metrics
    metrics.incrementCounter('api_calls_total', { endpoint: 'predict', method: 'GET' });

    // Rate limiting
    const rateLimitKey = getRateLimitKey(req);
    if (!checkRateLimit(rateLimitKey)) {
      throw new RateLimitError('Rate limit exceeded. Please try again later.');
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const dataParam = searchParams.get('data');

    // Validate prediction type
    if (!type || !['fee', 'fraud'].includes(type)) {
      throw new ValidationError('Invalid prediction type. Must be "fee" or "fraud"');
    }

    // Validate data parameter
    if (!dataParam) {
      throw new ValidationError('Missing data parameter');
    }

    // Parse and validate data
    let parsedData: unknown;
    try {
      parsedData = JSON.parse(dataParam);
    } catch {
      throw new ValidationError('Invalid JSON in data parameter');
    }

    const validation = validatePredictionData(parsedData);
    if (!validation.valid) {
      throw new ValidationError(validation.error || 'Invalid prediction data');
    }

    // Log prediction request
    logger.info('Prediction request initiated', {
      requestId,
      type,
      dataLength: validation.parsed!.length,
      rateLimitKey
    });

    // Run Python script securely with circuit breaker
    try {
      const result = await ErrorRecovery.withCircuitBreaker(
        () => runPythonScript(type, validation.parsed!),
        `prediction_${type}`,
        5, // failure threshold
        60000 // reset timeout
      );
      
      // Validate and sanitize output
      if (typeof result !== 'object' || result === null) {
        throw new PredictionServiceError('Invalid script output format');
      }

      // Add metadata
      const response = {
        ...(result as object),
        timestamp: new Date().toISOString(),
        type,
        inputData: validation.parsed,
        requestId,
        cached: MODEL_CACHE.has(`${type}_${JSON.stringify(validation.parsed)}`)
      };

      metrics.incrementCounter('predictions_completed', { type, status: 'success' });
      const duration = timer.end();
      metrics.recordHistogram('api_request_duration', duration, { endpoint: 'predict', type });

      logger.info('Prediction completed successfully', {
        requestId,
        type,
        duration,
        cached: response.cached
      });

      return NextResponse.json(response);

    } catch (scriptError) {
      metrics.incrementCounter('predictions_completed', { type, status: 'failed' });
      logger.error('Python script execution error', scriptError as Error, { requestId, type });
      
      throw new PredictionServiceError(
        'Prediction service temporarily unavailable',
        process.env.NODE_ENV === 'development' ? 
          (scriptError instanceof Error ? scriptError.message : 'Unknown script error') : 
          undefined
      );
    }

  } catch (error) {
    const duration = timer.end();
    metrics.recordHistogram('api_request_duration', duration, { endpoint: 'predict', status: 'error' });
    metrics.incrementCounter('api_errors_total', { endpoint: 'predict', method: 'GET' });

    return handleApiError(error, requestId, req.nextUrl.pathname);
  }
}

// POST endpoint for more complex prediction requests
export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const timer = createPerformanceTimer();

  try {
    // Increment API call metrics
    metrics.incrementCounter('api_calls_total', { endpoint: 'predict', method: 'POST' });

    // Rate limiting
    const rateLimitKey = getRateLimitKey(req);
    if (!checkRateLimit(rateLimitKey)) {
      throw new RateLimitError('Rate limit exceeded. Please try again later.');
    }

    // Validate content type
    const contentType = req.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new ValidationError('Content-Type must be application/json');
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON in request body');
    }

    // Validate request data
    const validation = validator.validate(body, apiSchemas.prediction);
    if (!validation.isValid) {
      const errors = Object.entries(validation.errors)
        .map(([field, error]) => `${field}: ${error}`)
        .join(', ');
      throw new ValidationError(`Validation failed: ${errors}`);
    }

    const { type, data, options } = validation.sanitizedData!;

    // Log prediction request
    logger.info('Complex prediction request initiated', {
      requestId,
      type,
      hasOptions: !!options,
      rateLimitKey
    });

    try {
      const result = await ErrorRecovery.withCircuitBreaker(
        () => runPythonScript(type as string, data as number[]),
        `prediction_${type}`,
        5,
        60000
      );
      
      const response = {
        ...(result as object),
        timestamp: new Date().toISOString(),
        type,
        inputData: data,
        options,
        requestId,
        cached: MODEL_CACHE.has(`${type}_${JSON.stringify(data)}`)
      };

      metrics.incrementCounter('predictions_completed', { type: type as string, status: 'success' });
      const duration = timer.end();
      metrics.recordHistogram('api_request_duration', duration, { endpoint: 'predict', type: 'POST' });

      logger.info('Complex prediction completed successfully', {
        requestId,
        type,
        duration,
        cached: response.cached
      });

      return NextResponse.json(response);

    } catch (scriptError) {
      metrics.incrementCounter('predictions_completed', { type: type as string, status: 'failed' });
      logger.error('Python script execution error', scriptError as Error, { requestId, type });
      
      throw new PredictionServiceError(
        'Prediction service temporarily unavailable',
        process.env.NODE_ENV === 'development' ? 
          (scriptError instanceof Error ? scriptError.message : 'Unknown script error') : 
          undefined
      );
    }

  } catch (error) {
    const duration = timer.end();
    metrics.recordHistogram('api_request_duration', duration, { endpoint: 'predict', status: 'error' });
    metrics.incrementCounter('api_errors_total', { endpoint: 'predict', method: 'POST' });

    return handleApiError(error, requestId, req.nextUrl.pathname);
  }
}
