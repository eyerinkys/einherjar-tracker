import 'server-only';
import { S3Client } from '@aws-sdk/client-s3';
import { getB2Env } from './env';

const env = getB2Env();

// Make sure the endpoint uses the HTTPS protocol as B2 requires it.
const endpoint = env.B2_ENDPOINT?.startsWith('http')
  ? env.B2_ENDPOINT
  : `https://${env.B2_ENDPOINT}`;

/**
 * Server-only B2 Client instance.
 * Backblaze B2 offers an S3-compatible API which is compatible with the AWS SDK.
 */
export const b2Client = new S3Client({
  endpoint,
  region: 'us-east-1', // B2 requires a region to be set, 'us-east-1' is the standard dummy region for B2
  credentials: {
    accessKeyId: env.B2_KEY_ID ?? '',
    secretAccessKey: env.B2_APPLICATION_KEY ?? '',
  },
  // B2 typically requires path style routing for its S3 endpoint
  forcePathStyle: true,
});

export const B2_BUCKET_NAME = env.B2_BUCKET_NAME ?? '';
