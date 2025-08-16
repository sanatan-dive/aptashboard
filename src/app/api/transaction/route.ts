import { NextResponse } from 'next/server';
import { AptosClient } from 'aptos';

const APTOS_NODE_URL = process.env.APTOS_NODE_URL || 'https://fullnode.testnet.aptoslabs.com/v1';
const client = new AptosClient(APTOS_NODE_URL);

export async function POST(request: Request) {
  try {
    const { txHash } = await request.json();
    
    if (!txHash) {
      return NextResponse.json({ error: 'Transaction hash required' }, { status: 400 });
    }

    // Get transaction details
    const transaction = await client.getTransactionByHash(txHash);
    
    return NextResponse.json({
      transaction,
      success: true
    });
    
  } catch (error) {
    console.error('Transaction check failed:', error);
    return NextResponse.json({
      error: 'Failed to check transaction',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
