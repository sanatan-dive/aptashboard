import { NextResponse, NextRequest } from 'next/server';

// Rate limiting configuration
const REQUEST_CACHE = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT = Number(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE) || 60;
const RATE_LIMIT_WINDOW = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000;

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
    parsed.push(num);
  }
  
  return { valid: true, parsed };
}

async function callVercelPythonFunction(type: string, data: number[]): Promise<unknown> {
  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
  
  try {
    // First try the new ML API
    const response = await fetch(`${baseUrl}/api/predict-ml`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        data
      }),
    });

    if (response.ok) {
      return await response.json();
    }

    // If that fails, try the old Python function endpoint (for production)
    const fallbackResponse = await fetch(`${baseUrl}/api/predict.py`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        data
      }),
    });

    if (!fallbackResponse.ok) {
      throw new Error(`Python function failed with status ${fallbackResponse.status}`);
    }

    return await fallbackResponse.json();
  } catch (error) {
    console.error('Python function call failed:', error);
    // Fallback calculation
    return {
      fee: 0.001,
      confidence: 0.5,
      model: 'fallback',
      status: 'fallback_used',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitKey = getRateLimitKey(req);
    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const dataParam = searchParams.get('data');

    // Validate prediction type
    if (!type || !['fee', 'fraud'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid prediction type. Must be "fee" or "fraud"' },
        { status: 400 }
      );
    }

    // Validate data parameter
    if (!dataParam) {
      return NextResponse.json(
        { error: 'Missing data parameter' },
        { status: 400 }
      );
    }

    // Parse and validate data
    let parsedData: unknown;
    try {
      parsedData = JSON.parse(dataParam);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in data parameter' },
        { status: 400 }
      );
    }

    const validation = validatePredictionData(parsedData);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid prediction data' },
        { status: 400 }
      );
    }

    // Call Vercel Python function
    const result = await callVercelPythonFunction(type, validation.parsed!);
    
    // Add metadata
    const response = {
      ...result as object,
      timestamp: new Date().toISOString(),
      type,
      inputData: validation.parsed,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Prediction API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        status: 'error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// POST endpoint for more complex prediction requests
export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitKey = getRateLimitKey(req);
    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Validate content type
    const contentType = req.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Basic validation
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Request body must be an object' },
        { status: 400 }
      );
    }

    const { type, data } = body as { type?: string; data?: unknown };

    if (!type || !['fee', 'fraud'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid prediction type. Must be "fee" or "fraud"' },
        { status: 400 }
      );
    }

    const validation = validatePredictionData(data);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid prediction data' },
        { status: 400 }
      );
    }

    // Call Vercel Python function
    const result = await callVercelPythonFunction(type, validation.parsed!);
    
    const response = {
      ...result as object,
      timestamp: new Date().toISOString(),
      type,
      inputData: validation.parsed,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Prediction API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        status: 'error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
