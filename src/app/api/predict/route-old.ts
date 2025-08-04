import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

// Rate limiting configuration
const REQUEST_CACHE = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT = 10; // Max requests per minute per IP
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

function getRateLimitKey(req: Request): string {
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
    if (num < 0 || num > 1000000) {
      return { valid: false, error: `Number at position ${i} out of reasonable bounds` };
    }
    parsed.push(num);
  }
  
  return { valid: true, parsed };
}

async function runPythonScript(type: string, data: number[]): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'src', 'scripts', 'ai_models.py');
    
    // Use spawn instead of execSync for better security
    const pythonProcess = spawn('python3', [
      scriptPath,
      '--type', type,
      '--data', JSON.stringify(data)
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000, // 30 second timeout
      env: { ...process.env, PYTHONPATH: process.cwd() }
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
      if (code !== 0) {
        reject(new Error(`Python script failed with code ${code}: ${stderr}`));
        return;
      }

      try {
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch (parseError) {
        reject(new Error(`Failed to parse Python script output: ${parseError}`));
      }
    });

    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python script: ${error.message}`));
    });

    // Kill process if it times out
    setTimeout(() => {
      if (!pythonProcess.killed) {
        pythonProcess.kill('SIGTERM');
        reject(new Error('Python script execution timeout'));
      }
    }, 30000);
  });
}

export async function GET(req: Request) {
  try {
    // Rate limiting
    const rateLimitKey = getRateLimitKey(req);
    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded. Please try again later.' 
      }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const dataParam = searchParams.get('data');

    // Validate prediction type
    if (!type || !['fee', 'fraud'].includes(type)) {
      return NextResponse.json({ 
        error: 'Invalid prediction type. Must be "fee" or "fraud"' 
      }, { status: 400 });
    }

    // Validate data parameter
    if (!dataParam) {
      return NextResponse.json({ 
        error: 'Missing data parameter' 
      }, { status: 400 });
    }

    // Parse and validate data
    let parsedData: unknown;
    try {
      parsedData = JSON.parse(dataParam);
    } catch {
      return NextResponse.json({ 
        error: 'Invalid JSON in data parameter' 
      }, { status: 400 });
    }

    const validation = validatePredictionData(parsedData);
    if (!validation.valid) {
      return NextResponse.json({ 
        error: validation.error 
      }, { status: 400 });
    }

    // Run Python script securely
    try {
      const result = await runPythonScript(type, validation.parsed!);
      
      // Validate and sanitize output
      if (typeof result !== 'object' || result === null) {
        throw new Error('Invalid script output format');
      }

      // Add metadata
      const response = {
        ...(result as object),
        timestamp: new Date().toISOString(),
        type,
        inputData: validation.parsed
      };

      return NextResponse.json(response);

    } catch (scriptError) {
      console.error('Python script execution error:', scriptError);
      return NextResponse.json({ 
        error: 'Prediction service temporarily unavailable',
        message: process.env.NODE_ENV === 'development' ? 
          (scriptError instanceof Error ? scriptError.message : 'Unknown script error') : 
          undefined
      }, { status: 503 });
    }

  } catch (error) {
    console.error('Prediction API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST endpoint for more complex prediction requests
export async function POST(req: Request) {
  try {
    // Rate limiting
    const rateLimitKey = getRateLimitKey(req);
    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded. Please try again later.' 
      }, { status: 429 });
    }

    const body = await req.json();
    const { type, data, options } = body;

    // Validate prediction type
    if (!type || !['fee', 'fraud'].includes(type)) {
      return NextResponse.json({ 
        error: 'Invalid prediction type. Must be "fee" or "fraud"' 
      }, { status: 400 });
    }

    // Validate data
    const validation = validatePredictionData(data);
    if (!validation.valid) {
      return NextResponse.json({ 
        error: validation.error 
      }, { status: 400 });
    }

    // Validate options (if provided)
    if (options && typeof options !== 'object') {
      return NextResponse.json({ 
        error: 'Options must be an object' 
      }, { status: 400 });
    }

    try {
      const result = await runPythonScript(type, validation.parsed!);
      
      const response = {
        ...(result as object),
        timestamp: new Date().toISOString(),
        type,
        inputData: validation.parsed,
        options
      };

      return NextResponse.json(response);

    } catch (scriptError) {
      console.error('Python script execution error:', scriptError);
      return NextResponse.json({ 
        error: 'Prediction service temporarily unavailable',
        message: process.env.NODE_ENV === 'development' ? 
          (scriptError instanceof Error ? scriptError.message : 'Unknown script error') : 
          undefined
      }, { status: 503 });
    }

  } catch (error) {
    console.error('Prediction POST API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}