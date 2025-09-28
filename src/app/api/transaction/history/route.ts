import { NextResponse } from 'next/server';
import { AptosClient } from 'aptos';

const APTOS_NODE_URL = process.env.APTOS_NODE_URL || 'https://fullnode.testnet.aptoslabs.com/v1';
const client = new AptosClient(APTOS_NODE_URL);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const limit = parseInt(searchParams.get('limit') || '25');
    
    if (!address) {
      return NextResponse.json({ error: 'Address parameter required' }, { status: 400 });
    }

    // Validate address format
    if (!address.startsWith('0x') || address.length !== 66) {
      return NextResponse.json({ error: 'Invalid address format' }, { status: 400 });
    }

    try {
      // Get account transactions
      const transactions = await client.getAccountTransactions(address, { limit });
      
      const formattedTransactions = transactions.map((tx: Record<string, unknown>) => {
        // Extract transaction details
        const payload = tx.payload as { function?: string; arguments?: string[] };
        const timestamp = parseInt(tx.timestamp as string);
        
        let type = 'Unknown';
        let amount = '0';
        
        if (payload && payload.function) {
          if (payload.function.includes('transfer')) {
            type = 'Transfer';
            amount = payload.arguments && payload.arguments[1] ? 
              (parseInt(payload.arguments[1]) / 1_000_000).toString() : '0';
          } else if (payload.function.includes('stake')) {
            type = 'Staking';
            amount = payload.arguments && payload.arguments[0] ? 
              (parseInt(payload.arguments[0]) / 1_000_000).toString() : '0';
          } else if (payload.function.includes('coin')) {
            type = 'Coin Operation';
            amount = payload.arguments && payload.arguments[0] ? 
              (parseInt(payload.arguments[0]) / 1_000_000).toString() : '0';
          }
        }
        
        return {
          hash: tx.hash,
          type,
          amount,
          timestamp,
          status: (tx.success as boolean) ? 'success' : 'failed',
          gas_used: tx.gas_used,
          vm_status: tx.vm_status
        };
      });
      
      return NextResponse.json({
        address,
        transactions: formattedTransactions,
        count: formattedTransactions.length,
        status: 'success'
      });
      
    } catch (error) {
      if ((error as Error).message.includes('account_not_found')) {
        return NextResponse.json({
          address,
          transactions: [],
          count: 0,
          status: 'no_account',
          message: 'Account not found or has no transactions'
        });
      }
      throw error;
    }
    
  } catch (error) {
    console.error('Transaction history fetch failed:', error);
    return NextResponse.json({
      error: 'Failed to fetch transaction history',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { address, limit = 25 } = body;
    
    if (!address) {
      return NextResponse.json({ error: 'Address parameter required' }, { status: 400 });
    }

    // Validate address format
    if (!address.startsWith('0x') || address.length !== 66) {
      return NextResponse.json({ error: 'Invalid address format' }, { status: 400 });
    }

    try {
      // Get account transactions
      const transactions = await client.getAccountTransactions(address, { limit });
      
      const formattedTransactions = transactions.map((tx: Record<string, unknown>) => {
        // Extract transaction details
        const payload = tx.payload as { function?: string; arguments?: string[] };
        const timestamp = parseInt(tx.timestamp as string);
        
        let type = 'Unknown';
        let amount = '0';
        
        if (payload && payload.function) {
          if (payload.function.includes('transfer')) {
            type = 'Transfer';
            amount = payload.arguments && payload.arguments[1] ? 
              (parseInt(payload.arguments[1]) / 1_000_000).toString() : '0';
          } else if (payload.function.includes('stake')) {
            type = 'Staking';
            amount = payload.arguments && payload.arguments[0] ? 
              (parseInt(payload.arguments[0]) / 1_000_000).toString() : '0';
          } else if (payload.function.includes('coin')) {
            type = 'Coin Operation';
            amount = payload.arguments && payload.arguments[0] ? 
              (parseInt(payload.arguments[0]) / 1_000_000).toString() : '0';
          }
        }
        
        return {
          hash: tx.hash,
          type,
          amount,
          timestamp,
          status: (tx.success as boolean) ? 'success' : 'failed',
          gas_used: tx.gas_used,
          vm_status: tx.vm_status
        };
      });
      
      return NextResponse.json({
        address,
        transactions: formattedTransactions,
        count: formattedTransactions.length,
        status: 'success'
      });
      
    } catch (error) {
      if ((error as Error).message.includes('account_not_found')) {
        return NextResponse.json({
          address,
          transactions: [],
          count: 0,
          status: 'no_account',
          message: 'Account not found or has no transactions'
        });
      }
      throw error;
    }
    
  } catch (error) {
    console.error('Transaction history fetch failed:', error);
    return NextResponse.json({
      error: 'Failed to fetch transaction history',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
