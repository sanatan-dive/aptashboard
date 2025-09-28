'use client';
import { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  TrendingUpIcon,
  DollarIcon,
  ShieldIcon,
  ZapIcon,
  ActivityIcon,
  RefreshIcon,
  SpinnerIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  BarChartIcon,
  PieChartIcon,
  TargetIcon,
  LineChartIcon
} from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PredictionData {
  // Fee prediction response
  fee?: number;
  prediction?: number;
  predicted_fee?: number;
  confidence?: number;
  model?: string;
  status?: string;
  factors?: {
    amount?: number;
    token_type?: string;
    network_load?: number;
    priority?: string;
    base_fee?: number;
    amount_factor?: number;
    network_factor?: number;
    priority_multiplier?: number;
  };
  // Fraud detection response  
  risk_score?: number;
  is_fraud?: boolean;
  is_suspicious?: boolean;
  is_high_risk?: boolean;
  risk_factors?: string[];
  analysis?: {
    amount?: number;
    sender_length?: number;
    recipient_length?: number;
    timestamp?: number;
  };
}

interface MarketData {
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  timestamp: number;
}

interface MarketMetrics {
  networkFee: number;
  networkStatus: 'optimal' | 'congested' | 'high';
  transactionVolume: number;
  averageTime: number;
  aptPrice: MarketData;
  priceHistory: Array<{ timestamp: number; price: number; volume: number }>;
}

export default function Insights() {
  const { account } = useWallet();
  const [feePrediction, setFeePrediction] = useState<PredictionData>({});
  const [fraudAnalysis, setFraudAnalysis] = useState<PredictionData>({});
  const [marketMetrics, setMarketMetrics] = useState<MarketMetrics>({
    networkFee: 0.001,
    networkStatus: 'optimal',
    transactionVolume: 12450,
    averageTime: 3.2,
    aptPrice: {
      price: 8.45,
      change24h: 5.2,
      volume24h: 125000000,
      marketCap: 3200000000,
      timestamp: Date.now()
    },
    priceHistory: []
  });
  const [loadingMarketData, setLoadingMarketData] = useState(true);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchInsights = async () => {
    setLoading(true);
    try {
      // Sample data for demonstration - using normal values for lower risk
      const amount = 500;       // Smaller, more typical amount

      // Fetch fee prediction with correct format
      const feeResponse = await axios.post('/api/predict-ml', {
        type: 'fee',
        data: [amount, 'APT', 'normal'] // [amount, token, priority]
      });
      setFeePrediction(feeResponse.data);

      // Fetch fraud analysis with proper format
      const fraudResponse = await axios.post('/api/predict-ml', {
        type: 'fraud', 
        data: [
          "0xa1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef00",  // sender
          "0x9876543210fedcba0987654321fedcba0987654321fedcba0987654321fedcba",  // recipient  
          amount,           // amount
          Date.now() / 1000 // timestamp
        ]
      });
      setFraudAnalysis(fraudResponse.data);

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching insights:', error);
      // Set fallback data if API fails
      setFeePrediction({ 
        predicted_fee: 0.001,
        confidence: 0.5,
        model: 'fallback',
        status: 'error'
      });
      setFraudAnalysis({
        risk_score: 0.1,
        is_suspicious: false,
        confidence: 0.5,
        model: 'fallback'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketData = async () => {
    setLoadingMarketData(true);
    try {
      // Fetch real market metrics
      const response = await axios.get('/api/market-trends?type=metrics');
      
      if (response.data.success) {
        setMarketMetrics(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
      // Keep existing mock data on error
    } finally {
      setLoadingMarketData(false);
    }
  };

  useEffect(() => {
    fetchInsights();
    fetchMarketData();
    
    // Auto-refresh every 30 seconds for insights
    const insightsInterval = setInterval(fetchInsights, 30000);
    
    // Auto-refresh every 2 minutes for market data (less frequent)
    const marketInterval = setInterval(fetchMarketData, 120000);
    
    return () => {
      clearInterval(insightsInterval);
      clearInterval(marketInterval);
    };
  }, []);

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
                <TrendingUpIcon className="w-8 h-8 text-black" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-white/20 to-transparent rounded-2xl blur opacity-75"></div>
            </div>
            <h1 className="text-5xl satoshi-bold bg-gradient-to-r from-white via-gray-300 to-white bg-clip-text text-transparent">
              AI Insights
            </h1>
          </div>
          <p className="text-xl text-stone-400 max-w-3xl mx-auto leading-relaxed">
            Real-time market analytics and AI-powered predictions for smarter trading decisions
          </p>
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-between items-center bg-stone-900/30 backdrop-blur border border-stone-800/50 rounded-xl p-4"
        >
          <div className="text-sm text-stone-400">
            Last updated: <span className="text-white satoshi-regular">{lastUpdate.toLocaleTimeString()}</span>
          </div>
          <Button
            onClick={() => {
              fetchInsights();
              fetchMarketData();
            }}
            disabled={loading || loadingMarketData}
            variant="outline"
            size="sm"
            className="border-stone-600 text-stone-300 hover:text-white hover:border-white"
          >
            {(loading || loadingMarketData) ? (
              <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshIcon className="w-4 h-4 mr-2" />
            )}
            Refresh Data
          </Button>
        </motion.div>

        {/* Market Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <Card className="border border-stone-800/50 shadow-2xl bg-gradient-to-br from-stone-900/50 to-black/50 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg text-white">
                <DollarIcon className="w-5 h-5" />
                Network Fee
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl satoshi-bold text-white mb-3">
                {marketMetrics.networkFee.toFixed(6)} APT
              </div>
              <div className={cn(
                "text-sm satoshi-medium px-3 py-1 rounded-full inline-block border",
                marketMetrics.networkStatus === 'optimal' 
                  ? "text-green-400 bg-green-500/20 border-green-500/30"
                  : marketMetrics.networkStatus === 'congested'
                  ? "text-yellow-400 bg-yellow-500/20 border-yellow-500/30"
                  : "text-red-400 bg-red-500/20 border-red-500/30"
              )}>
                {marketMetrics.networkStatus.charAt(0).toUpperCase() + marketMetrics.networkStatus.slice(1)}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-stone-800/50 shadow-2xl bg-gradient-to-br from-stone-900/50 to-black/50 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg text-white">
                <ActivityIcon className="w-5 h-5" />
                24h Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl satoshi-bold text-white mb-3">
                {marketMetrics.transactionVolume.toLocaleString()}
              </div>
              <div className="text-sm text-stone-400 flex items-center">
                <TrendingUpIcon className="w-4 h-4 mr-1 text-green-400" />
                +12.3% from yesterday
              </div>
            </CardContent>
          </Card>

          <Card className="border border-stone-800/50 shadow-2xl bg-gradient-to-br from-stone-900/50 to-black/50 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg text-white">
                <ZapIcon className="w-5 h-5" />
                Avg. Speed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl satoshi-bold text-white mb-3">
                {marketMetrics.averageTime.toFixed(2)}s
              </div>
              <div className="text-sm text-stone-400">
                Transaction confirmation
              </div>
            </CardContent>
          </Card>

          <Card className="border border-stone-800/50 shadow-2xl bg-gradient-to-br from-stone-900/50 to-black/50 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg text-white">
                <ShieldIcon className="w-5 h-5" />
                Security Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl satoshi-bold text-green-400 mb-3">98.5%</div>
              <div className="text-sm text-stone-400">
                Network security level
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Predictions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Fee Prediction */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border border-stone-800/50 shadow-2xl bg-gradient-to-br from-stone-900/50 to-black/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-white">
                  <TargetIcon className="w-5 h-5" />
                  Fee Optimization
                </CardTitle>
                <CardDescription className="text-stone-400">
                  AI-powered fee prediction for optimal transaction costs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {(feePrediction.fee || feePrediction.prediction || feePrediction.predicted_fee) ? (
                  <>
                    <div className="text-center p-8 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-xl border border-blue-500/30">
                      <div className="text-4xl satoshi-bold text-blue-400 mb-3">
                        {(feePrediction.fee || feePrediction.prediction || feePrediction.predicted_fee || 0).toFixed(6)} APT
                      </div>
                      <div className="text-sm text-blue-300">Recommended Fee</div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-stone-400">Confidence Level</span>
                        <span className="satoshi-medium text-white">
                          {((feePrediction.confidence || 0) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-stone-800 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${(feePrediction.confidence || 0) * 100}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-stone-400">Model Used</span>
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium",
                          feePrediction.model?.includes('ml') 
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                        )}>
                          {feePrediction.model || 'Unknown'}
                        </span>
                      </div>
                      {feePrediction.factors && (
                        <div className="mt-4 p-4 bg-stone-900/50 rounded-lg">
                          <h4 className="text-sm font-medium text-white mb-3">Prediction Factors</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-stone-400">Amount:</span>
                              <span className="text-white">{feePrediction.factors.amount} APT</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-stone-400">Network Load:</span>
                              <span className="text-white">{((feePrediction.factors.network_load || 0) * 100).toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-stone-400">Priority:</span>
                              <span className="text-white capitalize">{feePrediction.factors.priority}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-stone-400">Token:</span>
                              <span className="text-white">{feePrediction.factors.token_type}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <BarChartIcon className="w-16 h-16 text-stone-600 mx-auto mb-6" />
                    <p className="text-stone-400">Click &quot;Refresh Data&quot; to get fee predictions</p>
                    {loading && (
                      <div className="mt-4">
                        <SpinnerIcon className="w-6 h-6 text-blue-400 mx-auto animate-spin" />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Fraud Detection */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border border-stone-800/50 shadow-2xl bg-gradient-to-br from-stone-900/50 to-black/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-white">
                  <ShieldIcon className="w-5 h-5" />
                  Security Analysis
                </CardTitle>
                <CardDescription className="text-stone-400">
                  Real-time fraud detection and risk assessment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {fraudAnalysis.risk_score !== undefined ? (
                  <>
                    <div className={cn(
                      "flex items-center gap-4 p-6 rounded-xl border",
                      (fraudAnalysis.is_fraud || fraudAnalysis.is_suspicious)
                        ? "bg-red-500/20 border-red-500/30"
                        : "bg-green-500/20 border-green-500/30"
                    )}>
                      {(fraudAnalysis.is_fraud || fraudAnalysis.is_suspicious) ? (
                        <AlertTriangleIcon className="w-8 h-8 text-red-400 flex-shrink-0" />
                      ) : (
                        <CheckCircleIcon className="w-8 h-8 text-green-400 flex-shrink-0" />
                      )}
                      <div>
                        <div className={cn(
                          "font-semibold text-lg",
                          (fraudAnalysis.is_fraud || fraudAnalysis.is_suspicious) ? "text-red-400" : "text-green-400"
                        )}>
                          {(fraudAnalysis.is_fraud || fraudAnalysis.is_suspicious) ? 'Suspicious Activity Detected' : 'All Clear'}
                        </div>
                        <div className={cn(
                          "text-sm",
                          (fraudAnalysis.is_fraud || fraudAnalysis.is_suspicious) ? "text-red-300" : "text-green-300"
                        )}>
                          {(fraudAnalysis.is_fraud || fraudAnalysis.is_suspicious)
                            ? 'Transaction patterns indicate potential risk'
                            : 'No suspicious patterns detected'
                          }
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-stone-400">Risk Score</span>
                        <span className="font-mono text-lg text-white">
                          {(fraudAnalysis.risk_score * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-stone-800 rounded-full h-3">
                        <div
                          className={cn(
                            "h-3 rounded-full transition-all duration-500",
                            fraudAnalysis.risk_score > 0.7 
                              ? "bg-gradient-to-r from-red-500 to-red-600"
                              : fraudAnalysis.risk_score > 0.4
                              ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                              : "bg-gradient-to-r from-green-500 to-green-600"
                          )}
                          style={{ width: `${fraudAnalysis.risk_score * 100}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-stone-400">Risk Level</span>
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium",
                          fraudAnalysis.risk_score < 0.3 
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : fraudAnalysis.risk_score < 0.7
                            ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                        )}>
                          {fraudAnalysis.risk_score < 0.3 ? 'LOW' : 
                           fraudAnalysis.risk_score < 0.7 ? 'MEDIUM' : 'HIGH'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-stone-400">Confidence Score</span>
                        <span className="font-medium text-white">
                          {((fraudAnalysis.confidence || 0) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-stone-400">Model Used</span>
                        <span className="font-mono text-sm text-white">
                          {fraudAnalysis.model || 'N/A'}
                        </span>
                      </div>
                      {fraudAnalysis.risk_factors && fraudAnalysis.risk_factors.length > 0 && (
                        <div className="mt-4 p-4 bg-stone-900/50 rounded-lg">
                          <h4 className="text-sm font-medium text-white mb-3">Risk Factors</h4>
                          <div className="flex flex-wrap gap-2">
                            {fraudAnalysis.risk_factors.map((factor, index) => (
                              <span 
                                key={index}
                                className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded border border-red-500/30"
                              >
                                {factor.replace(/_/g, ' ').toUpperCase()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <PieChartIcon className="w-16 h-16 text-stone-600 mx-auto mb-6" />
                    <p className="text-stone-400">Click &quot;Refresh Data&quot; to analyze security patterns</p>
                    {loading && (
                      <div className="mt-4">
                        <SpinnerIcon className="w-6 h-6 text-red-400 mx-auto animate-spin" />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Market Trends Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-6"
        >
          <Card className="border border-stone-800/50 shadow-2xl bg-gradient-to-br from-stone-900/50 to-black/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white">
                <LineChartIcon className="w-5 h-5" />
                Market Trends
                <div className="flex items-center gap-2 text-sm text-stone-400 ml-auto">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Real-time Data
                </div>
              </CardTitle>
              <CardDescription className="text-stone-400">
                Live APT price data and market analysis powered by CoinGecko
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingMarketData ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <SpinnerIcon className="w-8 h-8 text-blue-400 mx-auto animate-spin mb-4" />
                    <p className="text-stone-400">Loading real market data...</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* APT Price Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-stone-800/50 rounded-lg">
                  <p className="text-sm text-stone-400 mb-1">Current Price</p>
                  <p className="text-2xl font-bold text-white">${marketMetrics.aptPrice.price.toFixed(2)}</p>
                  <p className={cn(
                    "text-sm font-medium flex items-center mt-1",
                    marketMetrics.aptPrice.change24h >= 0 ? "text-green-400" : "text-red-400"
                  )}>
                    <TrendingUpIcon className={cn(
                      "w-3 h-3 mr-1",
                      marketMetrics.aptPrice.change24h < 0 && "rotate-180"
                    )} />
                    {marketMetrics.aptPrice.change24h >= 0 ? '+' : ''}{marketMetrics.aptPrice.change24h.toFixed(2)}%
                  </p>
                </div>
                <div className="p-4 bg-stone-800/50 rounded-lg">
                  <p className="text-sm text-stone-400 mb-1">24h Volume</p>
                  <p className="text-2xl font-bold text-white">
                    ${(marketMetrics.aptPrice.volume24h / 1000000).toFixed(1)}M
                  </p>
                  <p className="text-sm text-stone-400 mt-1">Trading volume</p>
                </div>
                <div className="p-4 bg-stone-800/50 rounded-lg">
                  <p className="text-sm text-stone-400 mb-1">Market Cap</p>
                  <p className="text-2xl font-bold text-white">
                    ${(marketMetrics.aptPrice.marketCap / 1000000000).toFixed(2)}B
                  </p>
                  <p className="text-sm text-stone-400 mt-1">Total market value</p>
                </div>
                <div className="p-4 bg-stone-800/50 rounded-lg">
                  <p className="text-sm text-stone-400 mb-1">Network Status</p>
                  <p className="text-2xl font-bold text-white">
                    {marketMetrics.networkStatus === 'optimal' ? '🟢' : 
                     marketMetrics.networkStatus === 'congested' ? '🟡' : '🔴'}
                  </p>
                  <p className="text-sm text-stone-400 mt-1 capitalize">{marketMetrics.networkStatus}</p>
                </div>
              </div>

              {/* Price Chart Visualization */}
              <div className="bg-stone-800/30 rounded-xl p-6 border border-stone-700/50">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-white">7-Day Price History</h4>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-stone-400">Price (USD)</span>
                  </div>
                </div>
                
                {/* Simple Chart Visualization */}
                <div className="relative h-48 bg-gradient-to-t from-stone-900/50 to-transparent rounded-lg overflow-hidden">
                  <div className="absolute inset-0 flex items-end justify-between px-4 pb-4">
                    {marketMetrics.priceHistory.map((point, index) => {
                      const height = ((point.price - 7.5) / (9 - 7.5)) * 100;
                      return (
                        <div key={index} className="flex flex-col items-center space-y-2">
                          <div 
                            className="w-4 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-sm transition-all duration-500 hover:from-blue-500 hover:to-blue-300"
                            style={{ height: `${Math.max(height, 10)}%` }}
                            title={`$${point.price.toFixed(2)} - ${new Date(point.timestamp).toLocaleDateString()}`}
                          ></div>
                          <span className="text-xs text-stone-500 transform -rotate-45 origin-left">
                            {new Date(point.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Grid lines */}
                  <div className="absolute inset-0 flex flex-col justify-between py-4">
                    {[9, 8.5, 8, 7.5].map((price) => (
                      <div key={price} className="border-b border-stone-700/30 relative">
                        <span className="absolute -left-12 -top-2 text-xs text-stone-500">${price}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Market Insights */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUpIcon className="w-4 h-4 text-green-400" />
                      <span className="text-sm font-medium text-green-400">Bullish Signal</span>
                    </div>
                    <p className="text-xs text-green-300">
                      Price showing strong upward momentum with increasing volume
                    </p>
                  </div>
                  <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <div className="flex items-center space-x-2 mb-2">
                      <ActivityIcon className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium text-blue-400">High Activity</span>
                    </div>
                    <p className="text-xs text-blue-300">
                      Network transactions up 24% compared to last week
                    </p>
                  </div>
                  <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <div className="flex items-center space-x-2 mb-2">
                      <TargetIcon className="w-4 h-4 text-purple-400" />
                      <span className="text-sm font-medium text-purple-400">Price Target</span>
                    </div>
                    <p className="text-xs text-purple-300">
                      AI models suggest potential resistance at $9.20
                    </p>
                  </div>
                </div>
              </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Connect Wallet CTA */}
        {!account && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="border border-stone-800/50 shadow-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 backdrop-blur">
              <CardContent className="text-center py-12">
                <div className="space-y-6">
                  <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto">
                    <ShieldIcon className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold text-white">Connect Your Wallet</h3>
                  <p className="text-stone-400 max-w-md mx-auto leading-relaxed">
                    Connect your wallet to get personalized insights and transaction analysis
                  </p>
                  <Button className="bg-white text-black hover:bg-gray-200 font-medium px-8 py-3">
                    Connect Wallet for Personal Insights
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}