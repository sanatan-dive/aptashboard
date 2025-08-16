'use client';
import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  UserIcon, WalletIcon, ActivityIcon, TrendingUpIcon, SettingsIcon, 
  CopyIcon, ExternalLinkIcon, PieChartIcon, BarChartIcon
} from '@/components/ui/icons';

import { formatAddress, formatAmount, copyToClipboard } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface Transaction {
  hash: string;
  type: string;
  amount: string;
  timestamp: number;
  status: string;
}

interface PortfolioItem {
  name: string;
  value: number;
  change: number;
}

interface WalletData {
  balance: string;
  transactionCount: number;
  totalValue: string;
  stakingRewards: string;
  nftCount: number;
  totalVolume: number;
  totalTrades: number;
  winRate: number;
  portfolio: PortfolioItem[];
}

export default function ProfilePage() {
  const { connected, account, disconnect } = useWallet();
  const [copyStatus, setCopyStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletData, setWalletData] = useState<WalletData>({
    balance: '0',
    transactionCount: 0,
    totalValue: '0.00',
    stakingRewards: '0.00',
    nftCount: 0,
    totalVolume: 0,
    totalTrades: 0,
    winRate: 0,
    portfolio: []
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);

  const fetchWalletData = useCallback(async () => {
    if (!connected || !account?.address) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch wallet balance using GET method
      const balanceResponse = await fetch(`/api/balance?address=${account.address.toString()}`);
      
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        const balance = balanceData.balance?.apt || 0;
        
        setWalletData(prev => ({
          ...prev,
          balance: balance.toString(),
          totalValue: balance.toString(),
          portfolio: [
            { name: 'APT', value: balance, change: 2.5 },
            { name: 'Staking Rewards', value: parseFloat(prev.stakingRewards), change: 5.1 }
          ]
        }));
      } else {
        console.error('Balance API error:', balanceResponse.status);
      }

      // Fetch transaction history using GET method
      const historyResponse = await fetch(`/api/transaction/history?address=${account.address.toString()}&limit=10`);
      
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        if (historyData.transactions) {
          const transactions = historyData.transactions as Transaction[];
          setRecentTransactions(transactions.slice(0, 5));
          setWalletData(prev => ({
            ...prev,
            transactionCount: transactions.length,
            totalTrades: transactions.length,
            totalVolume: transactions.reduce((sum: number, tx: Transaction) => 
              sum + parseFloat(tx.amount || '0'), 0),
            winRate: Math.floor(Math.random() * 30) + 70 // Mock win rate for now
          }));
        }
      } else {
        console.error('Transaction history API error:', historyResponse.status);
        // Don't set error for transaction history as it's not critical
      }
    } catch (err) {
      console.error('Error fetching wallet data:', err);
      setError('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  }, [connected, account?.address]);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);
  
  const handleCopyAddress = () => {
    if (account?.address) {
      copyToClipboard(account.address.toString());
      setCopyStatus('Address copied to clipboard');
      setTimeout(() => setCopyStatus(''), 3000);
    }
  };

  if (!connected || !account) {
    return (
      <div className="min-h-screen bg-black text-white relative overflow-hidden">
        {/* Grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
        
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-6"
          >
            <div className="relative">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto">
                <UserIcon className="h-10 w-10 text-black" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-white/20 to-transparent rounded-2xl blur opacity-75"></div>
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-white via-gray-300 to-white bg-clip-text text-transparent">
              Connect Your Wallet
            </h2>
            <p className="text-stone-400 text-lg">Please connect your wallet to view your profile</p>
            <Button className="bg-white text-black hover:bg-gray-200 font-medium px-8 py-3">
              Connect Wallet
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  const totalPortfolioValue = walletData.portfolio.reduce((sum, item) => sum + item.value, 0);

  const stats = [
    {
      title: 'Total Volume',
      value: formatAmount(walletData.totalVolume),
      icon: PieChartIcon,
      color: 'text-blue-400',
    },
    {
      title: 'Total Trades',
      value: walletData.totalTrades.toString(),
      icon: BarChartIcon,
      color: 'text-green-400',
    },
    {
      title: 'Activity Score',
      value: `${walletData.transactionCount}`,
      icon: ActivityIcon,
      color: 'text-yellow-400',
    },
    {
      title: 'Win Rate',
      value: `${walletData.winRate}%`,
      icon: TrendingUpIcon,
      color: 'text-purple-400',
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center space-x-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                <UserIcon className="h-10 w-10 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-black"></div>
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur opacity-75"></div>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-gray-300 to-white bg-clip-text text-transparent">
                Profile
              </h1>
              <p className="text-stone-400 text-lg">Manage your wallet and view analytics</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchWalletData}
              disabled={loading}
              className="border-stone-600 text-stone-300 hover:text-white hover:border-white"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-stone-400 border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <ActivityIcon className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={disconnect} 
              className="border-stone-600 text-stone-300 hover:text-white hover:border-white"
            >
              <SettingsIcon className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          </div>
        </motion.div>

        {/* Status Messages */}
        {copyStatus && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 backdrop-blur"
          >
            {copyStatus}
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 backdrop-blur"
          >
            {error}
          </motion.div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Profile Card */}
          <div className="xl:col-span-2 space-y-8">
            {/* Wallet Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border border-stone-800/50 shadow-2xl bg-gradient-to-br from-stone-900/50 to-black/50 backdrop-blur">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-4">
                      <div className="p-4 bg-white/10 rounded-2xl">
                        <WalletIcon className="h-12 w-12 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-semibold text-white">Wallet Overview</h3>
                        <div className="flex items-center space-x-3 mt-2">
                          <p className="text-stone-300 font-mono text-lg">
                            {formatAddress(account.address.toString())}
                          </p>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleCopyAddress}
                            className="text-stone-400 hover:text-white"
                          >
                            <CopyIcon className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => window.open(`https://explorer.aptoslabs.com/account/${account.address.toString()}`, '_blank')}
                            className="text-stone-400 hover:text-white"
                          >
                            <ExternalLinkIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-green-500 text-green-400 bg-green-500/10 px-4 py-2 text-sm">
                      Active
                    </Badge>
                  </div>

                  {/* Balance Display */}
                  <div className="text-center py-8 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl border border-blue-500/20 mb-8">
                    <p className="text-stone-400 mb-2 text-lg">Total Balance</p>
                    <p className="text-5xl font-bold text-white mb-2">
                      {formatAmount(parseFloat(walletData.balance))} APT
                    </p>
                    <p className="text-stone-400 text-lg">≈ ${(parseFloat(walletData.totalValue) * 8.45).toFixed(2)} USD</p>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {stats.map((stat, index) => {
                      const IconComponent = stat.icon;
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + index * 0.1 }}
                          className="p-6 bg-stone-800/30 rounded-xl border border-stone-700/50 hover:border-stone-600/50 transition-all duration-300"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <IconComponent className={`h-6 w-6 ${stat.color}`} />
                          </div>
                          <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                          <p className="text-sm text-stone-400">{stat.title}</p>
                        </motion.div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Recent Transactions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border border-stone-800/50 shadow-2xl bg-gradient-to-br from-stone-900/50 to-black/50 backdrop-blur">
                <CardContent className="p-8">
                  <h4 className="text-2xl font-semibold text-white mb-6">Recent Transactions</h4>
                  {recentTransactions.length > 0 ? (
                    <div className="space-y-4">
                      {recentTransactions.map((tx, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center justify-between p-4 bg-stone-800/30 rounded-xl border border-stone-700/50 hover:border-stone-600/50 transition-all duration-300"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                              <ActivityIcon className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <p className="font-semibold text-white text-lg">{tx.type}</p>
                              <p className="text-stone-400">
                                {new Date(tx.timestamp).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-white text-lg">
                              {formatAmount(parseFloat(tx.amount))} APT
                            </p>
                            <Badge 
                              variant={tx.status === 'success' ? 'default' : 'destructive'} 
                              className={cn(
                                "text-xs",
                                tx.status === 'success' 
                                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                                  : "bg-red-500/20 text-red-400 border-red-500/30"
                              )}
                            >
                              {tx.status}
                            </Badge>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <ActivityIcon className="w-16 h-16 text-stone-600 mx-auto mb-4" />
                      <p className="text-stone-400 text-lg">No recent transactions</p>
                      <p className="text-stone-500 text-sm">Transactions will appear here once you start using your wallet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Portfolio Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="border border-stone-800/50 shadow-2xl bg-gradient-to-br from-stone-900/50 to-black/50 backdrop-blur">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-6">Portfolio Breakdown</h3>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-stone-800/30 rounded-xl">
                      <span className="text-stone-300 font-medium">Total Value</span>
                      <span className="font-bold text-white text-lg">
                        {formatAmount(totalPortfolioValue)} APT
                      </span>
                    </div>
                    {walletData.portfolio.map((item, index) => (
                      <div key={index} className="flex items-center justify-between py-3 border-b border-stone-800 last:border-b-0">
                        <span className="text-stone-400 font-medium">{item.name}</span>
                        <div className="text-right">
                          <p className="font-semibold text-white">{formatAmount(item.value)}</p>
                          <p className={cn(
                            "text-sm font-medium",
                            item.change >= 0 ? 'text-green-400' : 'text-red-400'
                          )}>
                            {item.change >= 0 ? '+' : ''}{item.change}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="border border-stone-800/50 shadow-2xl bg-gradient-to-br from-stone-900/50 to-black/50 backdrop-blur">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-6">Quick Actions</h3>
                  <div className="space-y-4">
                    <Button className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white font-medium py-3">
                      <WalletIcon className="h-5 w-5 mr-3" />
                      Transfer Funds
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start border-stone-600 text-stone-300 hover:text-white hover:border-white py-3"
                    >
                      <TrendingUpIcon className="h-5 w-5 mr-3" />
                      View Analytics
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start border-stone-600 text-stone-300 hover:text-white hover:border-white py-3"
                    >
                      <SettingsIcon className="h-5 w-5 mr-3" />
                      Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
