/**
 * Test the Real ML Services
 * Run with: node test-ml.js
 */

async function testMLServices() {
  try {
    console.log('🧪 Testing Real ML Services...\n');
    
    // Test 1: Fee Prediction
    console.log('1️⃣ Testing Fee Prediction:');
    const feeResponse = await fetch('http://localhost:3000/api/predict-ml', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'fee',
        data: [100, 'APT', 'normal'] // [amount, token, priority]
      }),
    });
    
    if (feeResponse.ok) {
      const feeResult = await feeResponse.json();
      console.log('✅ Fee Prediction Success:');
      console.log(`   Predicted Fee: ${feeResult.predicted_fee} APT`);
      console.log(`   Confidence: ${feeResult.confidence}`);
      console.log(`   Model: ${feeResult.model}`);
      console.log(`   Data Sources: ${feeResult.data_sources?.join(', ')}`);
    } else {
      console.log('❌ Fee Prediction Failed:', await feeResponse.text());
    }
    
    console.log('\n2️⃣ Testing Fraud Detection:');
    const fraudResponse = await fetch('http://localhost:3000/api/predict-ml', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'fraud',
        data: [
          '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12',
          '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
          1000,
          Date.now() / 1000
        ] // [sender, recipient, amount, timestamp]
      }),
    });
    
    if (fraudResponse.ok) {
      const fraudResult = await fraudResponse.json();
      console.log('✅ Fraud Detection Success:');
      console.log(`   Risk Score: ${fraudResult.risk_score}`);
      console.log(`   Is Suspicious: ${fraudResult.is_suspicious}`);
      console.log(`   Confidence: ${fraudResult.confidence}`);
      console.log(`   Model: ${fraudResult.model}`);
      console.log(`   Data Sources: ${fraudResult.data_sources?.join(', ')}`);
    } else {
      console.log('❌ Fraud Detection Failed:', await fraudResponse.text());
    }
    
    console.log('\n🎉 ML Services Test Complete!');
    
  } catch (error) {
    console.error('❌ Test Failed:', error);
  }
}

// Only run if server is available
const checkServer = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/health');
    if (response.ok) {
      console.log('✅ Server is running, starting ML tests...\n');
      await testMLServices();
    } else {
      console.log('❌ Server is not responding. Please run: npm run dev');
    }
  } catch (error) {
    console.log('❌ Server is not running. Please run: npm run dev');
    console.log('   Then run this test again.');
  }
};

checkServer();
