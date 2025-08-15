'use client';
import { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Plus,
  Search,
  TrendingUp,
  Clock,
  Users,
  Target,
  Percent
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatAddress, formatAmount } from '@/lib/utils';

interface LoanOffer {
  id: string;
  lender: string;
  amount: number;
  interestRate: number;
  duration: number; // in days
  collateralRatio: number;
  token: string;
  status: 'active' | 'funded' | 'completed';
  createdAt: Date;
  minCredit?: number;
}

interface LoanRequest {
  id: string;
  borrower: string;
  amount: number;
  maxInterestRate: number;
  duration: number;
  collateralAmount: number;
  token: string;
  purpose: string;
  status: 'active' | 'funded' | 'repaid';
  createdAt: Date;
}

interface MyLoan {
  id: string;
  type: 'lent' | 'borrowed';
  counterparty: string;
  amount: number;
  interestRate: number;
  duration: number;
  daysRemaining: number;
  token: string;
  status: 'active' | 'completed' | 'overdue';
}

export default function Lending() {
  const { account } = useWallet();
  const [loanOffers, setLoanOffers] = useState<LoanOffer[]>([]);
  const [loanRequests, setLoanRequests] = useState<LoanRequest[]>([]);
  const [myLoans, setMyLoans] = useState<MyLoan[]>([]);
  const [activeTab, setActiveTab] = useState('offers');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState<'offer' | 'request'>('offer');
  const [statusMessage, setStatusMessage] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    amount: '',
    interestRate: '',
    duration: '',
    collateralRatio: '',
    token: 'APT',
    purpose: ''
  });

  useEffect(() => {
    loadLendingData();
  }, []);

  const loadLendingData = async () => {
    setLoading(true);
    try {
      // Simulate loading data - replace with real API calls
      const mockOffers: LoanOffer[] = [
        {
          id: '1',
          lender: '0x1234567890abcdef1234567890abcdef12345678',
          amount: 1000,
          interestRate: 8.5,
          duration: 30,
          collateralRatio: 150,
          token: 'APT',
          status: 'active',
          createdAt: new Date('2024-01-10'),
          minCredit: 700
        },
        {
          id: '2',
          lender: '0xabcdef1234567890abcdef1234567890abcdef12',
          amount: 500,
          interestRate: 12.0,
          duration: 14,
          collateralRatio: 200,
          token: 'USDC',
          status: 'active',
          createdAt: new Date('2024-01-09')
        },
        {
          id: '3',
          lender: '0x9876543210fedcba9876543210fedcba98765432',
          amount: 2500,
          interestRate: 6.8,
          duration: 90,
          collateralRatio: 120,
          token: 'APT',
          status: 'funded',
          createdAt: new Date('2024-01-08')
        }
      ];

      const mockRequests: LoanRequest[] = [
        {
          id: '1',
          borrower: '0xfedcba9876543210fedcba9876543210fedcba98',
          amount: 750,
          maxInterestRate: 10.0,
          duration: 45,
          collateralAmount: 1200,
          token: 'APT',
          purpose: 'Business expansion',
          status: 'active',
          createdAt: new Date('2024-01-12')
        },
        {
          id: '2',
          borrower: '0x5555555555555555555555555555555555555555',
          amount: 300,
          maxInterestRate: 15.0,
          duration: 21,
          collateralAmount: 500,
          token: 'USDC',
          purpose: 'Personal loan',
          status: 'active',
          createdAt: new Date('2024-01-11')
        }
      ];

      const mockMyLoans: MyLoan[] = account ? [
        {
          id: '1',
          type: 'lent',
          counterparty: '0xabc123def456ghi789jkl012mno345pqr678stu9',
          amount: 500,
          interestRate: 8.5,
          duration: 30,
          daysRemaining: 15,
          token: 'APT',
          status: 'active'
        },
        {
          id: '2',
          type: 'borrowed',
          counterparty: '0xdef456ghi789jkl012mno345pqr678stu9abc123',
          amount: 200,
          interestRate: 12.0,
          duration: 14,
          daysRemaining: 7,
          token: 'USDC',
          status: 'active'
        }
      ] : [];

      setLoanOffers(mockOffers);
      setLoanRequests(mockRequests);
      setMyLoans(mockMyLoans);
    } catch (error) {
      console.error('Failed to load lending data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLoan = async () => {
    if (!account) {
      setStatusMessage('Please connect your wallet to create loans');
      return;
    }

    try {
      // Simulate creating loan offer/request
      const newLoan = {
        id: Date.now().toString(),
        amount: parseFloat(formData.amount),
        interestRate: parseFloat(formData.interestRate),
        duration: parseInt(formData.duration),
        token: formData.token,
        status: 'active' as const,
        createdAt: new Date()
      };

      if (createType === 'offer') {
        const offer: LoanOffer = {
          ...newLoan,
          lender: account.address.toString(),
          collateralRatio: parseFloat(formData.collateralRatio)
        };
        setLoanOffers(prev => [offer, ...prev]);
        setStatusMessage('Loan offer created successfully!');
      } else {
        const request: LoanRequest = {
          ...newLoan,
          borrower: account.address.toString(),
          maxInterestRate: parseFloat(formData.interestRate),
          collateralAmount: parseFloat(formData.collateralRatio),
          purpose: formData.purpose
        };
        setLoanRequests(prev => [request, ...prev]);
        setStatusMessage('Loan request created successfully!');
      }

      setShowCreateModal(false);
      setFormData({
        amount: '',
        interestRate: '',
        duration: '',
        collateralRatio: '',
        token: 'APT',
        purpose: ''
      });
      setTimeout(() => setStatusMessage(''), 5000);
    } catch (error) {
      console.error('Failed to create loan:', error);
      setStatusMessage('Failed to create loan');
    }
  };

  const handleAcceptOffer = async (offerId: string) => {
    if (!account) {
      setStatusMessage('Please connect your wallet to accept offers');
      return;
    }

    try {
      // Simulate accepting loan offer
      setLoanOffers(prev => prev.map(offer => 
        offer.id === offerId ? { ...offer, status: 'funded' } : offer
      ));
      setStatusMessage('Loan offer accepted successfully!');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error) {
      console.error('Failed to accept offer:', error);
      setStatusMessage('Failed to accept offer');
    }
  };

  const stats = [
    {
      label: 'Total Pool Size',
      value: formatAmount(loanOffers.reduce((sum, offer) => sum + (offer.status === 'active' ? offer.amount : 0), 0)),
      icon: DollarSign,
      change: '+15%'
    },
    {
      label: 'Average APY',
      value: `${(loanOffers.reduce((sum, offer) => sum + offer.interestRate, 0) / loanOffers.length || 0).toFixed(1)}%`,
      icon: Percent,
      change: '+2.3%'
    },
    {
      label: 'Active Loans',
      value: (loanOffers.filter(o => o.status === 'funded').length + loanRequests.filter(r => r.status === 'funded').length).toString(),
      icon: Target,
      change: '+8'
    },
    {
      label: 'Total Lenders',
      value: new Set(loanOffers.map(o => o.lender)).size.toString(),
      icon: Users,
      change: '+12'
    }
  ];

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse border border-stone-800/50 bg-stone-900/50">
              <CardContent className="p-6">
                <div className="h-4 bg-stone-700/50 rounded mb-2"></div>
                <div className="h-8 bg-stone-700/50 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

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
                    <DollarSign className="w-8 h-8 text-black" />
                  </div>
                  <div className="absolute -inset-1 bg-gradient-to-r from-white/20 to-transparent rounded-2xl blur opacity-75"></div>
                </div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-gray-300 to-white bg-clip-text text-transparent">
                  P2P Lending
                </h1>
              </div>
              <p className="text-xl text-stone-400 leading-relaxed">Decentralized peer-to-peer lending protocol</p>
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={() => {
                  setCreateType('offer');
                  setShowCreateModal(true);
                }}
                className="flex items-center bg-white text-black hover:bg-gray-200 font-medium"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Offer
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setCreateType('request');
                  setShowCreateModal(true);
                }}
                className="flex items-center border-stone-600 text-stone-300 hover:text-white hover:border-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Request Loan
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            {stats.map((stat, index) => (
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
                      <span className="text-xs text-stone-500 ml-2">vs last month</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Status Message */}
          {statusMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-lg mb-6 backdrop-blur border ${
                statusMessage.includes('Failed') || statusMessage.includes('connect') 
                  ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                  : 'bg-green-500/20 text-green-400 border-green-500/30'
              }`}
            >
              {statusMessage}
            </motion.div>
          )}

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-stone-900/50 border border-stone-800/50">
              <TabsTrigger value="offers" className="data-[state=active]:bg-white data-[state=active]:text-black">Loan Offers</TabsTrigger>
              <TabsTrigger value="requests" className="data-[state=active]:bg-white data-[state=active]:text-black">Loan Requests</TabsTrigger>
              <TabsTrigger value="myloans" className="data-[state=active]:bg-white data-[state=active]:text-black">My Loans</TabsTrigger>
            </TabsList>

          <TabsContent value="offers" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Available Loan Offers</h2>
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-stone-400" />
                <Input 
                  placeholder="Search offers..." 
                  className="w-64 bg-stone-900/50 border-stone-800/50 text-white placeholder:text-stone-500"
                />
              </div>
            </div>
            <div className="grid gap-6">
              {loanOffers.map((offer, index) => (
                <motion.div
                  key={offer.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="border border-stone-800/50 shadow-2xl bg-gradient-to-br from-stone-900/50 to-black/50 backdrop-blur hover:border-stone-700/50 transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="p-3 bg-green-500/20 rounded-full border border-green-500/30">
                            <DollarSign className="h-6 w-6 text-green-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">{formatAmount(offer.amount)} {offer.token}</h3>
                            <p className="text-sm text-stone-400">
                              by {formatAddress(offer.lender)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-6">
                          <div className="text-center">
                            <p className="text-sm text-stone-500">APY</p>
                            <p className="font-bold text-green-400">{offer.interestRate}%</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-stone-500">Duration</p>
                            <p className="font-semibold text-white">{offer.duration} days</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-stone-500">Collateral</p>
                            <p className="font-semibold text-white">{offer.collateralRatio}%</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-stone-500">Status</p>
                            <Badge 
                              variant={offer.status === 'active' ? 'default' : 
                                     offer.status === 'funded' ? 'secondary' : 'outline'}
                              className={`${
                                offer.status === 'active' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                offer.status === 'funded' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                'bg-stone-500/20 text-stone-400 border-stone-500/30'
                              }`}
                            >
                              {offer.status}
                            </Badge>
                          </div>
                          
                          <Button
                            size="sm"
                            onClick={() => handleAcceptOffer(offer.id)}
                            disabled={!account || offer.status !== 'active'}
                            className="bg-white text-black hover:bg-gray-200 disabled:bg-stone-600 disabled:text-stone-400"
                          >
                            {offer.status === 'active' ? 'Accept' : 'Funded'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="requests" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Loan Requests</h2>
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-stone-400" />
                <Input 
                  placeholder="Search requests..." 
                  className="w-64 bg-stone-900/50 border-stone-800/50 text-white placeholder:text-stone-500"
                />
              </div>
            </div>
            <div className="grid gap-6">
              {loanRequests.map((request, index) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="border border-stone-800/50 shadow-2xl bg-gradient-to-br from-stone-900/50 to-black/50 backdrop-blur hover:border-stone-700/50 transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="p-3 bg-blue-500/20 rounded-full border border-blue-500/30">
                            <TrendingUp className="h-6 w-6 text-blue-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">{formatAmount(request.amount)} {request.token} Needed</h3>
                            <p className="text-sm text-stone-400">
                              by {formatAddress(request.borrower)}
                            </p>
                            <p className="text-sm text-stone-500">{request.purpose}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-6">
                          <div className="text-center">
                            <p className="text-sm text-stone-500">Max APY</p>
                            <p className="font-bold text-blue-400">{request.maxInterestRate}%</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-stone-500">Duration</p>
                            <p className="font-semibold text-white">{request.duration} days</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-stone-500">Collateral</p>
                            <p className="font-semibold text-white">{formatAmount(request.collateralAmount)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-stone-500">Status</p>
                            <Badge 
                              variant={request.status === 'active' ? 'default' : 
                                     request.status === 'funded' ? 'secondary' : 'outline'}
                              className={`${
                                request.status === 'active' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                request.status === 'funded' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                'bg-stone-500/20 text-stone-400 border-stone-500/30'
                              }`}
                            >
                              {request.status}
                            </Badge>
                          </div>
                          
                          <Button
                            size="sm"
                            disabled={!account || request.status !== 'active'}
                            className="bg-white text-black hover:bg-gray-200 disabled:bg-stone-600 disabled:text-stone-400"
                          >
                            {request.status === 'active' ? 'Fund' : 'Funded'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="myloans">
            <Card className="border border-stone-800/50 shadow-2xl bg-gradient-to-br from-stone-900/50 to-black/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">My Loans</CardTitle>
                <CardDescription className="text-stone-400">Your active lending and borrowing positions</CardDescription>
              </CardHeader>
              <CardContent>
                {!account ? (
                  <p className="text-center text-stone-500 py-8">
                    Connect your wallet to view your loans
                  </p>
                ) : myLoans.length === 0 ? (
                  <p className="text-center text-stone-500 py-8">
                    No active loans. Start by creating an offer or accepting a request!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {myLoans.map(loan => (
                      <div key={loan.id} className="flex items-center justify-between p-4 border border-stone-700/50 rounded-lg bg-stone-900/30">
                        <div className="flex items-center space-x-4">
                          <div className={`p-2 rounded-full ${
                            loan.type === 'lent' ? 'bg-green-500/20 border border-green-500/30' : 'bg-blue-500/20 border border-blue-500/30'
                          }`}>
                            {loan.type === 'lent' ? 
                              <TrendingUp className="h-4 w-4 text-green-400" /> :
                              <Clock className="h-4 w-4 text-blue-400" />
                            }
                          </div>
                          <div>
                            <p className="font-medium text-white">
                              {loan.type === 'lent' ? 'Lent' : 'Borrowed'} {formatAmount(loan.amount)} {loan.token}
                            </p>
                            <p className="text-sm text-stone-400">
                              {loan.type === 'lent' ? 'to' : 'from'} {formatAddress(loan.counterparty)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-white">{loan.interestRate}% APY</p>
                          <p className="text-sm text-stone-400">{loan.daysRemaining} days remaining</p>
                          <Badge 
                            variant={loan.status === 'active' ? 'default' : 
                                   loan.status === 'completed' ? 'secondary' : 'destructive'}
                            className={`text-xs mt-1 ${
                              loan.status === 'active' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                              loan.status === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                              'bg-red-500/20 text-red-400 border-red-500/30'
                            }`}
                          >
                            {loan.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Loan Modal */}
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gradient-to-br from-stone-900 to-black border border-stone-800/50 p-6 rounded-2xl w-full max-w-md backdrop-blur"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-4 text-white">
                Create Loan {createType === 'offer' ? 'Offer' : 'Request'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-stone-300">Amount</label>
                  <Input
                    type="number"
                    placeholder="1000"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="bg-stone-900/50 border-stone-800/50 text-white placeholder:text-stone-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-stone-300">
                    {createType === 'offer' ? 'Interest Rate (APY)' : 'Max Interest Rate (APY)'}
                  </label>
                  <Input
                    type="number"
                    placeholder="8.5"
                    value={formData.interestRate}
                    onChange={(e) => setFormData(prev => ({ ...prev, interestRate: e.target.value }))}
                    className="bg-stone-900/50 border-stone-800/50 text-white placeholder:text-stone-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-stone-300">Duration (days)</label>
                  <Input
                    type="number"
                    placeholder="30"
                    value={formData.duration}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                    className="bg-stone-900/50 border-stone-800/50 text-white placeholder:text-stone-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-stone-300">
                    {createType === 'offer' ? 'Collateral Ratio (%)' : 'Collateral Amount'}
                  </label>
                  <Input
                    type="number"
                    placeholder={createType === 'offer' ? '150' : '1500'}
                    value={formData.collateralRatio}
                    onChange={(e) => setFormData(prev => ({ ...prev, collateralRatio: e.target.value }))}
                    className="bg-stone-900/50 border-stone-800/50 text-white placeholder:text-stone-500"
                  />
                </div>
                
                {createType === 'request' && (
                  <div>
                    <label className="block text-sm font-medium mb-1 text-stone-300">Purpose</label>
                    <Input
                      placeholder="Business expansion, personal loan, etc."
                      value={formData.purpose}
                      onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                      className="bg-stone-900/50 border-stone-800/50 text-white placeholder:text-stone-500"
                    />
                  </div>
                )}
                
                <div className="flex space-x-2 pt-4">
                  <Button
                    onClick={handleCreateLoan}
                    className="flex-1 bg-white text-black hover:bg-gray-200"
                    disabled={!formData.amount || !formData.interestRate || !formData.duration}
                  >
                    Create {createType === 'offer' ? 'Offer' : 'Request'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                    className="border-stone-600 text-stone-300 hover:text-white hover:border-white"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
        </motion.div>
      </div>
    </div>
  );
}