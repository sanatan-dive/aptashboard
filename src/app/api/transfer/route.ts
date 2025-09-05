import { NextResponse, NextRequest } from 'next/server';
import { AptosClient, Types } from 'aptos';
import { validator, apiSchemas } from '@/lib/validation';
import { logger, generateRequestId, createPerformanceTimer, metrics } from '@/lib/logger';
import { 
  handleApiError, 
  ValidationError, 
  BlockchainError,
  ErrorRecovery 
} from '@/lib/error-handling';

// Use environment variables for configuration
const APTOS_NODE_URL = process.env.APTOS_NODE_URL || 'https://fullnode.mainnet.aptoslabs.com/v1';
const FRAUD_LOG_MODULE_ADDRESS = process.env.FRAUD_LOG_MODULE_ADDRESS || '0x1';
const client = new AptosClient(APTOS_NODE_URL);

// Production token addresses (replace with actual mainnet addresses)
const TOKEN_ADDRESSES = {
  USDC: process.env.USDC_TOKEN_ADDRESS || '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC',
  USDT: process.env.USDT_TOKEN_ADDRESS || '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDT',
  APT: '0x1::aptos_coin::AptosCoin'
};

const MAX_AMOUNT = Number(process.env.MAX_TRANSFER_AMOUNT) || 1000000;
const MIN_AMOUNT = Number(process.env.MIN_TRANSFER_AMOUNT) || 0.000001;
const TRANSACTION_TIMEOUT = Number(process.env.TRANSACTION_TIMEOUT) || 30000;

// Cache for address validation
const addressValidationCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  isValid: boolean;
  timestamp: number;
}

interface FraudCheckResult {
  risk_score: number;
  is_fraud: boolean;
  is_high_risk: boolean;
  confidence: number;
  model: string;
  status: string;
  risk_factors: string[];
  analysis: {
    amount: number;
    sender_length: number;
    recipient_length: number;
    timestamp: number;
  };
}

function validateAddress(address: string): boolean {
  // Check cache first
  const cached = addressValidationCache.get(address);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.isValid;
  }

  const isValid = /^0x[a-fA-F0-9]{64}$/.test(address);
  
  // Cache the result
  addressValidationCache.set(address, {
    isValid,
    timestamp: Date.now()
  });

  return isValid;
}

function sanitizeAmount(amount: number): number {
  return Math.floor(amount * 1_000_000) / 1_000_000; // Ensure 6 decimal precision
}

async function predictTransactionFee(
  amount: number
): Promise<{ fee: number; confidence: number; model: string } | null> {
  try {
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/api/predict-ml`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'fee',
        data: [amount, 'APT', 'high'] // amount, token, priority
      }),
    });

    if (!response.ok) {
      logger.warn('Fee prediction service unavailable', { status: response.status });
      return null;
    }

    const result = await response.json();
    
    return {
      fee: result.fee || result.prediction || 0.001,
      confidence: result.confidence || 0.8,
      model: result.model || 'ml_prediction'
    };
  } catch (error) {
    logger.warn('Fee prediction failed', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

async function checkTransactionFraud(
  senderAddress: string,
  recipientAddress: string,
  amount: number
): Promise<FraudCheckResult | null> {
  try {
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/api/predict-ml`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'fraud',
        data: [senderAddress, recipientAddress, amount, Math.floor(Date.now() / 1000)]
      }),
    });

    if (!response.ok) {
      logger.warn('Fraud detection service unavailable', { status: response.status });
      return null;
    }

    const result = await response.json() as FraudCheckResult;
    
    logger.info('Fraud check completed', {
      risk_score: result.risk_score,
      is_fraud: result.is_fraud,
      model: result.model,
      risk_factors: result.risk_factors
    });

    return result;
  } catch (error) {
    logger.warn('Fraud detection failed', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

async function logFraudToBlockchain(
  senderAddress: string,
  amount: number
): Promise<boolean> {
  try {
    // Validate inputs
    if (!senderAddress || typeof amount !== 'number' || isNaN(amount)) {
      logger.warn('Invalid inputs for fraud logging', { senderAddress, amount });
      return false;
    }

    // Log fraud event to the blockchain using our FraudLog Move contract
    logger.info('Logging fraud event to blockchain', {
      sender: senderAddress.slice(0, 10) + '...',
      amount,
      contract: FRAUD_LOG_MODULE_ADDRESS
    });

    // Note: In a real implementation, you would need a private key or signer
    // to call the contract. For now, we'll simulate the transaction structure
    const payload = {
      function: `${FRAUD_LOG_MODULE_ADDRESS}::FraudLog::log_fraud`,
      arguments: [senderAddress, amount.toString()],
      type_arguments: []
    };

    logger.info('Fraud event payload prepared', { payload });

    // In production, you'd execute this transaction:
    // const transaction = await client.generateTransaction(adminAddress, payload);
    // const signedTransaction = await adminAccount.signTransaction(transaction);
    // const result = await client.submitTransaction(signedTransaction);

    return true;
  } catch (error) {
    logger.error('Failed to log fraud to blockchain', error as Error, {
      context: 'fraud_logging'
    });
    return false;
  }
}

async function validateTokenBalance(
  address: string, 
  token: string, 
  amount: number
): Promise<boolean> {
  try {
    if (token === 'APT') {
      const balance = await client.getAccountResource(
        address,
        '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>'
      );
      const coinBalance = (balance.data as { coin: { value: string } }).coin.value;
      return parseInt(coinBalance) >= amount * 1_000_000;
    }
    
    // For other tokens, implement similar balance checking
    return true; // Simplified for demo
  } catch (error) {
    logger.warn('Balance validation failed', { error: error instanceof Error ? error.message : String(error) });
    return true; // Allow transaction to proceed if balance check fails
  }
}

async function createTransferPayload(
  recipientAddress: string,
  amount: number,
  token: string
): Promise<Types.TransactionPayload> {
  const tokenAddress = TOKEN_ADDRESSES[token as keyof typeof TOKEN_ADDRESSES];
  
  return {
    type: 'entry_function_payload',
    function: '0x1::coin::transfer',
    type_arguments: [tokenAddress],
    arguments: [recipientAddress, Math.floor(amount * 1_000_000)],
  };
}

async function submitTransactionWithRetry(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signedTransaction: any
): Promise<{ txId: string; result: Types.UserTransaction }> {
  return ErrorRecovery.withRetry(async () => {
    const txn = await ErrorRecovery.withTimeout(
      async () => await client.submitTransaction(signedTransaction),
      TRANSACTION_TIMEOUT,
      'Transaction submission timed out'
    );
    
    const result = await ErrorRecovery.withTimeout(
      async () => await client.waitForTransaction(txn.hash),
      TRANSACTION_TIMEOUT,
      'Transaction confirmation timed out'
    );
    
    return { txId: txn.hash, result: result as unknown as Types.UserTransaction };
  }, `transfer_${Date.now()}`);
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const timer = createPerformanceTimer();

  try {
    // Increment API call metrics
    metrics.incrementCounter('api_calls_total', { endpoint: 'transfer', method: 'POST' });

    // Parse and validate request body
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
    const validation = validator.validate(body, apiSchemas.transfer);
    if (!validation.isValid) {
      const errors = Object.entries(validation.errors)
        .map(([field, error]) => `${field}: ${error}`)
        .join(', ');
      throw new ValidationError(`Validation failed: ${errors}`);
    }

    const { senderAddress, recipientAddress, amount, token, signedTransaction } = validation.sanitizedData!;

    // Convert senderAddress if it's an object (from wallet)
    let formattedSenderAddress = senderAddress as string;
    if (typeof senderAddress === 'object' && senderAddress && 'data' in senderAddress && Array.isArray((senderAddress as { data: number[] }).data)) {
      const addressData = (senderAddress as { data: number[] }).data;
      formattedSenderAddress = '0x' + addressData.map((byte: number) => 
        byte.toString(16).padStart(2, '0')
      ).join('');
    }

    // Validate addresses with caching
    if (!validateAddress(formattedSenderAddress)) {
      throw new ValidationError('Invalid sender address format');
    }
    if (!validateAddress(recipientAddress as string)) {
      throw new ValidationError('Invalid recipient address format');
    }

    // Prevent self-transfer
    if (formattedSenderAddress === recipientAddress) {
      throw new ValidationError('Cannot transfer to the same address');
    }

    // Validate amount bounds
    const numAmount = parseFloat(amount as string);
    if (isNaN(numAmount) || numAmount <= MIN_AMOUNT || numAmount > MAX_AMOUNT) {
      throw new ValidationError(
        `Invalid amount. Must be between ${MIN_AMOUNT} and ${MAX_AMOUNT}`
      );
    }

    // Validate token
    const tokenKey = token as keyof typeof TOKEN_ADDRESSES;
    if (!TOKEN_ADDRESSES[tokenKey]) {
      throw new ValidationError(
        `Unsupported token. Supported: ${Object.keys(TOKEN_ADDRESSES).join(', ')}`
      );
    }

    const sanitizedAmount = sanitizeAmount(numAmount);

    // Perform ML-based fraud detection
    const fraudCheck = await checkTransactionFraud(
      formattedSenderAddress,
      recipientAddress as string,
      sanitizedAmount
    );

    // Handle high-risk transactions
    if (fraudCheck && fraudCheck.is_high_risk) {
      // Log fraud event to blockchain
      await logFraudToBlockchain(formattedSenderAddress, sanitizedAmount);

      logger.warn('High-risk transaction blocked', {
        requestId,
        sender: formattedSenderAddress.slice(0, 10) + '...',
        recipient: (recipientAddress as string).slice(0, 10) + '...',
        amount: sanitizedAmount,
        risk_score: fraudCheck.risk_score,
        risk_factors: fraudCheck.risk_factors
      });

      metrics.incrementCounter('transfers_blocked', { 
        reason: 'high_risk_fraud',
        risk_score: String(Math.floor(fraudCheck.risk_score * 10) / 10)
      });

      return NextResponse.json({
        error: 'Transaction blocked due to security concerns',
        risk_analysis: {
          risk_score: fraudCheck.risk_score,
          risk_factors: fraudCheck.risk_factors,
          recommendation: 'Please verify transaction details and try again'
        },
        requestId
      }, { status: 403 });
    }

    // Log fraud check results for suspicious but not blocked transactions
    if (fraudCheck && fraudCheck.is_fraud) {
      // Log suspicious transaction to blockchain for monitoring
      await logFraudToBlockchain(formattedSenderAddress, sanitizedAmount);

      logger.warn('Suspicious transaction detected but allowing', {
        requestId,
        sender: formattedSenderAddress.slice(0, 10) + '...',
        recipient: (recipientAddress as string).slice(0, 10) + '...',
        amount: sanitizedAmount,
        risk_score: fraudCheck.risk_score,
        risk_factors: fraudCheck.risk_factors
      });

      metrics.incrementCounter('transfers_flagged', { 
        reason: 'suspicious_activity',
        risk_score: String(Math.floor(fraudCheck.risk_score * 10) / 10)
      });
    }

    // Check sender balance (optional, for better UX)
    if (process.env.ENABLE_BALANCE_VALIDATION === 'true') {
      const hasBalance = await validateTokenBalance(
        formattedSenderAddress,
        token as string,
        sanitizedAmount
      );
      if (!hasBalance) {
        throw new ValidationError('Insufficient balance for transfer');
      }
    }

    // Log the transfer attempt
    logger.info('Transfer request initiated', {
      requestId,
      sender: formattedSenderAddress.slice(0, 10) + '...',
      recipient: (recipientAddress as string).slice(0, 10) + '...',
      amount: sanitizedAmount,
      token: token as string
    });

    // If no signed transaction, return payload for client-side signing
    if (!signedTransaction) {
      // Get predicted fee
      const feeEstimate = await predictTransactionFee(sanitizedAmount);
      
      const payload = await createTransferPayload(
        recipientAddress as string,
        sanitizedAmount,
        token as string
      );

      metrics.incrementCounter('transfer_payload_generated', { token: token as string });

      const duration = timer.end();
      metrics.recordHistogram('api_request_duration', duration, { endpoint: 'transfer', type: 'payload' });

      return NextResponse.json({ 
        payload,
        message: 'Sign this transaction with your wallet',
        requestId,
        metadata: {
          estimatedFee: feeEstimate ? feeEstimate.fee.toString() : '0.001',
          feeConfidence: feeEstimate ? feeEstimate.confidence : 0.5,
          feeModel: feeEstimate ? feeEstimate.model : 'unknown',
          gasLimit: '1000'
        },
        security_analysis: fraudCheck ? {
          risk_score: fraudCheck.risk_score,
          status: fraudCheck.is_fraud ? 'flagged' : 'safe',
          model: fraudCheck.model
        } : { status: 'not_analyzed' }
      });
    }

    // Submit signed transaction with retry logic
    try {
      const { txId, result } = await submitTransactionWithRetry(signedTransaction);
      
      // Log successful transfer
      logger.info('Transfer completed successfully', {
        requestId,
        txId,
        sender: formattedSenderAddress.slice(0, 10) + '...',
        recipient: (recipientAddress as string).slice(0, 10) + '...',
        amount: sanitizedAmount,
        token: token as string,
        gasUsed: result.gas_used
      });

      metrics.incrementCounter('transfers_completed', { token: token as string, status: 'success' });
      
      const duration = timer.end();
      metrics.recordHistogram('api_request_duration', duration, { endpoint: 'transfer', type: 'submit' });
      metrics.recordHistogram('transaction_gas_used', parseInt(result.gas_used), { token: token as string });

      return NextResponse.json({ 
        success: true, 
        txId,
        result: {
          hash: result.hash,
          gasUsed: result.gas_used,
          success: result.success,
          vmStatus: result.vm_status
        },
        requestId,
        security_analysis: fraudCheck ? {
          risk_score: fraudCheck.risk_score,
          status: fraudCheck.is_fraud ? 'flagged' : 'safe',
          model: fraudCheck.model,
          risk_factors: fraudCheck.risk_factors
        } : { status: 'not_analyzed' }
      });

    } catch (submitError) {
      metrics.incrementCounter('transfers_completed', { token: token as string, status: 'failed' });
      
      logger.error('Transaction submission failed', submitError as Error, {
        requestId,
        sender: formattedSenderAddress.slice(0, 10) + '...',
        recipient: (recipientAddress as string).slice(0, 10) + '...',
        amount: sanitizedAmount,
        token: token as string
      });

      throw new BlockchainError(
        'Transaction submission failed',
        submitError instanceof Error ? submitError.message : 'Unknown blockchain error'
      );
    }

  } catch (error) {
    const duration = timer.end();
    metrics.recordHistogram('api_request_duration', duration, { endpoint: 'transfer', status: 'error' });
    metrics.incrementCounter('api_errors_total', { endpoint: 'transfer', method: 'POST' });

    return handleApiError(error, requestId, req.nextUrl.pathname);
  }
}

// GET endpoint for transaction status and history
export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const timer = createPerformanceTimer();

  try {
    metrics.incrementCounter('api_calls_total', { endpoint: 'transfer', method: 'GET' });

    const { searchParams } = new URL(req.url);
    const txHash = searchParams.get('txHash');
    const address = searchParams.get('address');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100); // Max 100

    if (txHash) {
      // Get specific transaction details
      if (!txHash.startsWith('0x') || txHash.length !== 66) {
        throw new ValidationError('Invalid transaction hash format');
      }

      try {
        const transaction = await client.getTransactionByHash(txHash);
        
        const duration = timer.end();
        metrics.recordHistogram('api_request_duration', duration, { endpoint: 'transfer', type: 'status' });

        return NextResponse.json({
          transaction,
          requestId
        });
      } catch (error) {
        throw new BlockchainError(
          'Transaction not found or blockchain unavailable',
          error instanceof Error ? error.message : 'Unknown error'
        );
      }

    } else if (address) {
      // Get transaction history for address
      if (!validateAddress(address)) {
        throw new ValidationError('Invalid address format');
      }

      try {
        const transactions = await client.getAccountTransactions(address, { limit });
        
        const duration = timer.end();
        metrics.recordHistogram('api_request_duration', duration, { endpoint: 'transfer', type: 'history' });

        return NextResponse.json({
          transactions,
          count: transactions.length,
          requestId
        });
      } catch (error) {
        throw new BlockchainError(
          'Failed to fetch transaction history',
          error instanceof Error ? error.message : 'Unknown error'
        );
      }

    } else {
      throw new ValidationError('Either txHash or address parameter is required');
    }

  } catch (error) {
    const duration = timer.end();
    metrics.recordHistogram('api_request_duration', duration, { endpoint: 'transfer', status: 'error' });
    metrics.incrementCounter('api_errors_total', { endpoint: 'transfer', method: 'GET' });

    return handleApiError(error, requestId, req.nextUrl.pathname);
  }
}