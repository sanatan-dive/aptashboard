'use client';
import { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  DollarSign,
  Shield,
  Zap,
  Activity,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PredictionData {
  optimalFee?: number;
  confidence?: number;
  recommendation?: string;
  isSuspicious?: boolean;
  riskLevel?: string;
  anomalyScore?: number;
}

interface MarketMetrics {
  networkFee: number;
  networkStatus: 'optimal' | 'congested' | 'high';
  transactionVolume: number;
  averageTime: number;
}

export default function Insights() {
  const { account } = useWallet();
  const [feePrediction, setFeePrediction] = useState<PredictionData>({});
  const [fraudAnalysis, setFraudAnalysis] = useState<PredictionData>({});
  const [marketMetrics] = useState<MarketMetrics>({
    networkFee: 0.001,
    networkStatus: 'optimal',
    transactionVolume: 12450,
    averageTime: 3.2
  });
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchInsights = async () => {
    setLoading(true);
    try {
      // Sample data for demonstration - replace with real data
      const sampleData = [0.005, 1200, 720]; // gas_fee, tx_volume, timestamp

      // Fetch fee prediction
      const feeResponse = await axios.post('/api/predict', {
        type: 'fee',
        data: sampleData
      });
      setFeePrediction(feeResponse.data);

      // Fetch fraud analysis
      const fraudResponse = await axios.post('/api/predict', {
        type: 'fraud', 
        data: sampleData
      });
      setFraudAnalysis(fraudResponse.data);

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchInsights, 30000);
    return () => clearInterval(interval);
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
                <TrendingUp className="w-8 h-8 text-black" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-white/20 to-transparent rounded-2xl blur opacity-75"></div>
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-gray-300 to-white bg-clip-text text-transparent">
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
            Last updated: <span className="text-white font-mono">{lastUpdate.toLocaleTimeString()}</span>
          </div>
          <Button
            onClick={fetchInsights}
            disabled={loading}
            variant="outline"
            size="sm"
            className="border-stone-600 text-stone-300 hover:text-white hover:border-white"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
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
                <DollarSign className="w-5 h-5" />
                Network Fee
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-3">
                {marketMetrics.networkFee.toFixed(6)} APT
              </div>
              <div className={cn(
                "text-sm font-medium px-3 py-1 rounded-full inline-block border",
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
                <Activity className="w-5 h-5" />
                24h Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-3">
                {marketMetrics.transactionVolume.toLocaleString()}
              </div>
              <div className="text-sm text-stone-400 flex items-center">
                <TrendingUp className="w-4 h-4 mr-1 text-green-400" />
                +12.3% from yesterday
              </div>
            </CardContent>
          </Card>

          <Card className="border border-stone-800/50 shadow-2xl bg-gradient-to-br from-stone-900/50 to-black/50 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg text-white">
                <Zap className="w-5 h-5" />
                Avg. Speed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-3">
                {marketMetrics.averageTime}s
              </div>
              <div className="text-sm text-stone-400">
                Transaction confirmation
              </div>
            </CardContent>
          </Card>

          <Card className="border border-stone-800/50 shadow-2xl bg-gradient-to-br from-stone-900/50 to-black/50 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg text-white">
                <Shield className="w-5 h-5" />
                Security Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400 mb-3">98.5%</div>
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
                  <Target className="w-5 h-5" />
                  Fee Optimization
                </CardTitle>
                <CardDescription className="text-stone-400">
                  AI-powered fee prediction for optimal transaction costs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {feePrediction.optimalFee ? (
                  <>
                    <div className="text-center p-8 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-xl border border-blue-500/30">
                      <div className="text-4xl font-bold text-blue-400 mb-3">
                        {feePrediction.optimalFee.toFixed(6)} APT
                      </div>
                      <div className="text-sm text-blue-300">Recommended Fee</div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-stone-400">Confidence Level</span>
                        <span className="font-medium text-white">
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
                        <span className="text-sm text-stone-400">Recommendation</span>
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium",
                          feePrediction.recommendation === 'optimal' 
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                        )}>
                          {feePrediction.recommendation || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <BarChart3 className="w-16 h-16 text-stone-600 mx-auto mb-6" />
                    <p className="text-stone-400">Click &quot;Refresh Data&quot; to get fee predictions</p>
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
                  <Shield className="w-5 h-5" />
                  Security Analysis
                </CardTitle>
                <CardDescription className="text-stone-400">
                  Real-time fraud detection and risk assessment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {fraudAnalysis.riskLevel ? (
                  <>
                    <div className={cn(
                      "flex items-center gap-4 p-6 rounded-xl border",
                      fraudAnalysis.isSuspicious 
                        ? "bg-red-500/20 border-red-500/30"
                        : "bg-green-500/20 border-green-500/30"
                    )}>
                      {fraudAnalysis.isSuspicious ? (
                        <AlertTriangle className="w-8 h-8 text-red-400 flex-shrink-0" />
                      ) : (
                        <CheckCircle className="w-8 h-8 text-green-400 flex-shrink-0" />
                      )}
                      <div>
                        <div className={cn(
                          "font-semibold text-lg",
                          fraudAnalysis.isSuspicious ? "text-red-400" : "text-green-400"
                        )}>
                          {fraudAnalysis.isSuspicious ? 'Suspicious Activity Detected' : 'All Clear'}
                        </div>
                        <div className={cn(
                          "text-sm",
                          fraudAnalysis.isSuspicious ? "text-red-300" : "text-green-300"
                        )}>
                          {fraudAnalysis.isSuspicious 
                            ? 'Transaction patterns indicate potential risk'
                            : 'No suspicious patterns detected'
                          }
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-stone-400">Risk Level</span>
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium",
                          fraudAnalysis.riskLevel === 'low' 
                            ? "bg-green-500/20 text-green-400"
                            : fraudAnalysis.riskLevel === 'medium'
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-red-500/20 text-red-400"
                        )}>
                          {fraudAnalysis.riskLevel?.toUpperCase() || 'UNKNOWN'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-stone-400">Confidence Score</span>
                        <span className="font-medium text-white">
                          {((fraudAnalysis.confidence || 0) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-stone-400">Anomaly Score</span>
                        <span className="font-mono text-sm text-white">
                          {fraudAnalysis.anomalyScore?.toFixed(3) || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <PieChart className="w-16 h-16 text-stone-600 mx-auto mb-6" />
                    <p className="text-stone-400">Click &quot;Refresh Data&quot; to analyze security patterns</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Market Trends Chart Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border border-stone-800/50 shadow-2xl bg-gradient-to-br from-stone-900/50 to-black/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white">
                <BarChart3 className="w-5 h-5" />
                Market Trends
              </CardTitle>
              <CardDescription className="text-stone-400">
                Historical data and trend analysis for the Aptos network
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gradient-to-br from-stone-800/30 to-stone-900/30 rounded-xl flex items-center justify-center border border-stone-700/50">
                <div className="text-center space-y-4">
                  <TrendingUp className="w-16 h-16 text-stone-600 mx-auto" />
                  <p className="text-stone-300 font-medium text-lg">Market Trend Chart</p>
                  <p className="text-sm text-stone-500">Interactive chart component coming soon</p>
                </div>
              </div>
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
                    <Shield className="w-10 h-10 text-white" />
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