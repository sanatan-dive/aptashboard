'use client';
import { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { motion } from 'framer-motion';
import { 
  User, Wallet, Activity, TrendingUp, Settings, Copy, 
  ExternalLink, DollarSign, PieChart, BarChart3, Clock 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatAddress, formatAmount, formatTimestamp, copyToClipboard } from '@/lib/utils';

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
  const [activeTab, setActiveTab] = useState('overview');
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

  const handleUpdatePreferences = async (newPreferences: Partial<UserPreferences>) => {
    if (!profile) return;
    
    try {
      // Simulate API call to update preferences
      setProfile({
        ...profile,
        preferences: { ...profile.preferences, ...newPreferences }
      });
      setCopyStatus('Preferences updated successfully');
      setTimeout(() => setCopyStatus(''), 3000);
    } catch (error) {
      console.error('Failed to update preferences:', error);
      setCopyStatus('Failed to update preferences');
    }
  };

  if (!account) {
    return (
      <div className="container mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center py-20"
        >
          <User className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h1 className="text-2xl font-bold mb-2">Profile</h1>
          <p className="text-gray-600 mb-6">Connect your wallet to view your profile</p>
          <Button onClick={() => window.location.href = '/'}>
            Connect Wallet
          </Button>
        </motion.div>
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
    <div className="container mx-auto p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Profile</h1>
            <p className="text-gray-600 mt-2">Manage your account and preferences</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline" size="sm" onClick={disconnect}>
              Disconnect
            </Button>
          </div>
        </div>

        {/* Status Message */}
        {copyStatus && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg mb-6 bg-green-50 text-green-700 border border-green-200"
          >
            {copyStatus}
          </motion.div>
        )}

        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-black/5 rounded-full">
                  <Wallet className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Wallet Address</h2>
                  <div className="flex items-center space-x-2">
                    <p className="text-gray-600 font-mono">
                      {formatAddress(account.address?.toString(), 12)}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyAddress}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`https://explorer.aptoslabs.com/account/${account.address?.toString()}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total Balance</p>
                <p className="text-2xl font-bold">{formatAmount(profile?.balance || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Your latest transactions and trades</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {profile?.recentActivity.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-full ${
                            activity.type === 'transfer' ? 'bg-blue-100' :
                            activity.type === 'trade' ? 'bg-green-100' :
                            activity.type === 'lending' ? 'bg-yellow-100' : 'bg-purple-100'
                          }`}>
                            {activity.type === 'transfer' && <DollarSign className="h-4 w-4" />}
                            {activity.type === 'trade' && <TrendingUp className="h-4 w-4" />}
                            {activity.type === 'lending' && <PieChart className="h-4 w-4" />}
                            {activity.type === 'social' && <User className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{activity.description}</p>
                            <p className="text-xs text-gray-600">{formatTimestamp(activity.timestamp)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatAmount(activity.amount)}</p>
                          <Badge 
                            variant={activity.status === 'completed' ? 'default' : 
                                   activity.status === 'pending' ? 'secondary' : 'destructive'}
                            className="text-xs"
                          >
                            {activity.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Preferences</CardTitle>
                  <CardDescription>Customize your trading experience</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Notifications</p>
                      <p className="text-sm text-gray-600">Receive trading alerts</p>
                    </div>
                    <Button
                      variant={profile?.preferences.notifications ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleUpdatePreferences({ 
                        notifications: !profile?.preferences.notifications 
                      })}
                    >
                      {profile?.preferences.notifications ? 'On' : 'Off'}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Auto Compound</p>
                      <p className="text-sm text-gray-600">Automatically reinvest rewards</p>
                    </div>
                    <Button
                      variant={profile?.preferences.autoCompound ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleUpdatePreferences({ 
                        autoCompound: !profile?.preferences.autoCompound 
                      })}
                    >
                      {profile?.preferences.autoCompound ? 'On' : 'Off'}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Risk Level</p>
                      <p className="text-sm text-gray-600">Trading risk tolerance</p>
                    </div>
                    <Badge variant="secondary">
                      {profile?.preferences.riskLevel || 'Medium'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Slippage Tolerance</p>
                      <p className="text-sm text-gray-600">Maximum price impact</p>
                    </div>
                    <Badge variant="outline">
                      {profile?.preferences.slippageTolerance}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="portfolio">
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Holdings</CardTitle>
                <CardDescription>Your current token holdings and performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {profile?.portfolio.map((item) => (
                    <div key={item.token} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-black/5 rounded-full">
                          <span className="font-bold text-sm">{item.token}</span>
                        </div>
                        <div>
                          <p className="font-medium">{item.token}</p>
                          <p className="text-sm text-gray-600">{formatAmount(item.amount)} tokens</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatAmount(item.value)}</p>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={item.change24h >= 0 ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {item.change24h >= 0 ? '+' : ''}{item.change24h}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>Complete history of your account activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {profile?.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-full ${
                          activity.type === 'transfer' ? 'bg-blue-100' :
                          activity.type === 'trade' ? 'bg-green-100' :
                          activity.type === 'lending' ? 'bg-yellow-100' : 'bg-purple-100'
                        }`}>
                          <Clock className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{activity.description}</p>
                          <p className="text-sm text-gray-600">{formatTimestamp(activity.timestamp)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatAmount(activity.amount)}</p>
                        <Badge 
                          variant={activity.status === 'completed' ? 'default' : 
                                 activity.status === 'pending' ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          {activity.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}