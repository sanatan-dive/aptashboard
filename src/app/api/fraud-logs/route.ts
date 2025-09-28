import { NextResponse, NextRequest } from 'next/server';
import { AptosClient } from 'aptos';
import { logger, generateRequestId, createPerformanceTimer } from '@/lib/logger';
import { handleApiError, ValidationError } from '@/lib/error-handling';

const APTOS_NODE_URL = process.env.APTOS_NODE_URL || 'https://fullnode.testnet.aptoslabs.com/v1';
const FRAUD_LOG_MODULE_ADDRESS = process.env.FRAUD_LOG_MODULE_ADDRESS || '0x1';
const client = new AptosClient(APTOS_NODE_URL);

interface FraudEvent {
  sender: string;
  amount: string;
  timestamp: string;
}

interface FraudLogResource {
  events: FraudEvent[];
}

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const timer = createPerformanceTimer();
  
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!address) {
      throw new ValidationError('Address parameter is required');
    }

    // Validate address format
    if (!address.startsWith('0x') || address.length !== 66) {
      throw new ValidationError('Invalid address format');
    }

    logger.info('Fetching fraud logs', {
      requestId,
      address: address.slice(0, 10) + '...',
      limit,
      contract: FRAUD_LOG_MODULE_ADDRESS
    });

    try {
      // Get the FraudLog resource from the blockchain
      const resourceType = `${FRAUD_LOG_MODULE_ADDRESS}::FraudLog::FraudLog`;
      const resource = await client.getAccountResource(
        address,
        resourceType
      );

      const fraudLogData = resource.data as FraudLogResource;
      
      // Get the most recent events (limited by the limit parameter)
      const recentEvents = fraudLogData.events
        .slice(-limit)
        .reverse()
        .map(event => ({
          sender: event.sender,
          amount: event.amount,
          timestamp: parseInt(event.timestamp),
          formatted_amount: (parseInt(event.amount) / 1_000_000).toFixed(6), // Convert from micro units
          date: new Date(parseInt(event.timestamp) * 1000).toISOString()
        }));

      const executionTime = timer.end();

      logger.info('Fraud logs retrieved successfully', {
        requestId,
        eventsCount: recentEvents.length,
        executionTime
      });

      return NextResponse.json({
        address,
        fraud_events: recentEvents,
        total_events: fraudLogData.events.length,
        shown_events: recentEvents.length,
        contract_address: FRAUD_LOG_MODULE_ADDRESS,
        status: 'success',
        requestId
      });

    } catch (resourceError: unknown) {
      // Handle case where FraudLog resource doesn't exist for this address
      if ((resourceError as Error).message.includes('resource_not_found')) {
        logger.info('No fraud log resource found for address', {
          requestId,
          address: address.slice(0, 10) + '...'
        });

        return NextResponse.json({
          address,
          fraud_events: [],
          total_events: 0,
          shown_events: 0,
          contract_address: FRAUD_LOG_MODULE_ADDRESS,
          status: 'no_logs',
          message: 'No fraud logs found for this address',
          requestId
        });
      }
      
      throw resourceError;
    }

  } catch (error) {
    const executionTime = timer.end();
    
    logger.error('Fraud logs fetch failed', error as Error, {
      requestId,
      executionTime
    });

    return handleApiError(error, requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const timer = createPerformanceTimer();
  
  try {
    const body = await request.json();
    const { address, limit = 50 } = body;

    if (!address) {
      throw new ValidationError('Address parameter is required');
    }

    // Validate address format
    if (!address.startsWith('0x') || address.length !== 66) {
      throw new ValidationError('Invalid address format');
    }

    logger.info('Fetching fraud logs via POST', {
      requestId,
      address: address.slice(0, 10) + '...',
      limit
    });

    try {
      // Get fraud events from the blockchain
      const resourceType = `${FRAUD_LOG_MODULE_ADDRESS}::FraudLog::FraudLog`;
      const resource = await client.getAccountResource(
        address,
        resourceType
      );

      const fraudLogData = resource.data as FraudLogResource;
      
      // Format and return recent events
      const recentEvents = fraudLogData.events
        .slice(-limit)
        .reverse()
        .map((event, index) => ({
          id: `fraud_${Date.now()}_${index}`,
          sender: event.sender,
          amount: event.amount,
          timestamp: parseInt(event.timestamp),
          formatted_amount: (parseInt(event.amount) / 1_000_000).toFixed(6),
          date: new Date(parseInt(event.timestamp) * 1000).toISOString(),
          risk_level: parseInt(event.amount) > 100_000_000 ? 'high' : 'medium' // > 100 APT
        }));

      const executionTime = timer.end();

      return NextResponse.json({
        address,
        fraud_events: recentEvents,
        statistics: {
          total_events: fraudLogData.events.length,
          high_risk_events: recentEvents.filter(e => e.risk_level === 'high').length,
          recent_events: recentEvents.length
        },
        contract_address: FRAUD_LOG_MODULE_ADDRESS,
        status: 'success',
        requestId,
        executionTime: `${executionTime}ms`
      });

    } catch (resourceError: unknown) {
      if ((resourceError as Error).message.includes('resource_not_found')) {
        return NextResponse.json({
          address,
          fraud_events: [],
          statistics: {
            total_events: 0,
            high_risk_events: 0,
            recent_events: 0
          },
          contract_address: FRAUD_LOG_MODULE_ADDRESS,
          status: 'no_logs',
          message: 'No fraud logs initialized for this address',
          requestId
        });
      }
      
      throw resourceError;
    }

  } catch (error) {
    const executionTime = timer.end();
    
    logger.error('Fraud logs POST failed', error as Error, {
      requestId,
      executionTime
    });

    return handleApiError(error, requestId);
  }
}
