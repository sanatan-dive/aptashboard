'use client';
import { useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  Send, 
  Wallet, 
  TrendingUp, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  Loader2,
  Copy,
  Zap,
  DollarSign,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, formatAddress } from '@/lib/utils';

export default function Home() {
  const { connect, disconnect, account, wallets } = useWallet();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState('APT');
  const [txStatus, setTxStatus] = useState('');
  const [feePrediction, setFeePrediction] = useState('');
  const [isFraud, setIsFraud] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastTxId, setLastTxId] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleConnect = async () => {
    if (wallets.length === 0) {
      setTxStatus('No wallets available. Please install Petra Wallet.');
      return;
    }
    try {
      setIsLoading(true);
      await connect(wallets[0].name);
      setTxStatus('Wallet connected successfully!');
    } catch {
      setTxStatus('Wallet connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!account?.address) {
      setTxStatus('Please connect wallet first');
      return;
    }

    if (!recipient || !amount) {
      setTxStatus('Please fill in all required fields');
      return;
    }

    try {
      setIsLoading(true);
      setTxStatus('Preparing transaction...');
      
      let senderAddress: string = account.address.toString();
      if (typeof account.address === 'object' && 'data' in account.address && Array.isArray(account.address.data)) {
        senderAddress = '0x' + account.address.data.map((byte: number) => 
          byte.toString(16).padStart(2, '0')
        ).join('');
      }

      // Get the transaction payload
      const payloadResponse = await axios.post('/api/transfer', {
        senderAddress,
        recipientAddress: recipient,
        amount: parseFloat(amount),
        token,
      });

      if (payloadResponse.data.payload) {
        setTxStatus('Transaction payload ready. Sign in your wallet to complete.');
        setLastTxId(payloadResponse.data.requestId || '');
      } else if (payloadResponse.data.txId) {
        setTxStatus('Transaction successful!');
        setLastTxId(payloadResponse.data.txId);
      }
      
      // Run fraud detection
      const fraudResponse = await axios.get('/api/predict', {
        params: { 
          type: 'fraud', 
          data: JSON.stringify([parseFloat(amount), 500, 600])
        },
      });
      setIsFraud(fraudResponse.data.prediction > 0.5);
      
    } catch (err) {
      console.error('Transfer error:', err);
      if (axios.isAxiosError(err) && err.response) {
        setTxStatus(`Transaction failed: ${err.response.data.error || 'Unknown error'}`);
      } else {
        setTxStatus('Transaction failed: Network error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFeePrediction = async () => {
    if (!amount) {
      setFeePrediction('Please enter an amount first');
      return;
    }
    
    try {
      setIsLoading(true);
      const response = await axios.post('/api/predict', {
        type: 'fee',
        data: [parseFloat(amount) || 0.01, 500, 600]
      });
      setFeePrediction(`Estimated fee: ${response.data.prediction?.toFixed(6) || '0.001'} APT`);
    } catch {
      setFeePrediction('Fee prediction failed');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="flex items-center justify-center space-x-3">
            <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-5xl font-bold text-black">Send Crypto</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Fast, secure, and intelligent transfers on the Aptos blockchain with AI-powered insights
          </p>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Transfer Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="xl:col-span-2"
          >
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Send className="w-6 h-6" />
                  Transfer Funds
                </CardTitle>
                <CardDescription className="text-base">
                  Send cryptocurrency with real-time fraud detection and fee optimization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Wallet Connection */}
                <div className="space-y-4">
                  {account ? (
                    <motion.div
                      initial={{ scale: 0.95 }}
                      animate={{ scale: 1 }}
                      className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <div>
                          <div className="font-medium text-green-800">Wallet Connected</div>
                          <div className="text-sm text-green-600 font-mono">
                            {formatAddress(account.address.toString())}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(account.address.toString())}
                          className="border-green-300 text-green-700 hover:bg-green-100"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={disconnect}
                          className="border-green-300 text-green-700 hover:bg-green-100"
                        >
                          Disconnect
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <Button
                      onClick={handleConnect}
                      disabled={isLoading}
                      className="w-full h-12 bg-black text-white hover:bg-gray-800 text-lg"
                      size="lg"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <Wallet className="w-5 h-5 mr-2" />
                      )}
                      Connect Wallet
                    </Button>
                  )}
                </div>
                
                {/* Transfer Form */}
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-700">Recipient Address</label>
                    <Input
                      placeholder="0x1234567890abcdef..."
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      className="font-mono text-sm h-12 border-gray-300 focus:border-black"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-gray-700">Amount</label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        min="0"
                        step="0.000001"
                        className="h-12 border-gray-300 focus:border-black"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-gray-700">Token</label>
                      <select
                        className="flex h-12 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-black focus:outline-none"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                      >
                        <option value="APT">APT</option>
                        <option value="USDC">USDC</option>
                        <option value="USDT">USDT</option>
                      </select>
                    </div>
                  </div>

                  {/* Advanced Options */}
                  <div className="space-y-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="text-gray-600 hover:text-black"
                    >
                      {showAdvanced ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                      {showAdvanced ? 'Hide' : 'Show'} Advanced Options
                    </Button>
                    
                    {showAdvanced && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50"
                      >
                        <Button
                          onClick={fetchFeePrediction}
                          disabled={isLoading || !amount}
                          variant="outline"
                          className="w-full"
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <TrendingUp className="w-4 h-4 mr-2" />
                          )}
                          Get AI Fee Estimate
                        </Button>
                        {feePrediction && (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm font-medium text-blue-800">{feePrediction}</p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                  
                  <Button
                    onClick={handleTransfer}
                    disabled={!account || !recipient || !amount || isLoading}
                    className="w-full h-12 bg-black text-white hover:bg-gray-800 text-lg font-semibold"
                    size="lg"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5 mr-2" />
                    )}
                    Send Transaction
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Status and AI Insights Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Security Status Card */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="w-5 h-5" />
                  Security Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isFraud ? (
                  <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-red-800">High-risk transaction</div>
                      <div className="text-sm text-red-600">AI detected suspicious patterns</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-green-800">Transaction appears safe</div>
                      <div className="text-sm text-green-600">No suspicious patterns detected</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Fee Insights Card */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="w-5 h-5" />
                  Fee Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Network Status</span>
                  <span className="text-sm font-medium text-green-600">Optimal</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Estimated Fee</span>
                  <span className="text-sm font-medium">~0.001 APT</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Speed</span>
                  <span className="text-sm font-medium">~2-5 seconds</span>
                </div>
              </CardContent>
            </Card>

            {/* Transaction Status */}
            {txStatus && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Transaction Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={cn(
                    "p-4 rounded-lg text-sm",
                    txStatus.includes('failed') || txStatus.includes('error') 
                      ? "bg-red-50 border border-red-200 text-red-800"
                      : txStatus.includes('successful') || txStatus.includes('ready')
                      ? "bg-green-50 border border-green-200 text-green-800"
                      : "bg-blue-50 border border-blue-200 text-blue-800"
                  )}>
                    <p className="font-medium">{txStatus}</p>
                    {lastTxId && (
                      <div className="mt-3 pt-3 border-t border-current/20">
                        <p className="font-medium mb-2">Transaction ID:</p>
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-xs break-all flex-1">{lastTxId}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(lastTxId)}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}