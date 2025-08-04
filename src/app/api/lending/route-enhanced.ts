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

const APTOS_NODE_URL = process.env.APTOS_NODE_URL || 'https://fullnode.mainnet.aptoslabs.com/v1';
const client = new AptosClient(APTOS_NODE_URL);

// Module address for P2P lending contract
const LENDING_MODULE_ADDRESS = process.env.LENDING_MODULE_ADDRESS || '0x1';

const MAX_LOAN_AMOUNT = Number(process.env.MAX_LOAN_AMOUNT) || 100000;
const MIN_LOAN_AMOUNT = Number(process.env.MIN_LOAN_AMOUNT) || 1;
const MAX_INTEREST_RATE = Number(process.env.MAX_INTEREST_RATE) || 50;
const MIN_INTEREST_RATE = Number(process.env.MIN_INTEREST_RATE) || 0.1;
const TRANSACTION_TIMEOUT = Number(process.env.TRANSACTION_TIMEOUT) || 30000;

const SUPPORTED_TOKENS = ['USDC', 'USDT', 'APT'];

function validateAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(address);
}

function validateLoanParameters(amount: number, interestRate: number): { valid: boolean; error?: string } {
  if (isNaN(amount) || amount < MIN_LOAN_AMOUNT || amount > MAX_LOAN_AMOUNT) {
    return { 
      valid: false, 
      error: `Invalid amount. Must be between ${MIN_LOAN_AMOUNT} and ${MAX_LOAN_AMOUNT}` 
    };
  }
  
  if (isNaN(interestRate) || interestRate < MIN_INTEREST_RATE || interestRate > MAX_INTEREST_RATE) {
    return { 
      valid: false, 
      error: `Invalid interest rate. Must be between ${MIN_INTEREST_RATE}% and ${MAX_INTEREST_RATE}%` 
    };
  }
  
  return { valid: true };
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const timer = createPerformanceTimer();

  try {
    // Increment API call metrics
    metrics.incrementCounter('api_calls_total', { endpoint: 'lending', method: 'POST' });

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
    const validation = validator.validate(body, apiSchemas.lendingOffer);
    if (!validation.isValid) {
      const errors = Object.entries(validation.errors)
        .map(([field, error]) => `${field}: ${error}`)
        .join(', ');
      throw new ValidationError(`Validation failed: ${errors}`);
    }

    const { lenderAddress, amount, interestRate, token, duration, signedTransaction } = validation.sanitizedData!;

    // Validate lender address
    if (!validateAddress(lenderAddress as string)) {
      throw new ValidationError('Invalid lender address format');
    }

    // Validate loan parameters
    const paramValidation = validateLoanParameters(
      parseFloat(amount as string), 
      parseFloat(interestRate as string)
    );
    if (!paramValidation.valid) {
      throw new ValidationError(paramValidation.error!);
    }

    // Validate token
    if (!SUPPORTED_TOKENS.includes(token as string)) {
      throw new ValidationError(
        `Unsupported token. Supported: ${SUPPORTED_TOKENS.join(', ')}`
      );
    }

    // Validate duration (optional, default to 30 days)
    const loanDuration = duration || 30;
    if ((loanDuration as number) < 1 || (loanDuration as number) > 365) {
      throw new ValidationError(
        'Invalid loan duration. Must be between 1 and 365 days'
      );
    }

    const sanitizedAmount = Math.floor(parseFloat(amount as string) * 1_000_000); // Convert to smallest unit
    const sanitizedRate = Math.floor(parseFloat(interestRate as string) * 100); // Convert to basis points

    // Log the lending offer attempt
    logger.info('Lending offer request initiated', {
      requestId,
      lender: (lenderAddress as string).slice(0, 10) + '...',
      amount: sanitizedAmount,
      interestRate: sanitizedRate,
      token: token as string,
      duration: loanDuration as number
    });

    // If no signed transaction, return payload for client-side signing
    if (!signedTransaction) {
      const payload: Types.TransactionPayload = {
        type: 'entry_function_payload',
        function: `${LENDING_MODULE_ADDRESS}::P2PLending::offer_loan`,
        type_arguments: [],
        arguments: [
          sanitizedAmount,
          sanitizedRate,
          Buffer.from(token as string).toString('hex'), // Convert token to hex string
          loanDuration
        ],
      };

      metrics.incrementCounter('lending_payload_generated', { token: token as string });

      const duration = timer.end();
      metrics.recordHistogram('api_request_duration', duration, { endpoint: 'lending', type: 'payload' });

      return NextResponse.json({ 
        payload,
        message: 'Sign this transaction to create loan offer',
        requestId,
        metadata: {
          estimatedFee: '0.001',
          gasLimit: '2000'
        }
      });
    }

    // Submit signed transaction with retry logic
    try {
      const txn = await ErrorRecovery.withRetry(async () => {
        return await ErrorRecovery.withTimeout(
          async () => await client.submitTransaction(signedTransaction as Types.SubmitTransactionRequest),
          TRANSACTION_TIMEOUT,
          'Transaction submission timed out'
        );
      }, `lending_offer_${Date.now()}`);
      
      const result = await ErrorRecovery.withTimeout(
        async () => await client.waitForTransaction(txn.hash),
        TRANSACTION_TIMEOUT,
        'Transaction confirmation timed out'
      );
      
      // Extract loan ID from transaction hash for now
      // In production, you'd parse events from the transaction result
      const loanId = `loan_${txn.hash.slice(0, 16)}`;

      // Log successful lending offer
      logger.info('Lending offer completed successfully', {
        requestId,
        txId: txn.hash,
        loanId,
        lender: (lenderAddress as string).slice(0, 10) + '...',
        amount: sanitizedAmount,
        token: token as string
      });

      metrics.incrementCounter('lending_offers_completed', { token: token as string, status: 'success' });
      
      const duration = timer.end();
      metrics.recordHistogram('api_request_duration', duration, { endpoint: 'lending', type: 'submit' });

      return NextResponse.json({ 
        success: true, 
        txId: txn.hash,
        loanId,
        result: {
          hash: (result as unknown as Types.UserTransaction).hash,
          success: (result as unknown as Types.UserTransaction).success
        },
        requestId
      });

    } catch (submitError) {
      metrics.incrementCounter('lending_offers_completed', { token: token as string, status: 'failed' });
      
      logger.error('Loan offer submission failed', submitError as Error, {
        requestId,
        lender: (lenderAddress as string).slice(0, 10) + '...',
        amount: sanitizedAmount,
        token: token as string
      });

      throw new BlockchainError(
        'Loan offer submission failed',
        submitError instanceof Error ? submitError.message : 'Unknown blockchain error'
      );
    }

  } catch (error) {
    const duration = timer.end();
    metrics.recordHistogram('api_request_duration', duration, { endpoint: 'lending', status: 'error' });
    metrics.incrementCounter('api_errors_total', { endpoint: 'lending', method: 'POST' });

    return handleApiError(error, requestId, req.nextUrl.pathname);
  }
}

// GET endpoint to fetch available loans
export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const timer = createPerformanceTimer();

  try {
    metrics.incrementCounter('api_calls_total', { endpoint: 'lending', method: 'GET' });

    const { searchParams } = new URL(req.url);
    const lenderAddress = searchParams.get('lender');
    const status = searchParams.get('status') || 'Open';

    if (lenderAddress && !validateAddress(lenderAddress)) {
      throw new ValidationError('Invalid lender address format');
    }

    // Query Move contract for loans
    try {
      const resourceType = `${LENDING_MODULE_ADDRESS}::P2PLending::LoanStore`;
      
      if (lenderAddress) {
        // Get loans for specific lender
        const resource = await client.getAccountResource(lenderAddress, resourceType);
        interface LoanData {
          loans: Array<{
            loan_id: string;
            lender: string;
            borrower: string;
            amount: number;
            interest_rate: number;
            token: string;
            status: number[];
            created_at: number;
          }>;
        }
        const loanData = resource.data as LoanData;
        const loans = loanData.loans || [];
        
        // Filter by status if specified
        const filteredLoans = status ? loans.filter(loan => 
          Buffer.from(loan.status).toString() === status
        ) : loans;

        const duration = timer.end();
        metrics.recordHistogram('api_request_duration', duration, { endpoint: 'lending', type: 'query' });
        
        return NextResponse.json({ 
          loans: filteredLoans,
          count: filteredLoans.length,
          requestId
        });
      } else {
        // This would require a more complex query across multiple accounts
        // For now, return empty array and suggest using lender address
        const duration = timer.end();
        metrics.recordHistogram('api_request_duration', duration, { endpoint: 'lending', type: 'query' });

        return NextResponse.json({ 
          loans: [],
          count: 0,
          message: 'Please provide lender address to fetch loans',
          requestId
        });
      }
    } catch (queryError) {
      logger.error('Loan query error', queryError as Error, { requestId, lenderAddress });
      throw new BlockchainError(
        'Failed to fetch loans',
        queryError instanceof Error ? queryError.message : 'Unknown error'
      );
    }

  } catch (error) {
    const duration = timer.end();
    metrics.recordHistogram('api_request_duration', duration, { endpoint: 'lending', status: 'error' });
    metrics.incrementCounter('api_errors_total', { endpoint: 'lending', method: 'GET' });

    return handleApiError(error, requestId, req.nextUrl.pathname);
  }
}
