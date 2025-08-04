'use client';
import { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, DollarSign, Award, Copy, Star, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatAddress, formatNumber, copyToClipboard } from '@/lib/utils';

interface Trader {
  id: string;
  address: string;
  name: string;
  avatar: string;
  roi: number;
  totalVolume: number;
  trades: number;
  winRate: number;
  followers: number;
  isFollowing: boolean;
  recentTrades: Trade[];
  performance: PerformanceData[];
}

interface Trade {
  id: string;
  type: 'buy' | 'sell';
  token: string;
  amount: number;
  price: number;
  timestamp: string;
  pnl: number;
}

interface PerformanceData {
  date: string;
  pnl: number;
  volume: number;
}

export default function Social() {
  const { account } = useWallet();
  const [traders, setTraders] = useState<Trader[]>([]);
  const [selectedTrader, setSelectedTrader] = useState<Trader | null>(null);
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [copyStatus, setCopyStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTradersData();
  }, []);

  const loadTradersData = async () => {
    setLoading(true);
    try {
      // Simulate real data - replace with actual API calls
      const mockTraders: Trader[] = [
        {
          id: '1',
          address: '0xd94bf3d07017ae0d44b90f4a62fa8a39c681a38d10125503f4bf7168b9602f9c',
          name: 'CryptoWhale',
          avatar: '🐋',
          roi: 247.5,
          totalVolume: 1250000,
          trades: 342,
          winRate: 78.5,
          followers: 1205,
          isFollowing: false,
          recentTrades: [
            {
              id: '1',
              type: 'buy',
              token: 'APT',
              amount: 1000,
              price: 8.45,
              timestamp: new Date().toISOString(),
              pnl: 450
            }
          ],
          performance: [
            { date: '2024-01', pnl: 15000, volume: 125000 },
            { date: '2024-02', pnl: 23000, volume: 145000 },
          ]
        },
        {
          id: '2',
          address: '0x2af1b7a8c4f1c8e3d9f0b2c5a6e7f8d9c0b1a2e3f4d5c6b7a8e9f0d1c2b3a4e5',
          name: 'DeFiMaster',
          avatar: '⚡',
          roi: 189.3,
          totalVolume: 890000,
          trades: 256,
          winRate: 73.2,
          followers: 856,
          isFollowing: true,
          recentTrades: [
            {
              id: '2',
              type: 'sell',
              token: 'USDC',
              amount: 5000,
              price: 1.00,
              timestamp: new Date().toISOString(),
              pnl: 320
            }
          ],
          performance: [
            { date: '2024-01', pnl: 12000, volume: 89000 },
            { date: '2024-02', pnl: 18000, volume: 95000 },
          ]
        },
        {
          id: '3',
          address: '0x3bf2c8d5e6f7a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4',
          name: 'YieldHunter',
          avatar: '🎯',
          roi: 156.7,
          totalVolume: 675000,
          trades: 189,
          winRate: 69.8,
          followers: 542,
          isFollowing: false,
          recentTrades: [],
          performance: []
        }
      ];
      
      setTraders(mockTraders);
    } catch (error) {
      console.error('Failed to load traders data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (traderId: string) => {
    if (!account) {
      setCopyStatus('Please connect your wallet to follow traders');
      return;
    }

    try {
      // Simulate follow/unfollow API call
      setTraders(prev => prev.map(trader => 
        trader.id === traderId 
          ? { 
              ...trader, 
              isFollowing: !trader.isFollowing,
              followers: trader.isFollowing ? trader.followers - 1 : trader.followers + 1
            }
          : trader
      ));
      
      const trader = traders.find(t => t.id === traderId);
      setCopyStatus(`${trader?.isFollowing ? 'Unfollowed' : 'Following'} ${trader?.name}`);
      setTimeout(() => setCopyStatus(''), 3000);
    } catch (error) {
      console.error('Failed to follow trader:', error);
      setCopyStatus('Failed to follow trader');
    }
  };

  const handleCopyTrade = async (trader: Trader) => {
    if (!account) {
      setCopyStatus('Please connect your wallet to copy trades');
      return;
    }

    try {
      // Simulate copy trading - in real implementation, this would:
      // 1. Check available balance
      // 2. Set up automatic trade copying
      // 3. Execute immediate copy of recent trades
      setCopyStatus(`Copy trading enabled for ${trader.name}`);
      setSelectedTrader(trader);
      setTimeout(() => setCopyStatus(''), 5000);
    } catch (error) {
      console.error('Failed to copy trade:', error);
      setCopyStatus('Failed to enable copy trading');
    }
  };

  const stats = [
    {
      label: 'Total Traders',
      value: traders.length,
      icon: Users,
      change: '+12%'
    },
    {
      label: 'Total Volume',
      value: formatNumber(traders.reduce((sum, t) => sum + t.totalVolume, 0)),
      icon: DollarSign,
      change: '+24%'
    },
    {
      label: 'Avg ROI',
      value: `${(traders.reduce((sum, t) => sum + t.roi, 0) / traders.length).toFixed(1)}%`,
      icon: TrendingUp,
      change: '+8%'
    },
    {
      label: 'Top Performer',
      value: traders.length > 0 ? traders[0]?.name : 'N/A',
      icon: Award,
      change: `${traders.length > 0 ? traders[0]?.roi : 0}%`
    }
  ];

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Social Trading</h1>
            <p className="text-gray-600 mt-2">Follow and copy trades from top performers</p>
          </div>
          <Button variant="outline" size="sm">
            <ExternalLink className="h-4 w-4 mr-2" />
            View Rankings
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                    <div className="p-3 bg-black/5 rounded-full">
                      <stat.icon className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="flex items-center mt-4">
                    <Badge variant="secondary" className="text-xs">
                      {stat.change}
                    </Badge>
                    <span className="text-xs text-gray-500 ml-2">vs last month</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Status Message */}
        {copyStatus && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-lg mb-6 ${
              copyStatus.includes('Failed') || copyStatus.includes('connect') 
                ? 'bg-red-50 text-red-700 border border-red-200' 
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}
          >
            {copyStatus}
          </motion.div>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="following">Following</TabsTrigger>
            <TabsTrigger value="portfolio">My Portfolio</TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard" className="space-y-6">
            <div className="grid gap-6">
              {traders.map((trader, index) => (
                <motion.div
                  key={trader.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="text-2xl">{trader.avatar}</div>
                          <div>
                            <h3 className="font-semibold flex items-center">
                              {trader.name}
                              {index < 3 && <Star className="h-4 w-4 ml-2 text-yellow-500 fill-current" />}
                            </h3>
                            <p className="text-sm text-gray-600 flex items-center">
                              {formatAddress(trader.address)}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="ml-2 h-auto p-1"
                                onClick={() => copyToClipboard(trader.address)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-6">
                          <div className="text-center">
                            <p className="text-sm text-gray-600">ROI</p>
                            <p className="font-bold text-green-600">+{trader.roi}%</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-gray-600">Trades</p>
                            <p className="font-semibold">{trader.trades}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-gray-600">Win Rate</p>
                            <p className="font-semibold">{trader.winRate}%</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-gray-600">Followers</p>
                            <p className="font-semibold">{trader.followers}</p>
                          </div>
                          
                          <div className="flex space-x-2">
                            <Button
                              variant={trader.isFollowing ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleFollow(trader.id)}
                            >
                              {trader.isFollowing ? 'Following' : 'Follow'}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleCopyTrade(trader)}
                              disabled={!account}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="following">
            <Card>
              <CardHeader>
                <CardTitle>Following</CardTitle>
                <CardDescription>Traders you are currently following</CardDescription>
              </CardHeader>
              <CardContent>
                {traders.filter(t => t.isFollowing).length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    You are not following any traders yet. Start by following top performers!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {traders.filter(t => t.isFollowing).map(trader => (
                      <div key={trader.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="text-xl">{trader.avatar}</span>
                          <div>
                            <p className="font-medium">{trader.name}</p>
                            <p className="text-sm text-gray-600">ROI: +{trader.roi}%</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFollow(trader.id)}
                        >
                          Unfollow
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="portfolio">
            <Card>
              <CardHeader>
                <CardTitle>Copy Trading Portfolio</CardTitle>
                <CardDescription>Your copy trading performance and active copies</CardDescription>
              </CardHeader>
              <CardContent>
                {!account ? (
                  <p className="text-center text-gray-500 py-8">
                    Connect your wallet to view your copy trading portfolio
                  </p>
                ) : selectedTrader ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h3 className="font-semibold text-green-800">Active Copy Trading</h3>
                      <p className="text-green-700">Copying trades from {selectedTrader.name}</p>
                      <div className="mt-2 flex space-x-4 text-sm">
                        <span>ROI: +{selectedTrader.roi}%</span>
                        <span>Win Rate: {selectedTrader.winRate}%</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    No active copy trading positions. Start by copying a trader!
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}