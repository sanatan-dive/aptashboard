'use client';
import { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { AptosClient } from 'aptos';
import { motion } from 'framer-motion';
import {
  Clock,
  Search,
  Filter,
  ExternalLink,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  RefreshCw,
  Calendar,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, formatAddress } from '@/lib/utils';

// Use the same client from the environment
const APTOS_NODE_URL = process.env.NEXT_PUBLIC_APTOS_NODE_URL || 'https://fullnode.mainnet.aptoslabs.com/v1';
const client = new AptosClient(APTOS_NODE_URL);

interface Transaction {
  version: string;
  hash: string;
  sender: string;
  success: boolean;
  timestamp: string;
  type: string;
  payload?: {
    function?: string;
    arguments?: string[];
  };
  gas_used: string;
}

export default function History() {
  const { account } = useWallet();
  const [filterAddress, setFilterAddress] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'sent' | 'received'>('all');

  const fetchTransactions = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const address = filterAddress || account?.address?.toString();
      if (!address) {
        setTransactions([]);
        return;
      }

      // Fetch real transaction data from the API
      const response = await fetch(`/api/transfer?address=${address}&limit=50`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
      } else {
        // Fallback to direct blockchain query if API fails
        const directTxs = await client.getAccountTransactions(address, { limit: 50 });
        setTransactions(directTxs as Transaction[]);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (account?.address || filterAddress) {
      fetchTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.address, filterAddress]);

  const filteredTransactions = transactions.filter(tx => {
    if (filterType === 'all') return true;
    const userAddress = account?.address?.toString() || filterAddress;
    if (filterType === 'sent') return tx.sender === userAddress;
    if (filterType === 'received') {
      // Check if user is recipient in the transaction arguments
      return tx.payload?.arguments?.[0] === userAddress && tx.sender !== userAddress;
    }
    return true;
  });

  const getTransactionType = (tx: Transaction) => {
    const userAddress = account?.address?.toString() || filterAddress;
    if (tx.sender === userAddress) return 'sent';
    if (tx.payload?.arguments?.[0] === userAddress) return 'received';
    return 'other';
  };

  const formatAmount = (tx: Transaction) => {
    if (tx.payload?.arguments?.[1]) {
      const amount = parseInt(tx.payload.arguments[1]) / 1_000_000;
      return amount.toFixed(6);
    }
    return 'N/A';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(parseInt(timestamp) / 1000).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6"
        >
          <div className="flex items-center justify-center space-x-4">
            <div className="relative">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center">
                <Clock className="w-8 h-8 text-black" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-white/20 to-transparent rounded-2xl blur opacity-75"></div>
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-gray-300 to-white bg-clip-text text-transparent">
              Transaction History
            </h1>
          </div>
          <p className="text-xl text-stone-400 max-w-3xl mx-auto leading-relaxed">
            Track all your Aptos blockchain transactions with real-time updates and advanced filtering
          </p>
        </motion.div>

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border border-stone-800/50 shadow-2xl bg-gradient-to-br from-stone-900/50 to-black/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-white">
                <span className="flex items-center gap-3">
                  <Filter className="w-5 h-5" />
                  Advanced Filters
                </span>
                <Button
                  onClick={() => fetchTransactions(true)}
                  disabled={refreshing}
                  variant="outline"
                  size="sm"
                  className="border-stone-600 text-stone-300 hover:text-white hover:border-white"
                >
                  {refreshing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Refresh
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-stone-300">Search Address</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <Input
                      placeholder="Enter address to filter..."
                      value={filterAddress}
                      onChange={(e) => setFilterAddress(e.target.value)}
                      className="pl-10 font-mono text-sm bg-stone-900/50 border-stone-700 text-white placeholder:text-stone-500 focus:border-white"
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <label className="text-sm font-medium text-stone-300">Transaction Type</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-stone-700 bg-stone-900/50 px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as 'all' | 'sent' | 'received')}
                  >
                    <option value="all" className="bg-stone-900">All Transactions</option>
                    <option value="sent" className="bg-stone-900">Sent</option>
                    <option value="received" className="bg-stone-900">Received</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Transaction List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border border-stone-800/50 shadow-2xl bg-gradient-to-br from-stone-900/50 to-black/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-white">
                <span>Transactions ({filteredTransactions.length})</span>
                {account && (
                  <div className="text-sm text-stone-400 font-mono bg-stone-800/50 px-3 py-1 rounded-lg">
                    {formatAddress(account.address.toString())}
                  </div>
                )}
              </CardTitle>
              <CardDescription className="text-stone-400">
                Real-time transaction data from the Aptos blockchain
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
                  <span className="ml-3 text-stone-300">Loading transactions...</span>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-16">
                  <Calendar className="w-16 h-16 text-stone-600 mx-auto mb-6" />
                  <h3 className="text-xl font-medium text-white mb-3">No transactions found</h3>
                  <p className="text-stone-400 max-w-md mx-auto">
                    {filterAddress || account?.address 
                      ? "No transactions found for this address" 
                      : "Connect your wallet to view transaction history"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTransactions.map((tx, index) => {
                    const txType = getTransactionType(tx);
                    const amount = formatAmount(tx);
                    
                    return (
                      <motion.div
                        key={tx.hash}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="group p-6 border border-stone-800/50 rounded-xl hover:border-stone-600/50 transition-all duration-300 bg-gradient-to-r from-stone-900/30 to-stone-800/20 backdrop-blur"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={cn(
                              "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
                              txType === 'sent' ? "bg-red-500/20 text-red-400 group-hover:bg-red-500/30" :
                              txType === 'received' ? "bg-green-500/20 text-green-400 group-hover:bg-green-500/30" :
                              "bg-stone-500/20 text-stone-400 group-hover:bg-stone-500/30"
                            )}>
                              {txType === 'sent' ? (
                                <ArrowUpRight className="w-6 h-6" />
                              ) : txType === 'received' ? (
                                <ArrowDownLeft className="w-6 h-6" />
                              ) : (
                                <DollarSign className="w-6 h-6" />
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center space-x-3">
                                <span className="font-semibold text-white capitalize text-lg">
                                  {txType === 'sent' ? 'Sent' : txType === 'received' ? 'Received' : 'Transaction'}
                                </span>
                                <span className={cn(
                                  "px-3 py-1 text-xs rounded-full font-medium",
                                  tx.success 
                                    ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                                )}>
                                  {tx.success ? 'Success' : 'Failed'}
                                </span>
                              </div>
                              <div className="text-sm text-stone-400 space-y-1">
                                <div className="flex items-center space-x-2">
                                  <span>Hash:</span>
                                  <span className="font-mono text-stone-300">{formatAddress(tx.hash)}</span>
                                </div>
                                <div className="flex items-center space-x-4">
                                  <span>Version: {tx.version}</span>
                                  {tx.timestamp && (
                                    <span>Time: {formatTimestamp(tx.timestamp)}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right space-y-2">
                            {amount !== 'N/A' && (
                              <div className="font-mono text-xl font-bold text-white">
                                {amount} APT
                              </div>
                            )}
                            <div className="text-sm text-stone-400">
                              Gas: {parseInt(tx.gas_used) / 1000}k
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(`https://explorer.aptoslabs.com/txn/${tx.hash}`, '_blank')}
                              className="opacity-0 group-hover:opacity-100 transition-all duration-300 text-stone-300 hover:text-white hover:bg-white/10"
                            >
                              <ExternalLink className="w-3 h-3 mr-2" />
                              View on Explorer
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}