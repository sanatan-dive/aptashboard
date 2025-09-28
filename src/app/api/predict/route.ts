import { NextResponse, NextRequest } from 'next/server';
import { realMLServices } from '@/lib/real-ml-services';

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
  try {
    // Use real ML services directly - no more fallbacks
    console.log('Using real ML services for prediction');
    
    if (type === 'fee') {
      const [amount = 100, , priority = 0.5] = data;
      
      // Map priority from 0-1 to low/normal/high
      const priorityStr = priority > 0.7 ? 'high' : priority < 0.3 ? 'low' : 'normal';
      
      const result = await realMLServices.predictRealFee(amount, 'APT', priorityStr);
      
      return {
        fee: result.predicted_fee,
        confidence: result.confidence,
        model: result.model,
        status: result.status,
        factors: result.factors,
        data_sources: result.data_sources
      };
      
    } else if (type === 'fraud') {
      const [amount = 0] = data;
      
      // Generate dummy addresses for API compatibility
      const sender = `0x${'1'.repeat(64)}`;
      const recipient = `0x${'2'.repeat(64)}`;
      
      const result = await realMLServices.detectRealFraud(
        sender, 
        recipient, 
        amount, 
        Date.now() / 1000
      );
      
      return {
        risk_score: result.risk_score,
        is_suspicious: result.is_suspicious,
        is_high_risk: result.is_high_risk,
        confidence: result.confidence,
        model: result.model,
        status: result.status,
        analysis: result.analysis,
        data_sources: result.data_sources
      };
    }
    
    throw new Error(`Unsupported prediction type: ${type}`);
    
  } catch (error) {
    console.error('Real ML service failed:', error);
    throw new Error(`ML prediction failed: ${error}`);
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
