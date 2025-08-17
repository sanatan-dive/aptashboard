'use client';
import { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Wallet, 
  TrendingUp, 
  Shield, 
  Loader2,
  Zap,
  ArrowUpDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatAddress } from '@/lib/utils';
import GlowButton from '@/components/ui/glow-button';
import Hero from '@/components/Hero';

interface TransferData {
  senderAddress: string;
  recipientAddress: string;
  amount: number;
  token: string;
}

interface FraudPrediction {
  isSuspicious: boolean;
  riskLevel: string;
  confidence: number;
  timestamp: string;
}

interface FeePrediction {
  optimalFee: number;
  confidence: number;
  recommendation: string;
  timestamp: string;
}

export default function Home() {
  const { account, signAndSubmitTransaction, connected } = useWallet();
  const [transferData, setTransferData] = useState<TransferData>({
    senderAddress: '',
    recipientAddress: '',
    amount: 0,
    token: 'APT'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [fraudPrediction, setFraudPrediction] = useState<FraudPrediction | null>(null);
  const [feePrediction, setFeePrediction] = useState<FeePrediction | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error' | 'warning', message: string} | null>(null);

  useEffect(() => {
    if (account?.address) {
      setTransferData(prev => ({
        ...prev,
        senderAddress: account.address.toString()
      }));
    }
  }, [account]);

  const showNotification = (type: 'success' | 'error' | 'warning', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleFraudCheck = async () => {
    if (!transferData.amount || !transferData.recipientAddress) return;

    try {
      const response = await axios.post('/api/predict', {
        type: 'fraud',
        data: [0.01, transferData.amount, Date.now() % (24 * 60)]
      });
      setFraudPrediction(response.data);
    } catch (error) {
      console.error('Fraud check failed:', error);
    }
  };

  const handleFeeOptimization = async () => {
    if (!transferData.amount) return;

    try {
      const response = await axios.post('/api/predict', {
        type: 'fee',
        data: [0.01, transferData.amount, Date.now() % (24 * 60)]
      });
      setFeePrediction(response.data);
    } catch (error) {
      console.error('Fee optimization failed:', error);
    }
  };

  const handleTransfer = async () => {
    if (!account || !transferData.recipientAddress || !transferData.amount) {
      showNotification('error', 'Please fill in all fields and connect your wallet');
      return;
    }

    if (!connected) {
      showNotification('error', 'Wallet not connected. Please connect your wallet first.');
      return;
    }

    setIsLoading(true);
    try {
      // Ensure sender address is a string
      const senderAddress = typeof account.address === 'string' 
        ? account.address 
        : account.address?.toString() || '';

      console.log('Starting transfer:', {
        sender: senderAddress,
        recipient: transferData.recipientAddress,
        amount: transferData.amount,
        token: transferData.token
      });

      // Get the transaction payload from API
      const response = await axios.post('/api/transfer', {
        senderAddress: senderAddress,
        recipientAddress: transferData.recipientAddress,
        amount: transferData.amount,
        token: transferData.token
      });
      
      console.log('API Response:', response.data);
      
      if (response.data.payload) {
        console.log('Got payload, signing transaction...');
        
        // Sign and submit transaction using wallet
        try {
          // Format the payload for the wallet adapter - needs to be wrapped in 'data'
          const transactionData = {
            data: {
              function: response.data.payload.function,
              functionArguments: response.data.payload.arguments,
              typeArguments: response.data.payload.type_arguments,
            }
          };
          
          console.log('Transaction data to sign:', transactionData);
          
          // Use the correct wallet adapter format
          const result = await signAndSubmitTransaction(transactionData);
          
          console.log('Transaction result:', result);
          
          // Verify transaction success - check for hash property
          if (result && result.hash) {
            console.log('Transaction successful with hash:', result.hash);
            showNotification('success', `Transfer successful! Transaction: ${result.hash}`);
            
            // Clear form after successful transfer
            setTransferData({
              senderAddress: senderAddress,
              recipientAddress: '',
              amount: 1,
              token: 'APT'
            });
            
            console.log('Transfer completed:', {
              hash: result.hash,
              sender: senderAddress,
              recipient: transferData.recipientAddress,
              amount: transferData.amount
            });
          } else {
            console.error('No transaction hash returned:', result);
            throw new Error('Transaction failed - no hash returned');
          }
        } catch (walletError) {
          console.error('Wallet transaction error details:', walletError);
          
          // More specific error handling
          if (walletError instanceof Error) {
            if (walletError.message.includes('User rejected') || walletError.message.includes('cancelled')) {
              throw new Error('Transaction cancelled by user');
            } else if (walletError.message.includes('Insufficient')) {
              throw new Error('Insufficient balance for transaction');
            } else if (walletError.message.includes('Network') || walletError.message.includes('network')) {
              throw new Error('Network error - check wallet network settings');
            } else if (walletError.message.includes('not connected')) {
              throw new Error('Wallet not connected - please connect your wallet');
            } else if (walletError.message.includes("'in' operator")) {
              throw new Error('Wallet integration error - trying alternative method');
            } else {
              throw new Error(`Wallet error: ${walletError.message}`);
            }
          } else {
            throw new Error('Unknown wallet error - check wallet connection and network');
          }
        }
      } else {
        console.error('No payload in response:', response.data);
        throw new Error('Failed to get transaction payload from API');
      }
    } catch (error: unknown) {
      console.error('Transfer error details:', error);
      if (axios.isAxiosError(error)) {
        console.error('API Error response:', error.response?.data);
        showNotification('error', `API Error: ${error.response?.data?.message || error.message}`);
      } else {
        showNotification('error', error instanceof Error ? error.message : 'Transfer failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof TransferData, value: string | number) => {
    setTransferData(prev => ({ ...prev, [field]: value }));
    
    // Auto-run fraud check and fee optimization when amount changes
    if (field === 'amount' && typeof value === 'number' && value > 0) {
      setTimeout(() => {
        handleFraudCheck();
        handleFeeOptimization();
      }, 500);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, #1A1A18 1px, transparent 1px),
              linear-gradient(to bottom, #1A1A18 1px, transparent 1px)
            `,
            backgroundSize: "120px 120px",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 70% at 50% 50%, #000 60%, transparent 100%)",
            maskImage:
              "radial-gradient(ellipse 70% 70% at 50% 50%, #000 60%, transparent 100%)",
          }}
        />
        
        {/* Glowing orbs */}
        <div className="absolute top-20 left-20 w-96 h-96 rounded-full bg-white opacity-5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-white opacity-5 blur-[120px] pointer-events-none" />
      </div>

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 right-4 z-50 p-4 rounded-xl border backdrop-blur-md ${
              notification.type === 'success' ? 'bg-green-500/20 border-green-500/30 text-green-300' :
              notification.type === 'error' ? 'bg-red-500/20 border-red-500/30 text-red-300' :
              'bg-yellow-500/20 border-yellow-500/30 text-yellow-300'
            }`}
          >
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <Hero />

      {/* Transfer Section */}
      <motion.div
        id="transfer-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
        className="relative z-10 container mx-auto px-6 py-20"
      >
        <div className="text-center mb-16">
          <motion.div variants={itemVariants} className="mb-8 flex justify-center items-center gap-4">
            
            <GlowButton>
              
              Secure Transfers
            </GlowButton>
          </motion.div>
          
          <motion.h2 variants={itemVariants} className="text-4xl md:text-6xl satoshi-medium mb-6">
            Send APT with
            <span className="block bg-gradient-to-r from-white via-gray-300 to-white bg-clip-text text-transparent">
              AI-Powered Security
            </span>
          </motion.h2>
          
          <motion.p variants={itemVariants} className="text-xl text-stone-400 max-w-2xl mx-auto">
            Experience lightning-fast transfers with real-time fraud detection and fee optimization
          </motion.p>
        </div>

        {account ? (
          <motion.div variants={itemVariants} className="max-w-2xl mx-auto">
            <Card className="bg-gradient-to-b from-stone-900/50 to-black/50 backdrop-blur-md border-stone-700/50 shadow-2xl">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl text-white flex items-center justify-center gap-2">
                  <ArrowUpDown className="w-6 h-6" />
                  Transfer APT
                </CardTitle>
                <CardDescription className="text-stone-400">
                  Connected as {formatAddress(account.address.toString())}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Recipient Address */}
                <div className="space-y-2">
                  <Label className="text-stone-300">Recipient Address</Label>
                  <Input
                    value={transferData.recipientAddress}
                    onChange={(e) => handleInputChange('recipientAddress', e.target.value)}
                    placeholder="0x..."
                    className="bg-stone-800/50 border-stone-600 text-white placeholder:text-stone-500 focus:border-white focus:ring-1 focus:ring-white"
                  />
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label className="text-stone-300">Amount</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={transferData.amount || ''}
                      onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="bg-stone-800/50 border-stone-600 text-white placeholder:text-stone-500 focus:border-white focus:ring-1 focus:ring-white pr-16"
                    />
                    <Badge className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-white text-black">
                      APT
                    </Badge>
                  </div>
                </div>

                {/* AI Predictions */}
                <AnimatePresence>
                  {(fraudPrediction || feePrediction) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      {fraudPrediction && (
                        <div className={`p-4 rounded-lg border backdrop-blur-md ${
                          fraudPrediction.isSuspicious 
                            ? 'bg-red-500/20 border-red-500/30' 
                            : 'bg-green-500/20 border-green-500/30'
                        }`}>
                          <div className="flex items-center gap-2 mb-2">
                            <Shield className="w-4 h-4" />
                            <span className="text-sm satoshi-medium">Security Check</span>
                          </div>
                          <div className="text-xs text-stone-300">
                            Risk Level: <span className="capitalize">{fraudPrediction.riskLevel}</span>
                          </div>
                          <div className="text-xs text-stone-400">
                            Confidence: {(fraudPrediction.confidence * 100).toFixed(1)}%
                          </div>
                        </div>
                      )}
                      
                      {feePrediction && (
                        <div className="p-4 rounded-lg border bg-blue-500/20 border-blue-500/30 backdrop-blur-md">
                          <div className="flex items-center gap-2 mb-2">
                            <Zap className="w-4 h-4" />
                            <span className="text-sm satoshi-medium">Fee Optimization</span>
                          </div>
                          <div className="text-xs text-stone-300">
                            Optimal Fee: {feePrediction.optimalFee.toFixed(4)} APT
                          </div>
                          <div className="text-xs text-stone-400">
                            {feePrediction.recommendation}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Transfer Button */}
                <Button
                  onClick={handleTransfer}
                  disabled={isLoading || !transferData.recipientAddress || !transferData.amount}
                  className="w-full bg-white text-black hover:bg-gray-200 satoshi-medium py-6 text-lg rounded-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing Transfer...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Send {transferData.amount || 0} APT
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div variants={itemVariants} className="text-center max-w-lg mx-auto">
            <div className="p-12 rounded-2xl bg-gradient-to-b from-stone-900/50 to-black/50 backdrop-blur-md border border-stone-700/50">
              <Wallet className="w-16 h-16 mx-auto mb-6 text-stone-400" />
              <h3 className="text-2xl satoshi-medium mb-4">Connect Your Wallet</h3>
              <p className="text-stone-400 mb-8">
                Connect your Aptos wallet to start making secure transfers with AI-powered protection
              </p>
              <Button className="bg-white text-black hover:bg-gray-200 satoshi-medium px-8 py-3 rounded-xl">
                Connect Wallet
              </Button>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Features Section */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={containerVariants}
        className="relative z-10 container mx-auto px-6 py-20"
      >
        <motion.div variants={itemVariants} className="text-center mb-16">
          <h3 className="text-3xl md:text-5xl satoshi-medium mb-6">
            Why Choose Aptash?
          </h3>
          <p className="text-xl text-stone-400 max-w-2xl mx-auto">
            Advanced features powered by cutting-edge AI and blockchain technology
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: Shield,
              title: "AI Security",
              description: "Real-time fraud detection and risk assessment for every transaction"
            },
            {
              icon: Zap,
              title: "Fee Optimization",
              description: "Smart fee prediction to minimize costs and maximize speed"
            },
            {
              icon: TrendingUp,
              title: "Analytics",
              description: "Comprehensive insights and performance tracking for your portfolio"
            }
          ].map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              whileHover={{ y: -10, scale: 1.02 }}
              className="p-8 rounded-2xl bg-gradient-to-b from-stone-900/30 to-black/30 backdrop-blur-md border border-stone-700/30 hover:border-stone-500/50 transition-all duration-300"
            >
              <feature.icon className="w-12 h-12 mb-6 text-white" />
              <h4 className="text-xl satoshi-medium mb-4">{feature.title}</h4>
              <p className="text-stone-400">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}