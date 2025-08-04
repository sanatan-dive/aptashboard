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

  const getNetworkStatusColor = (status: string) => {
    switch (status) {
      case 'optimal': return 'text-green-600 bg-green-50 border-green-200';
      case 'congested': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskLevelColor = (level?: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'high': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
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
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-black">AI Insights</h1>
        </div>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Real-time market analytics and AI-powered predictions for smarter trading decisions
        </p>
      </motion.div>

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex justify-between items-center"
      >
        <div className="text-sm text-gray-600">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
        <Button
          onClick={fetchInsights}
          disabled={loading}
          variant="outline"
          size="sm"
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
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="w-5 h-5" />
              Network Fee
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">
              {marketMetrics.networkFee.toFixed(6)} APT
            </div>
            <div className={cn(
              "text-sm font-medium px-2 py-1 rounded-full inline-block mt-2 border",
              getNetworkStatusColor(marketMetrics.networkStatus)
            )}>
              {marketMetrics.networkStatus.charAt(0).toUpperCase() + marketMetrics.networkStatus.slice(1)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="w-5 h-5" />
              24h Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">
              {marketMetrics.transactionVolume.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 mt-2">
              <TrendingUp className="w-4 h-4 inline mr-1 text-green-600" />
              +12.3% from yesterday
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="w-5 h-5" />
              Avg. Speed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">
              {marketMetrics.averageTime}s
            </div>
            <div className="text-sm text-gray-600 mt-2">
              Transaction confirmation
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5" />
              Security Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">98.5%</div>
            <div className="text-sm text-gray-600 mt-2">
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
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Fee Optimization
              </CardTitle>
              <CardDescription>
                AI-powered fee prediction for optimal transaction costs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {feePrediction.optimalFee ? (
                <>
                  <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {feePrediction.optimalFee.toFixed(6)} APT
                    </div>
                    <div className="text-sm text-blue-700">Recommended Fee</div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Confidence Level</span>
                      <span className="font-medium">
                        {((feePrediction.confidence || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(feePrediction.confidence || 0) * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Recommendation</span>
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        feePrediction.recommendation === 'optimal' 
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      )}>
                        {feePrediction.recommendation || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Click &quot;Refresh Data&quot; to get fee predictions</p>
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
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Analysis
              </CardTitle>
              <CardDescription>
                Real-time fraud detection and risk assessment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fraudAnalysis.riskLevel ? (
                <>
                  <div className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border",
                    fraudAnalysis.isSuspicious 
                      ? "bg-red-50 border-red-200"
                      : "bg-green-50 border-green-200"
                  )}>
                    {fraudAnalysis.isSuspicious ? (
                      <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
                    ) : (
                      <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                    )}
                    <div>
                      <div className={cn(
                        "font-medium",
                        fraudAnalysis.isSuspicious ? "text-red-800" : "text-green-800"
                      )}>
                        {fraudAnalysis.isSuspicious ? 'Suspicious Activity Detected' : 'All Clear'}
                      </div>
                      <div className={cn(
                        "text-sm",
                        fraudAnalysis.isSuspicious ? "text-red-600" : "text-green-600"
                      )}>
                        {fraudAnalysis.isSuspicious 
                          ? 'Transaction patterns indicate potential risk'
                          : 'No suspicious patterns detected'
                        }
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Risk Level</span>
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        getRiskLevelColor(fraudAnalysis.riskLevel)
                      )}>
                        {fraudAnalysis.riskLevel?.toUpperCase() || 'UNKNOWN'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Confidence Score</span>
                      <span className="font-medium">
                        {((fraudAnalysis.confidence || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Anomaly Score</span>
                      <span className="font-mono text-sm">
                        {fraudAnalysis.anomalyScore?.toFixed(3) || 'N/A'}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <PieChart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Click &quot;Refresh Data&quot; to analyze security patterns</p>
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
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Market Trends
            </CardTitle>
            <CardDescription>
              Historical data and trend analysis for the Aptos network
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center">
              <div className="text-center space-y-2">
                <TrendingUp className="w-12 h-12 text-gray-400 mx-auto" />
                <p className="text-gray-600 font-medium">Market Trend Chart</p>
                <p className="text-sm text-gray-500">Interactive chart component coming soon</p>
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
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardContent className="text-center py-8">
              <div className="space-y-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <Shield className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Connect Your Wallet</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Connect your wallet to get personalized insights and transaction analysis
                </p>
                <Button className="bg-black text-white hover:bg-gray-800">
                  Connect Wallet for Personal Insights
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}