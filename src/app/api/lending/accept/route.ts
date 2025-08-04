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
const LENDING_MODULE_ADDRESS = process.env.LENDING_MODULE_ADDRESS || '0x1';
const TRANSACTION_TIMEOUT = Number(process.env.TRANSACTION_TIMEOUT) || 30000;

function validateAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(address);
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const timer = createPerformanceTimer();

  try {
    // Increment API call metrics
    metrics.incrementCounter('api_calls_total', { endpoint: 'lending_accept', method: 'POST' });

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
    const validation = validator.validate(body, apiSchemas.lendingAccept);
    if (!validation.isValid) {
      const errors = Object.entries(validation.errors)
        .map(([field, error]) => `${field}: ${error}`)
        .join(', ');
      throw new ValidationError(`Validation failed: ${errors}`);
    }

    const { borrowerAddress, lenderAddress, loanId, signedTransaction } = validation.sanitizedData!;

    // Validate addresses
    if (!validateAddress(borrowerAddress as string)) {
      throw new ValidationError('Invalid borrower address format');
    }
    if (!validateAddress(lenderAddress as string)) {
      throw new ValidationError('Invalid lender address format');
    }

    // Validate loan ID
    if (!loanId || typeof loanId !== 'string' || (loanId as string).length < 8) {
      throw new ValidationError('Invalid loan ID');
    }

    // Prevent self-lending
    if (borrowerAddress === lenderAddress) {
      throw new ValidationError('Cannot accept your own loan offer');
    }

    // Log the loan acceptance attempt
    logger.info('Loan acceptance request initiated', {
      requestId,
      borrower: (borrowerAddress as string).slice(0, 10) + '...',
      lender: (lenderAddress as string).slice(0, 10) + '...',
      loanId
    });

    // If no signed transaction, return payload for client-side signing
    if (!signedTransaction) {
      const payload: Types.TransactionPayload = {
        type: 'entry_function_payload',
        function: `${LENDING_MODULE_ADDRESS}::P2PLending::accept_loan`,
        type_arguments: [],
        arguments: [
          lenderAddress,
          Buffer.from(loanId as string).toString('hex') // Convert loan ID to hex string
        ],
      };

      metrics.incrementCounter('lending_accept_payload_generated');

      const duration = timer.end();
      metrics.recordHistogram('api_request_duration', duration, { endpoint: 'lending_accept', type: 'payload' });

      return NextResponse.json({ 
        payload,
        message: 'Sign this transaction to accept the loan',
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          async () => await client.submitTransaction(signedTransaction as any),
          TRANSACTION_TIMEOUT,
          'Transaction submission timed out'
        );
      }, `lending_accept_${Date.now()}`);
      
      const result = await ErrorRecovery.withTimeout(
        async () => await client.waitForTransaction(txn.hash),
        TRANSACTION_TIMEOUT,
        'Transaction confirmation timed out'
      );

      // Log successful loan acceptance
      logger.info('Loan acceptance completed successfully', {
        requestId,
        txId: txn.hash,
        borrower: (borrowerAddress as string).slice(0, 10) + '...',
        lender: (lenderAddress as string).slice(0, 10) + '...',
        loanId
      });

      metrics.incrementCounter('lending_accepts_completed', { status: 'success' });
      
      const duration = timer.end();
      metrics.recordHistogram('api_request_duration', duration, { endpoint: 'lending_accept', type: 'submit' });
      
      return NextResponse.json({ 
        success: true, 
        txId: txn.hash,
        loanId,
        message: 'Loan accepted successfully',
        result: {
          hash: (result as unknown as Types.UserTransaction).hash,
          success: (result as unknown as Types.UserTransaction).success
        },
        requestId
      });

    } catch (submitError) {
      metrics.incrementCounter('lending_accepts_completed', { status: 'failed' });
      
      logger.error('Loan acceptance submission failed', submitError as Error, {
        requestId,
        borrower: (borrowerAddress as string).slice(0, 10) + '...',
        lender: (lenderAddress as string).slice(0, 10) + '...',
        loanId
      });

      throw new BlockchainError(
        'Loan acceptance submission failed',
        submitError instanceof Error ? submitError.message : 'Unknown blockchain error'
      );
    }

  } catch (error) {
    const duration = timer.end();
    metrics.recordHistogram('api_request_duration', duration, { endpoint: 'lending_accept', status: 'error' });
    metrics.incrementCounter('api_errors_total', { endpoint: 'lending_accept', method: 'POST' });

    return handleApiError(error, requestId, req.nextUrl.pathname);
  }
}

// GET endpoint to check loan status
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lenderAddress = searchParams.get('lender');
    const loanId = searchParams.get('loanId');

    if (!lenderAddress || !validateAddress(lenderAddress)) {
      return NextResponse.json({ error: 'Valid lender address required' }, { status: 400 });
    }

    if (!loanId) {
      return NextResponse.json({ error: 'Loan ID required' }, { status: 400 });
    }

    try {
      const resourceType = `${LENDING_MODULE_ADDRESS}::P2PLending::LoanStore`;
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
      
      // Find the specific loan
      const loan = loans.find(l => 
        Buffer.from(l.loan_id).toString() === loanId ||
        l.loan_id === loanId
      );

      if (!loan) {
        return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
      }

      return NextResponse.json({ 
        loan: {
          ...loan,
          status: Buffer.from(loan.status).toString()
        }
      });

    } catch (queryError) {
      console.error('Loan status query error:', queryError);
      return NextResponse.json({ 
        error: 'Failed to fetch loan status',
        details: queryError instanceof Error ? queryError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Loan status API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}