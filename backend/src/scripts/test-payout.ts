import '../config/env';

async function run() {
  const cashfreeAppId = process.env.CASHFREE_APP_ID;
  const cashfreeSecret = process.env.CASHFREE_SECRET_KEY;

  console.log('Credentials:', { cashfreeAppId });
  
  // Step 1: Authorize
  const authUrl = 'https://payout-gamma.cashfree.com/payout/v1/authorize';
  console.log('Sending authorize request to:', authUrl);

  try {
    const authResponse = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'X-Client-Id': cashfreeAppId || '',
        'X-Client-Secret': cashfreeSecret || '',
        'Content-Type': 'application/json'
      }
    });

    const authStatus = authResponse.status;
    const authBody = (await authResponse.json().catch(() => ({}))) as any;
    console.log('Auth Status:', authStatus);
    console.log('Auth Response:', JSON.stringify(authBody));

    if (authBody.status !== 'SUCCESS') {
      console.error('Authentication failed');
      return;
    }

    const token = authBody.data.token;
    console.log('Received token:', token.substring(0, 10) + '...');

    // Step 2: Request Transfer
    const transferUrl = 'https://payout-gamma.cashfree.com/payout/v1/requestTransfer';
    const transferId = `test_sal_${Date.now()}`;
    const transferBody = {
      beneId: 'Bhanu', // Note: V1 expects beneId
      amount: '1.00',  // Note: V1 expects string amount
      transferId: transferId
    };

    console.log('Sending transfer request to:', transferUrl);
    const transferResponse = await fetch(transferUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transferBody)
    });

    const transferStatus = transferResponse.status;
    const transferResBody = (await transferResponse.json().catch(() => ({}))) as any;
    console.log('Transfer Status:', transferStatus);
    console.log('Transfer Response:', JSON.stringify(transferResBody));

  } catch (error) {
    console.error('Error during execution:', error);
  }
}

run();
