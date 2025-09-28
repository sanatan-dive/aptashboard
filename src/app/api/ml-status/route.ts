import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    
    // Test fee prediction
    const feeTest = await fetch(`${baseUrl}/api/predict-ml`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'fee',
        data: [0.5, 100, 0.7]
      }),
    });

    // Test fraud detection
    const fraudTest = await fetch(`${baseUrl}/api/predict-ml`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'fraud',
        data: ['0x123abc', '0x456def', 1000, Math.floor(Date.now() / 1000)]
      }),
    });

    const feeResult = feeTest.ok ? await feeTest.json() : { error: 'Fee service unavailable' };
    const fraudResult = fraudTest.ok ? await fraudTest.json() : { error: 'Fraud service unavailable' };

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        fee_prediction: {
          status: feeTest.ok ? 'operational' : 'degraded',
          model: feeResult.model || 'unknown',
          last_prediction: feeResult.fee || null,
          confidence: feeResult.confidence || null
        },
        fraud_detection: {
          status: fraudTest.ok ? 'operational' : 'degraded',
          model: fraudResult.model || 'unknown',
          last_risk_score: fraudResult.risk_score || null,
          confidence: fraudResult.confidence || null
        }
      },
      capabilities: [
        'Real-time fraud detection',
        'ML-based fee prediction',
        'Risk-based transaction blocking',
        'Anomaly detection',
        'Pattern recognition'
      ],
      security_metrics: {
        models_active: (feeTest.ok ? 1 : 0) + (fraudTest.ok ? 1 : 0),
        total_endpoints: 2,
        last_health_check: new Date().toISOString()
      }
    });

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      services: {
        fee_prediction: { status: 'unavailable' },
        fraud_detection: { status: 'unavailable' }
      }
    }, { status: 500 });
  }
}
