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
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="flex items-center justify-center space-x-3">
          <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-black">Transaction History</h1>
        </div>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Track all your Aptos blockchain transactions with real-time updates
        </p>
      </motion.div>

      {/* Filters and Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters
              </span>
              <Button
                onClick={() => fetchTransactions(true)}
                disabled={refreshing}
                variant="outline"
                size="sm"
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
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Search Address</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Enter address to filter..."
                    value={filterAddress}
                    onChange={(e) => setFilterAddress(e.target.value)}
                    className="pl-10 font-mono text-sm"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Transaction Type</label>
                <select
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-black focus:outline-none"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as 'all' | 'sent' | 'received')}
                >
                  <option value="all">All Transactions</option>
                  <option value="sent">Sent</option>
                  <option value="received">Received</option>
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
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Transactions ({filteredTransactions.length})</span>
              {account && (
                <div className="text-sm text-gray-600 font-mono">
                  {formatAddress(account.address.toString())}
                </div>
              )}
            </CardTitle>
            <CardDescription>
              Real-time transaction data from the Aptos blockchain
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                <span className="ml-3 text-gray-600">Loading transactions...</span>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
                <p className="text-gray-600">
                  {filterAddress || account?.address 
                    ? "No transactions found for this address" 
                    : "Connect your wallet to view transaction history"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTransactions.map((tx, index) => {
                  const txType = getTransactionType(tx);
                  const amount = formatAmount(tx);
                  
                  return (
                    <motion.div
                      key={tx.hash}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group p-4 border border-gray-200 rounded-xl hover:shadow-md transition-all duration-200 hover:border-gray-300"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            txType === 'sent' ? "bg-red-50 text-red-600" :
                            txType === 'received' ? "bg-green-50 text-green-600" :
                            "bg-gray-50 text-gray-600"
                          )}>
                            {txType === 'sent' ? (
                              <ArrowUpRight className="w-5 h-5" />
                            ) : txType === 'received' ? (
                              <ArrowDownLeft className="w-5 h-5" />
                            ) : (
                              <DollarSign className="w-5 h-5" />
                            )}
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium capitalize">
                                {txType === 'sent' ? 'Sent' : txType === 'received' ? 'Received' : 'Transaction'}
                              </span>
                              <span className={cn(
                                "px-2 py-1 text-xs rounded-full",
                                tx.success 
                                  ? "bg-green-100 text-green-800" 
                                  : "bg-red-100 text-red-800"
                              )}>
                                {tx.success ? 'Success' : 'Failed'}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <div>Hash: <span className="font-mono">{formatAddress(tx.hash)}</span></div>
                              <div>Version: {tx.version}</div>
                              {tx.timestamp && (
                                <div>Time: {formatTimestamp(tx.timestamp)}</div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right space-y-1">
                          {amount !== 'N/A' && (
                            <div className="font-mono text-lg font-medium">
                              {amount} APT
                            </div>
                          )}
                          <div className="text-sm text-gray-600">
                            Gas: {parseInt(tx.gas_used) / 1000}k
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`https://explorer.aptoslabs.com/txn/${tx.hash}`, '_blank')}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            View
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
  );
}