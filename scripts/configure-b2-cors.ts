import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import { config } from 'dotenv';

config();

async function configureCors() {
  const { B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_NAME, B2_ENDPOINT } = process.env;

  if (!B2_KEY_ID || !B2_APPLICATION_KEY || !B2_BUCKET_NAME || !B2_ENDPOINT) {
    console.error('Missing B2 environment variables');
    process.exit(1);
  }

  const endpoint = B2_ENDPOINT.startsWith('http') ? B2_ENDPOINT : `https://${B2_ENDPOINT}`;

  const client = new S3Client({
    endpoint,
    region: 'us-east-1',
    credentials: {
      accessKeyId: B2_KEY_ID,
      secretAccessKey: B2_APPLICATION_KEY,
    },
    forcePathStyle: true,
  });

  const corsRules = {
    CORSRules: [
      {
        AllowedHeaders: ['*'],
        AllowedMethods: ['GET', 'PUT', 'HEAD'],
        AllowedOrigins: ['http://localhost:3000', 'https://einherjar-tracker.vercel.app'],
        ExposeHeaders: ['ETag'],
        MaxAgeSeconds: 3000,
      },
    ],
  };

  try {
    console.log(`Setting CORS for bucket: ${B2_BUCKET_NAME}...`);
    const command = new PutBucketCorsCommand({
      Bucket: B2_BUCKET_NAME,
      CORSConfiguration: corsRules,
    });
    await client.send(command);
    console.log('CORS successfully configured on bucket:', B2_BUCKET_NAME);
  } catch (error) {
    console.error('Error configuring CORS:', error);
    process.exit(1);
  }
}

configureCors();
