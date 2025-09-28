import { NextResponse, NextRequest } from 'next/server';
import { AptosClient } from 'aptos';
import { logger, generateRequestId, createPerformanceTimer } from '@/lib/logger';
import { handleApiError, ValidationError } from '@/lib/error-handling';

const APTOS_NODE_URL = process.env.APTOS_NODE_URL || 'https://fullnode.testnet.aptoslabs.com/v1';
const FRAUD_LOG_MODULE_ADDRESS = process.env.FRAUD_LOG_MODULE_ADDRESS || '0x1';
const client = new AptosClient(APTOS_NODE_URL);

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const timer = createPerformanceTimer();
  
  try {
    const body = await request.json();
    const { address } = body;

    if (!address) {
      throw new ValidationError('Address parameter is required');
    }

    // Validate address format
    if (!address.startsWith('0x') || address.length !== 66) {
      throw new ValidationError('Invalid address format');
    }

    logger.info('Initializing fraud log contract', {
      requestId,
      address: address.slice(0, 10) + '...',
      contract: FRAUD_LOG_MODULE_ADDRESS
    });

    // Prepare transaction payload for FraudLog initialization
    const payload = {
      function: `${FRAUD_LOG_MODULE_ADDRESS}::FraudLog::initialize`,
      arguments: [],
      type_arguments: []
    };

    logger.info('Fraud log initialization payload prepared', { 
      requestId,
      payload,
      note: 'This would be submitted if a signer was available'
    });

    // In a production environment, you would:
    // 1. Have a service account with private key
    // 2. Generate and sign the transaction
    // 3. Submit it to the blockchain
    // 
    // Example implementation:
    // const transaction = await client.generateTransaction(address, payload);
    // const signedTransaction = await serviceAccount.signTransaction(transaction);
    // const result = await client.submitTransaction(signedTransaction);

    const executionTime = timer.end();

    return NextResponse.json({
      status: 'success',
      message: 'Fraud log initialization payload prepared',
      contract_address: FRAUD_LOG_MODULE_ADDRESS,
      payload,
      instructions: {
        description: 'To complete initialization, submit this transaction from your wallet',
        steps: [
          '1. Connect your wallet to the dApp',
          '2. Sign and submit the initialization transaction',
          '3. Wait for transaction confirmation',
          '4. Fraud logging will be enabled for your account'
        ]
      },
      requestId,
      executionTime: `${executionTime}ms`
    });

  } catch (error) {
    const executionTime = timer.end();
    
    logger.error('Fraud log initialization failed', error as Error, {
      requestId,
      executionTime
    });

    return handleApiError(error, requestId);
  }
}

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      throw new ValidationError('Address parameter is required');
    }

    // Check if FraudLog is already initialized for this address
    try {
      const resourceType = `${FRAUD_LOG_MODULE_ADDRESS}::FraudLog::FraudLog`;
      await client.getAccountResource(address, resourceType);
      
      return NextResponse.json({
        status: 'initialized',
        message: 'Fraud log is already initialized for this address',
        contract_address: FRAUD_LOG_MODULE_ADDRESS,
        requestId
      });

    } catch (resourceError: unknown) {
      if ((resourceError as Error).message.includes('resource_not_found')) {
        return NextResponse.json({
          status: 'not_initialized',
          message: 'Fraud log not initialized for this address',
          contract_address: FRAUD_LOG_MODULE_ADDRESS,
          initialization_required: true,
          requestId
        });
      }
      
      throw resourceError;
    }

  } catch (error) {
    logger.error('Fraud log status check failed', error as Error, {
      requestId
    });

    return handleApiError(error, requestId);
  }
}
