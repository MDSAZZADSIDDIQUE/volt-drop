// Prepares local services after `docker compose up`: creates the S3 buckets and their CORS rules.
// Safe to run repeatedly. Cloud buckets are managed by Terraform (M14), never by this script.
import {
  CreateBucketCommand,
  HeadBucketCommand,
  ListBucketsCommand,
  PutBucketCorsCommand,
} from '@aws-sdk/client-s3';
import { createS3Client, localOrigins, s3Settings } from './lib/local-s3.mjs';

const client = createS3Client();

async function waitForS3(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      await client.send(new ListBucketsCommand({}));
      return;
    } catch (error) {
      if (Date.now() > deadline) {
        throw new Error(`S3 at ${s3Settings.endpoint} didn't become ready: ${String(error)}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

async function ensureBucket(bucket) {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log(`Bucket ${bucket} already exists.`);
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    console.log(`Created bucket ${bucket}.`);
  }
  await client.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: localOrigins,
            AllowedMethods: ['GET', 'HEAD', 'PUT', 'POST'],
            AllowedHeaders: ['*'],
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 3000,
          },
        ],
      },
    }),
  );
  console.log(`Set CORS on ${bucket} for the local app origins.`);
}

await waitForS3();
for (const bucket of [s3Settings.publicBucket, s3Settings.privateBucket]) {
  await ensureBucket(bucket);
}
