import { NextResponse, NextRequest } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

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

function callPythonMLService(type: string, data: unknown[]): Promise<PredictionResult> {
  return new Promise((resolve) => {
    // Path to Python ML CLI script
    const scriptPath = path.join(process.cwd(), 'ml_cli.py');
    
    // Use Python executable from virtual environment or system Python
    const pythonPath = process.env.PYTHON_PATH || '/home/sana/Documents/Actual Projects/aptos/aptash/venv/bin/python';
    
    // Spawn Python process
    const python = spawn(pythonPath, [scriptPath], {
      cwd: process.cwd(),
    });
    
    let stdout = '';
    let stderr = '';
    
    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    python.on('close', (code) => {
      if (code === 0) {
        try {
          const lines = stdout.trim().split('\n');
          const lastLine = lines[lines.length - 1];
          const result = JSON.parse(lastLine);
          resolve(result);
        } catch (error) {
          console.error('Error parsing Python output:', error);
          resolve({
            error: 'Failed to parse ML service output',
            status: 'error',
            fallback: true
          });
        }
      } else {
        console.error('Python process failed:', stderr);
        resolve({
          error: `Python process failed with code ${code}`,
          status: 'error',
          fallback: true
        });
      }
    });
    
    // Send input data in the format our ML CLI expects
    const input = type + '\n' + JSON.stringify(data) + '\n';
    python.stdin.write(input);
    python.stdin.end();
    
    // Timeout after 30 seconds
    setTimeout(() => {
      python.kill();
      resolve({
        error: 'ML service timeout',
        status: 'timeout',
        fallback: true
      });
    }, 30000);
  });
}

async function getMLPrediction(type: string, data: unknown[]): Promise<PredictionResult> {
  try {
    // First try to call the Python ML service
    const result = await callPythonMLService(type, data);
    
    if (result.error || result.fallback) {
      // Fallback to built-in prediction logic
      return getFallbackPrediction(type, data);
    }
    
    return {
      ...result,
      ml_service: true,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('ML service failed:', error);
    return getFallbackPrediction(type, data);
  }
}

function getFallbackPrediction(type: string, data: unknown[]): PredictionResult {
  if (type === 'fee') {
    return getFallbackFee(data);
  } else if (type === 'fraud') {
    return getFallbackFraud(data);
  }
  
  return {
    error: 'Unknown prediction type',
    status: 'error'
  };
}

function getFallbackFee(data: unknown[]): PredictionResult {
  try {
    const [networkLoad = 0.5, amount = 100, priority = 1] = data;
    
    const baseFee = 0.001;
    const amountFactor = Math.log1p(Number(amount)) * 0.0001;
    const networkFactor = Number(networkLoad) * 0.01;
    const priorityMultiplier = Number(priority) > 0.7 ? 1.5 : 1.0;
    
    let predictedFee = (baseFee + amountFactor + networkFactor) * priorityMultiplier;
    predictedFee = Math.max(0.0001, Math.min(0.01, predictedFee));
    
    return {
      predicted_fee: Number(predictedFee.toFixed(6)),
      confidence: 0.75,
      model: 'mathematical_fallback',
      status: 'success',
      factors: {
        base_fee: baseFee,
        amount_factor: amountFactor,
        network_factor: networkFactor,
        priority_multiplier: priorityMultiplier
      }
    };
  } catch (error) {
    return {
      error: `Fee prediction failed: ${error}`,
      predicted_fee: 0.001,
      confidence: 0.5,
      model: 'error_fallback',
      status: 'error'
    };
  }
}

function getFallbackFraud(data: unknown[]): PredictionResult {
  try {
    const [sender = '', recipient = '', amount = 0, timestamp = Date.now() / 1000] = data;
    
    let riskScore = 0.0;
    const riskFactors: string[] = [];
    
    const amountNum = Number(amount);
    
    // Amount-based risk
    if (amountNum > 100000) {
      riskScore += 0.4;
      riskFactors.push('very_high_amount');
    } else if (amountNum > 10000) {
      riskScore += 0.2;
      riskFactors.push('high_amount');
    } else if (amountNum < 0.001) {
      riskScore += 0.15;
      riskFactors.push('micro_transaction');
    }
    
    // Address-based risk
    if (String(sender) === String(recipient)) {
      riskScore += 0.3;
      riskFactors.push('self_transaction');
    }
    
    // Round amount detection
    if ([1000, 5000, 10000, 50000, 100000].includes(amountNum)) {
      riskScore += 0.2;
      riskFactors.push('round_amount');
    }
    
    // Timing analysis
    const currentTime = Date.now() / 1000;
    const timeDiff = currentTime - Number(timestamp);
    
    if (Number(timestamp) > currentTime + 300) {
      riskScore += 0.3;
      riskFactors.push('future_timestamp');
    } else if (timeDiff > 86400 * 30) {
      riskScore += 0.2;
      riskFactors.push('old_transaction');
    }
    
    // Address format checks
    const senderStr = String(sender);
    const recipientStr = String(recipient);
    
    if (senderStr.length < 10 || recipientStr.length < 10) {
      riskScore += 0.2;
      riskFactors.push('malformed_address');
    }
    
    // Pattern detection
    if (hasRepeatedPattern(senderStr) || hasRepeatedPattern(recipientStr)) {
      riskScore += 0.25;
      riskFactors.push('suspicious_address_pattern');
    }
    
    riskScore = Math.min(1.0, Math.max(0.0, riskScore));
    
    return {
      risk_score: Number(riskScore.toFixed(3)),
      is_suspicious: riskScore > 0.6,
      is_high_risk: riskScore > 0.8,
      confidence: 0.8,
      model: 'rule_based_fallback',
      status: 'success',
      risk_factors: riskFactors,
      analysis: {
        amount: amountNum,
        sender_length: senderStr.length,
        recipient_length: recipientStr.length,
        timestamp: Number(timestamp)
      }
    };
  } catch (error) {
    return {
      error: `Fraud detection failed: ${error}`,
      risk_score: 0.5,
      is_suspicious: false,
      confidence: 0.5,
      model: 'error_fallback',
      status: 'error'
    };
  }
}

function hasRepeatedPattern(address: string): boolean {
  if (!address || address.length < 4) return false;
  
  // Check for repeated characters
  for (let i = 0; i < address.length - 2; i++) {
    if (address[i] === address[i + 1] && address[i + 1] === address[i + 2]) {
      return true;
    }
  }
  
  // Check for repeated 2-char patterns
  for (let i = 0; i < address.length - 3; i++) {
    const pattern = address.slice(i, i + 2);
    if (address.split(pattern).length > 3) {
      return true;
    }
  }
  
  return false;
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
