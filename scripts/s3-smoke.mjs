// Proves the local S3 service supports what the ObjectStore adapter needs from M4 (ADR-0010):
// presigned PUT, presigned POST with a content-length-range policy that rejects oversized uploads,
// and CORS preflight for the local app origins. Exits non-zero with a reason on the first failure.
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createS3Client, localOrigins, s3Settings } from './lib/local-s3.mjs';

const client = createS3Client();
const bucket = s3Settings.privateBucket;
const runId = `smoke/${Date.now().toString(36)}`;
const created = [];

function check(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
  console.log(`ok - ${message}`);
}

/** The status plus, for failures, the start of the response body (S3 errors explain themselves in XML). */
async function describe(response) {
  const body = response.ok ? '' : ` ${(await response.text()).replace(/\s+/g, ' ').slice(0, 400)}`;
  return `HTTP ${response.status}${body}`;
}

async function presignedPut() {
  const key = `${runId}/put.txt`;
  const url = await getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: 'text/plain' }),
    { expiresIn: 60 },
  );
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'content-type': 'text/plain' },
    body: 'presigned put',
  });
  created.push(key);
  check(response.ok, `presigned PUT is accepted (${await describe(response)})`);

  const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  check(
    (await object.Body?.transformToString()) === 'presigned put',
    'the uploaded object reads back',
  );
}

async function presignedPost(size) {
  const key = `${runId}/post-${size}.txt`;
  const { url, fields } = await createPresignedPost(client, {
    Bucket: bucket,
    Key: key,
    Conditions: [
      ['content-length-range', 1, 1024],
      ['eq', '$Content-Type', 'text/plain'],
    ],
    Fields: { 'Content-Type': 'text/plain' },
    Expires: 60,
  });
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    form.append(name, value);
  }
  form.append('file', new Blob(['x'.repeat(size)], { type: 'text/plain' }), 'upload.txt');
  const response = await fetch(url, { method: 'POST', body: form });
  created.push(key);
  return { ok: response.ok, status: response.status, text: await describe(response) };
}

async function corsPreflight() {
  const origin = localOrigins[0];
  const response = await fetch(`${s3Settings.endpoint}/${bucket}/${runId}/cors.txt`, {
    method: 'OPTIONS',
    headers: { origin, 'access-control-request-method': 'PUT' },
  });
  const allowed = response.headers.get('access-control-allow-origin');
  check(
    allowed === origin || allowed === '*',
    `CORS preflight allows ${origin} (got ${String(allowed)}, HTTP ${response.status})`,
  );
}

try {
  await presignedPut();
  const small = await presignedPost(100);
  check(small.ok, `presigned POST within the size policy is accepted (${small.text})`);
  const large = await presignedPost(4096);
  check(
    large.status >= 400 && large.status < 500,
    `presigned POST over the size policy is rejected (${large.text})`,
  );
  await corsPreflight();
  console.log('S3 smoke test passed.');
} catch (error) {
  console.error(`S3 smoke test failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  for (const key of created) {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(() => {});
  }
}
