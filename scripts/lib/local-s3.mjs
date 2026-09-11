// Shared S3 client settings for the local infrastructure scripts. Values come from the environment
// (or the root .env), falling back to the local-only placeholders in infra/docker (ADR-0010).
import { existsSync } from 'node:fs';
import { S3Client } from '@aws-sdk/client-s3';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

export const s3Settings = {
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  region: process.env.S3_REGION || 'eu-west-2',
  accessKeyId: process.env.S3_ACCESS_KEY_ID || 'voltdrop-local',
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || 'voltdrop-local-secret',
  publicBucket: process.env.S3_BUCKET_PUBLIC || 'voltdrop-public',
  privateBucket: process.env.S3_BUCKET_PRIVATE || 'voltdrop-private',
};

/** Browser origins of the local apps (spec §18), allowed to upload with presigned requests. */
export const localOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:8081',
  'http://localhost:8082',
];

export function createS3Client() {
  return new S3Client({
    endpoint: s3Settings.endpoint,
    region: s3Settings.region,
    forcePathStyle: true,
    // Recent SDK versions add CRC32 checksums to every request by default. Presigned URLs would then
    // carry the checksum of an empty body, and S3-compatible servers reject the extra parameters.
    // Only send checksums when an operation requires them (the M4 ObjectStore adapter needs this too).
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    credentials: {
      accessKeyId: s3Settings.accessKeyId,
      secretAccessKey: s3Settings.secretAccessKey,
    },
  });
}
