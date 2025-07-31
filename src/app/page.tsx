'use client';
import { useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import axios from 'axios';
import { motion } from 'framer-motion';

export default function Home() {
  const { connect, disconnect, account, wallets } = useWallet();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState('USDC');
  const [txStatus, setTxStatus] = useState('');
  const [feePrediction, setFeePrediction] = useState('');
  const [isFraud, setIsFraud] = useState(false);

  const handleConnect = async () => {
    if (wallets.length === 0) {
      setTxStatus('No wallets available');
      return;
    }
    try {
      await connect(wallets[0].name); // Connect to Petra Wallet
    } catch (error) {
      setTxStatus('Wallet connection failed');
    }
  };

  const handleTransfer = async () => {
    try {
      // Convert address object to hex string if needed
      let senderAddress = account?.address;
      if (typeof senderAddress === 'object' && senderAddress.data && Array.isArray(senderAddress.data)) {
        senderAddress = '0x' + senderAddress.data.map((byte: number) => byte.toString(16).padStart(2, '0')).join('');
      }

      const response = await axios.post('/api/transfer', {
        senderAddress,
        recipientAddress: recipient,
        amount: parseFloat(amount),
        token,
      });
      setTxStatus(`Transaction successful: ${response.data.txId}`);
      
      // Check for fraud
      const fraudResponse = await axios.get('/api/predict', {
        params: { type: 'fraud', data: JSON.stringify([0.01, 500, 600]) },
      });
      setIsFraud(fraudResponse.data.isSuspicious);
    } catch (error) {
      setTxStatus('Transaction failed');
    }
  };

  const fetchFeePrediction = async () => {
    try {
      const response = await axios.get('/api/predict', {
        params: { type: 'fee', data: JSON.stringify([0.01, 500, 600]) },
      });
      setFeePrediction(`Optimal fee: $${response.data.optimalFee.toFixed(4)}`);
    } catch (error) {
      setFeePrediction('Prediction failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <motion.div
        className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl font-bold mb-4 text-center">Aptos Remittance Dashboard</h1>
        
        {/* Wallet Connection */}
        <div className="mb-4">
          {account ? (
            <div>
              <p className="text-green-600">Connected: {typeof account.address === 'string' ? account.address : '0x...'}</p>
              <button
                className="mt-2 w-full bg-red-500 text-white p-2 rounded hover:bg-red-600"
                onClick={disconnect}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
              onClick={handleConnect}
            >
              Connect Wallet
            </button>
          )}
        </div>
        
        {/* Transfer Form */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Recipient Address"
            className="w-full p-2 mb-2 border rounded"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
          <input
            type="number"
            placeholder="Amount"
            className="w-full p-2 mb-2 border rounded"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <select
            className="w-full p-2 mb-2 border rounded"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          >
            <option value="USDC">USDC</option>
            <option value="USDT">USDT</option>
          </select>
          <button
            className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600"
            onClick={handleTransfer}
            disabled={!account || !recipient || !amount}
          >
            Send
          </button>
        </div>
        
        {/* AI Insights */}
        <div className="mb-4">
          <button
            className="w-full bg-purple-500 text-white p-2 rounded hover:bg-purple-600"
            onClick={fetchFeePrediction}
          >
            Get Fee Prediction
          </button>
          <p className="mt-2">{feePrediction}</p>
          {isFraud && <p className="text-red-600 mt-2">Warning: Suspicious transaction detected!</p>}
        </div>
        
        {/* Transaction Status */}
        {txStatus && <p className="text-center">{txStatus}</p>}
      </motion.div>
    </div>
  );
}