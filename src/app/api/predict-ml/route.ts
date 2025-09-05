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

interface PredictionResult {
  error?: string;
  status: string;
  [key: string]: unknown;
}

async function getMLPrediction(type: string, data: unknown[]): Promise<PredictionResult> {
  try {
    console.log(`Using real ML prediction for type: ${type}`, { data });
    
    if (type === 'fee') {
      // Handle different parameter formats for fee prediction
      // Expected: [amount, token?, priority?] or [amount, networkLoad, priority] (legacy)
      const [param1 = 100, param2 = 'APT', param3 = 'normal'] = data;
      
      let amount: number;
      let token: string;
      let priority: string;
      
      // Check if this is legacy format (all numbers) or new format
      if (typeof param2 === 'number' && typeof param3 === 'number') {
        // Legacy format: [amount, networkLoad, priorityLevel]
        amount = Number(param1);
        token = 'APT'; // Default token
        priority = Number(param3) > 0.7 ? 'high' : Number(param3) < 0.3 ? 'low' : 'normal';
      } else {
        // New format: [amount, token, priority]
        amount = Number(param1);
        token = String(param2);
        priority = String(param3);
      }
      
      const result = await realMLServices.predictRealFee(amount, token, priority);
      
      return {
        ...result,
        status: 'success'
      };
      
    } else if (type === 'fraud') {
      // Handle different parameter formats for fraud detection
      // Expected: [sender, recipient, amount, timestamp?] or [amount, senderScore, recipientScore] (legacy)
      const [param1, param2, param3, param4] = data;
      
      let sender: string;
      let recipient: string;
      let amount: number;
      let timestamp: number;
      
      // Check if this is legacy format (all numbers) or new format
      if (typeof param1 === 'string' && param1.startsWith('0x')) {
        // New format: [sender, recipient, amount, timestamp]
        sender = String(param1);
        recipient = String(param2);
        amount = Number(param3);
        timestamp = Number(param4) || Date.now() / 1000;
      } else {
        // Legacy format: [amount, senderScore, recipientScore]
        amount = Number(param1);
        timestamp = Date.now() / 1000;
        // Generate dummy addresses for API compatibility
        sender = `0x${'1'.repeat(64)}`;
        recipient = `0x${'2'.repeat(64)}`;
      }
      
      const result = await realMLServices.detectRealFraud(sender, recipient, amount, timestamp);
      
      return {
        ...result,
        status: 'success'
      };
    }
    
    return {
      error: 'Unknown prediction type',
      status: 'error'
    };
    
  } catch (error) {
    console.error('Real ML service failed:', error);
    // Only fallback on real errors - no more fallback systems by default
    return {
      error: `ML prediction failed: ${error}`,
      status: 'error'
    };
  }
}

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

    const { type, data } = body as { type?: string; data?: unknown };

    if (!type || !['fee', 'fraud'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid prediction type. Must be "fee" or "fraud"' },
        { status: 400 }
      );
    }

    if (!Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Data must be an array' },
        { status: 400 }
      );
    }

    // Get ML prediction
    const result = await getMLPrediction(type, data);
    
    const response = {
      ...result,
      timestamp: new Date().toISOString(),
      type,
      inputData: data,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('ML Prediction API error:', error);
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

    if (!type || !['fee', 'fraud'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid prediction type. Must be "fee" or "fraud"' },
        { status: 400 }
      );
    }

    if (!dataParam) {
      return NextResponse.json(
        { error: 'Missing data parameter' },
        { status: 400 }
      );
    }

    let data: unknown;
    try {
      data = JSON.parse(dataParam);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in data parameter' },
        { status: 400 }
      );
    }

    if (!Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Data must be an array' },
        { status: 400 }
      );
    }

    // Get ML prediction
    const result = await getMLPrediction(type, data);
    
    const response = {
      ...result,
      timestamp: new Date().toISOString(),
      type,
      inputData: data,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('ML Prediction API error:', error);
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
