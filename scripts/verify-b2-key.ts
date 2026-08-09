import { S3Client, HeadBucketCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { config } from "dotenv";

config();

async function verifyB2() {
  const { B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_NAME, B2_ENDPOINT } = process.env;

  if (!B2_KEY_ID || !B2_APPLICATION_KEY || !B2_BUCKET_NAME || !B2_ENDPOINT) {
    console.error("Missing B2 environment variables");
    process.exit(1);
  }

  // Ensure endpoint has protocol
  const endpoint = B2_ENDPOINT.startsWith("http") ? B2_ENDPOINT : `https://${B2_ENDPOINT}`;

  const client = new S3Client({
    endpoint,
    region: "us-east-1", // B2 requires a region, even a dummy one if using endpoint
    credentials: {
      accessKeyId: B2_KEY_ID,
      secretAccessKey: B2_APPLICATION_KEY,
    },
    // Backblaze S3 requires path style or proper bucket URL structure
    forcePathStyle: true, 
  });

  try {
    console.log(`Connecting to B2 Bucket: ${B2_BUCKET_NAME}...`);
    
    // Check if bucket exists and is accessible
    await client.send(new HeadBucketCommand({ Bucket: B2_BUCKET_NAME }));
    console.log("Bucket access verified.");
    
    // Check list access (if allowed by key, standard app keys should allow list)
    const result = await client.send(new ListObjectsV2Command({ Bucket: B2_BUCKET_NAME, MaxKeys: 1 }));
    console.log(`Successfully listed objects. Found ${result.KeyCount} objects.`);
    console.log("B2 credentials are valid and working!");
    
  } catch (error) {
    console.error("Failed to verify B2 credentials:");
    console.error(error);
    process.exit(1);
  }
}

verifyB2();
