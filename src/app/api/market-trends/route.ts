import { NextResponse, NextRequest } from 'next/server';
import { marketTrendsService } from '@/lib/market-trends-service';

// Rate limiting configuration
const REQUEST_CACHE = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT = 30; // 30 requests per minute for market data
const RATE_LIMIT_WINDOW = 60000; // 1 minute

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
    const type = searchParams.get('type') || 'aptos';
    
    let data;
    
    if (type === 'aptos') {
      data = await marketTrendsService.getAptosMarketData();
    } else if (type === 'metrics') {
      data = await marketTrendsService.getMarketMetrics();
    } else if (type === 'top') {
      data = await marketTrendsService.getTopCryptoTrends();
    } else {
      return NextResponse.json(
        { error: 'Invalid type. Use "aptos", "metrics", or "top"' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
      cached: false
    });
    
  } catch (error) {
    console.error('Market trends API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch market trends',
        success: false,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
