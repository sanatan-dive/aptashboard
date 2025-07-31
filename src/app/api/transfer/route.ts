import { AptosClient, Types } from 'aptos';

const client = new AptosClient('https://fullnode.testnet.aptoslabs.com/v1');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { senderAddress, recipientAddress, amount, token } = body;

    if (!senderAddress || !recipientAddress || !amount || !token) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Simulate transaction payload (you can later sign and send with Aptos SDK)
    const payload: Types.TransactionPayload = {
      type: 'entry_function_payload',
      function: '0x1::coin::transfer',
      type_arguments: [token],
      arguments: [recipientAddress, amount],
    };

    // Placeholder: no real blockchain call
    return Response.json({ success: true, txId: 'mock-tx-id', payload });
  } catch (error) {
    console.error('Transfer error:', error);
    return Response.json({ error: 'Transfer failed' }, { status: 500 });
  }
}

// Optional: restrict unsupported methods
export function GET() {
  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}
