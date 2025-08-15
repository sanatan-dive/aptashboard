'use client';
import { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { motion } from 'framer-motion';
import { 
  User, Wallet, Activity, TrendingUp, Settings, Copy, 
  ExternalLink, PieChart, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { formatAddress, formatAmount, copyToClipboard } from '@/lib/utils';

interface UserProfile {
  address: string;
  balance: number;
  totalVolume: number;
  totalTrades: number;
  winRate: number;
  portfolio: PortfolioItem[];
  recentActivity: ActivityItem[];
  preferences: UserPreferences;
}

interface PortfolioItem {
  token: string;
  amount: number;
  value: number;
  change24h: number;
}

interface ActivityItem {
  id: string;
  type: 'transfer' | 'trade' | 'lending' | 'social';
  description: string;
  amount: number;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
}

interface UserPreferences {
  notifications: boolean;
  autoCompound: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  slippageTolerance: number;
}

export default function Profile() {
  const { account, disconnect } = useWallet();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [copyStatus, setCopyStatus] = useState('');

  useEffect(() => {
    const loadProfileData = async () => {
      setLoading(true);
      try {
        // Simulate loading user profile data
        const mockProfile: UserProfile = {
          address: account?.address?.toString() || '',
          balance: 2450.75,
          totalVolume: 125000,
          totalTrades: 89,
          winRate: 73.2,
          portfolio: [
            { token: 'APT', amount: 150.5, value: 1275.23, change24h: 5.2 },
            { token: 'USDC', amount: 850.0, value: 850.0, change24h: 0.1 },
            { token: 'BTC', amount: 0.05, value: 2100.0, change24h: -2.1 },
            { token: 'ETH', amount: 1.2, value: 3840.0, change24h: 3.8 }
          ],
          recentActivity: [
            {
              id: '1',
              type: 'transfer',
              description: 'Sent 50 APT to 0x123...abc',
              amount: 50,
              timestamp: new Date(Date.now() - 3600000).toISOString(),
              status: 'completed'
            },
            {
              id: '2',
              type: 'trade',
              description: 'Copied trade from CryptoWhale',
              amount: 100,
              timestamp: new Date(Date.now() - 7200000).toISOString(),
              status: 'completed'
            },
            {
              id: '3',
              type: 'lending',
              description: 'Lent 500 USDC at 8% APY',
              amount: 500,
              timestamp: new Date(Date.now() - 14400000).toISOString(),
              status: 'pending'
            }
          ],
          preferences: {
            notifications: true,
            autoCompound: false,
            riskLevel: 'medium',
            slippageTolerance: 1.0
          }
        };
        
        setProfile(mockProfile);
      } catch (error) {
        console.error('Failed to load profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (account) {
      loadProfileData();
    } else {
      setLoading(false);
    }
  }, [account]);

  const handleCopyAddress = () => {
    if (account?.address) {
      const addressString = account.address.toString();
      copyToClipboard(addressString);
      setCopyStatus('Address copied to clipboard');
      setTimeout(() => setCopyStatus(''), 3000);
    }
  };

  if (!account) {
    return (
      <div className="min-h-screen bg-black text-white relative overflow-hidden">
        {/* Grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center py-20"
          >
            <div className="relative mb-8">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto">
                <User className="h-10 w-10 text-black" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-white/20 to-transparent rounded-2xl blur opacity-75"></div>
            </div>
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white via-gray-300 to-white bg-clip-text text-transparent">
              Profile
            </h1>
            <p className="text-xl text-stone-400 mb-8">Connect your wallet to view your profile</p>
            <Button onClick={() => window.location.href = '/'} className="bg-white text-black hover:bg-gray-200 font-medium px-8 py-3">
              Connect Wallet
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const totalPortfolioValue = profile?.portfolio.reduce((sum, item) => sum + item.value, 0) || 0;

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center space-x-4 mb-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center">
                    <User className="w-8 h-8 text-black" />
                  </div>
                  <div className="absolute -inset-1 bg-gradient-to-r from-white/20 to-transparent rounded-2xl blur opacity-75"></div>
                </div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-gray-300 to-white bg-clip-text text-transparent">
                  Profile
                </h1>
              </div>
              <p className="text-xl text-stone-400 leading-relaxed">Manage your account and preferences</p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" size="sm" className="border-stone-600 text-stone-300 hover:text-white hover:border-white">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" size="sm" onClick={disconnect} className="border-stone-600 text-stone-300 hover:text-white hover:border-white">
                Disconnect
              </Button>
            </div>
          </div>

          {/* Status Message */}
          {copyStatus && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-lg mb-6 bg-green-500/20 text-green-400 border border-green-500/30 backdrop-blur"
            >
              {copyStatus}
            </motion.div>
          )}

          {/* Profile Header */}
          <Card className="mb-8 border border-stone-800/50 shadow-2xl bg-gradient-to-br from-stone-900/50 to-black/50 backdrop-blur">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="p-4 bg-white/10 rounded-full">
                    <Wallet className="h-10 w-10 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-white mb-2">Wallet Address</h2>
                    <div className="flex items-center space-x-3">
                      <p className="text-stone-300 font-mono text-lg">
                        {formatAddress(account.address?.toString() || '')}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyAddress}
                        className="text-stone-400 hover:text-white"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`https://explorer.aptoslabs.com/account/${account.address?.toString()}`, '_blank')}
                        className="text-stone-400 hover:text-white"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-stone-400 mb-1">Total Balance</p>
                  <p className="text-3xl font-bold text-white">{formatAmount(profile?.balance || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            {[
              {
                label: 'Portfolio Value',
                value: formatAmount(totalPortfolioValue),
                icon: PieChart,
                change: '+12.5%'
              },
              {
                label: 'Total Volume',
                value: formatAmount(profile?.totalVolume || 0),
                icon: BarChart3,
                change: '+24.3%'
              },
              {
                label: 'Total Trades',
                value: profile?.totalTrades.toString() || '0',
                icon: Activity,
                change: '+8 this week'
              },
              {
                label: 'Win Rate',
                value: `${profile?.winRate || 0}%`,
                icon: TrendingUp,
                change: '+2.1%'
              }
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="border border-stone-800/50 shadow-2xl bg-gradient-to-br from-stone-900/50 to-black/50 backdrop-blur">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-stone-400">{stat.label}</p>
                        <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
                      </div>
                      <div className="p-3 bg-white/10 rounded-full">
                        <stat.icon className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="flex items-center mt-4">
                      <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-400 border border-green-500/30">
                        {stat.change}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Main Content - Tabs will be added next */}
        </motion.div>
      </div>
    </div>
  );
}