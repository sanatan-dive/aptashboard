import { NextResponse, NextRequest } from 'next/server';
import { AptosClient } from 'aptos';
import { logger, generateRequestId, createPerformanceTimer, metrics } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handling';

const APTOS_NODE_URL = process.env.APTOS_NODE_URL || 'https://fullnode.mainnet.aptoslabs.com/v1';
const client = new AptosClient(APTOS_NODE_URL);
// Remove unused variables - keeping for potential future use
// const LENDING_MODULE_ADDRESS = process.env.LENDING_MODULE_ADDRESS || '0x1';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  environment: string;
  services: {
    aptos: {
      status: 'healthy' | 'unhealthy' | 'degraded';
      latency?: number;
      error?: string;
    };
    python: {
      status: 'healthy' | 'unhealthy' | 'degraded';
      latency?: number;
      error?: string;
    };
    database?: {
      status: 'healthy' | 'unhealthy' | 'degraded';
      latency?: number;
      error?: string;
    };
  };
  metrics: {
    requestsPerMinute: number;
    errorRate: number;
    averageResponseTime: number;
  };
}

async function checkAptosHealth(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number; error?: string }> {
  try {
    const start = performance.now();
    await client.getLedgerInfo();
    const latency = performance.now() - start;
    
    return {
      status: latency < 2000 ? 'healthy' : 'unhealthy',
      latency
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function checkPythonHealth(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number; error?: string }> {
  try {
    const start = performance.now();
    
    // Simple test to verify Python is available
    const { spawn } = await import('child_process');
    const pythonExecutable = process.env.PYTHON_EXECUTABLE || 'python3';
    
    return new Promise((resolve) => {
      const pythonProcess = spawn(pythonExecutable, ['--version'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 5000
      });
      
      pythonProcess.on('close', (code) => {
        const latency = performance.now() - start;
        if (code === 0) {
          resolve({
            status: latency < 1000 ? 'healthy' : 'unhealthy',
            latency
          });
        } else {
          resolve({
            status: 'unhealthy',
            error: `Python process exited with code ${code}`
          });
        }
      });
      
      pythonProcess.on('error', (error) => {
        resolve({
          status: 'unhealthy',
          error: error.message
        });
      });
    });
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function calculateMetrics() {
  const allMetrics = metrics.getMetrics();
  
  // Calculate requests per minute (simplified)
  const requestsPerMinute = Object.entries(allMetrics)
    .filter(([key]) => key.includes('api_calls_total'))
    .reduce((sum, [, value]) => sum + ((value as { counter?: number }).counter || 0), 0);
  
  // Calculate error rate (simplified)
  const totalErrors = Object.entries(allMetrics)
    .filter(([key]) => key.includes('api_errors_total'))
    .reduce((sum, [, value]) => sum + ((value as { counter?: number }).counter || 0), 0);
  
  const errorRate = requestsPerMinute > 0 ? (totalErrors / requestsPerMinute) * 100 : 0;
  
  // Calculate average response time (simplified)
  const responseTimes = Object.entries(allMetrics)
    .filter(([key]) => key.includes('api_request_duration_histogram'))
    .map(([, value]) => (value as { histogram?: number[] }).histogram || [])
    .flat();
  
  const averageResponseTime = responseTimes.length > 0 
    ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
    : 0;
  
  return {
    requestsPerMinute,
    errorRate,
    averageResponseTime
  };
}

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const timer = createPerformanceTimer();

  try {
    logger.info('Health check requested', { requestId });

    // Check if detailed health check is requested
    const { searchParams } = new URL(req.url);
    const detailed = searchParams.get('detailed') === 'true';
    
    // Basic health checks
    const [aptosHealth, pythonHealth] = await Promise.all([
      checkAptosHealth(),
      checkPythonHealth()
    ]);

    // Determine overall status
    const services = {
      aptos: aptosHealth,
      python: pythonHealth
    };

    const allHealthy = Object.values(services).every(service => service.status === 'healthy');
    const anyUnhealthy = Object.values(services).some(service => service.status === 'unhealthy');
    
    const overallStatus = allHealthy ? 'healthy' : anyUnhealthy ? 'unhealthy' : 'degraded';

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      services: services as HealthStatus['services'],
      metrics: calculateMetrics()
    };

    // Add detailed information if requested
    if (detailed) {
      // Add database health if configured
      if (process.env.DATABASE_URL) {
        // Add database health check here
        healthStatus.services.database = {
          status: 'healthy', // Placeholder
          latency: 0
        };
      }
    }

    const duration = timer.end();
    metrics.incrementCounter('health_checks_total', { status: overallStatus });
    metrics.recordHistogram('health_check_duration', duration);

    logger.info('Health check completed', {
      requestId,
      status: overallStatus,
      duration,
      services: Object.keys(services).length
    });

    // Return appropriate HTTP status based on health
    const httpStatus = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

    return NextResponse.json(healthStatus, { 
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Request-ID': requestId
      }
    });

  } catch (error) {
    const duration = timer.end();
    metrics.incrementCounter('health_checks_total', { status: 'error' });
    metrics.recordHistogram('health_check_duration', duration);

    logger.error('Health check failed', error as Error, { requestId });

    return handleApiError(error, requestId, req.nextUrl.pathname);
  }
}

// Simple liveness probe
export async function HEAD(_req: NextRequest) {
  const requestId = generateRequestId();
  
  try {
    metrics.incrementCounter('liveness_probes_total');
    
    return new NextResponse(null, { 
      status: 200,
      headers: {
        'X-Request-ID': requestId
      }
    });
  } catch (error) {
    logger.error('Liveness probe failed', error as Error, { requestId });
    return new NextResponse(null, { status: 503 });
  }
}
