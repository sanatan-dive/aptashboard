import { NextResponse } from 'next/server';
import { AptosClient } from 'aptos';

const APTOS_NODE_URL = process.env.APTOS_NODE_URL || 'https://fullnode.testnet.aptoslabs.com/v1';
const client = new AptosClient(APTOS_NODE_URL);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    
    if (!address) {
      return NextResponse.json({ error: 'Address parameter required' }, { status: 400 });
    }

    // Validate address format
    if (!address.startsWith('0x') || address.length !== 66) {
      return NextResponse.json({ error: 'Invalid address format' }, { status: 400 });
    }

    try {
      // Get APT balance
      const resource = await client.getAccountResource(
        address,
        '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>'
      );
      
      const balance = (resource.data as { coin: { value: string } }).coin.value;
      const balanceInAPT = parseInt(balance) / 1_000_000;
      
      return NextResponse.json({
        address,
        balance: {
          octas: balance,
          apt: balanceInAPT
        },
        hasBalance: balanceInAPT > 0,
        status: 'success'
      });
      
    } catch (error) {
      if ((error as Error).message.includes('resource_not_found')) {
        return NextResponse.json({
          address,
          balance: {
            octas: '0',
            apt: 0
          },
          hasBalance: false,
          status: 'no_balance',
          message: 'Account has no APT tokens. Please fund from faucet.',
          faucetUrl: 'https://aptoslabs.com/testnet-faucet'
        });
      }
      throw error;
    }
    
  } catch (error) {
    console.error('Balance check failed:', error);
    return NextResponse.json({
      error: 'Failed to check balance',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
