import { v2 as cloudinary } from 'cloudinary';

async function testSecretValidation() {
  cloudinary.config({
    cloud_name: 'dyxbtebru',
    api_key: '381471226625716',
    api_secret: 'invalid_secret_value',
  });

  try {
    const pingResult = await cloudinary.api.ping();
    console.log('Ping with invalid secret result:', pingResult);
  } catch (error) {
    console.error('Ping with invalid secret failed:', error);
  }
}

testSecretValidation();
