#!/usr/bin/env npx tsx
/**
 * Creates the AOSS vector index after VectorStoreStack deploys.
 * Called between VectorStore and Intelligence stack deploys.
 *
 * Usage: npx tsx scripts/create-aoss-index.ts <env>
 *   e.g.: npx tsx scripts/create-aoss-index.ts dev
 *
 * Prerequisites:
 * - VectorStoreStack deployed (AOSS collection ACTIVE)
 * - Caller's IAM principal is in the AOSS data access policy
 */

import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { SignatureV4 } from '@smithy/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';
import { HttpRequest } from '@smithy/protocol-http';

const ENV = process.argv[2] || 'dev';
const REGION = process.env.AWS_REGION || 'us-east-1';
const STACK_NAME = `AirlineVoiceAgent-VectorStore-${ENV}`;

async function getStackOutputs(): Promise<Record<string, string>> {
  const cfn = new CloudFormationClient({ region: REGION });
  const res = await cfn.send(new DescribeStacksCommand({ StackName: STACK_NAME }));
  const outputs: Record<string, string> = {};
  for (const o of res.Stacks?.[0]?.Outputs ?? []) {
    if (o.OutputKey && o.OutputValue) {
      outputs[o.OutputKey] = o.OutputValue;
    }
  }
  return outputs;
}

async function indexExists(endpoint: string, indexName: string): Promise<boolean> {
  const url = new URL(`/${indexName}`, endpoint);
  const request = new HttpRequest({
    method: 'HEAD',
    hostname: url.hostname,
    path: url.pathname,
    port: 443,
    protocol: 'https:',
    headers: {
      host: url.hostname,
    },
  });

  const signer = new SignatureV4({
    service: 'aoss',
    region: REGION,
    credentials: defaultProvider(),
    sha256: Sha256,
  });

  const signed = await signer.sign(request);
  const response = await fetch(`https://${signed.hostname}${signed.path}`, {
    method: signed.method,
    headers: signed.headers as Record<string, string>,
  });

  return response.status === 200;
}

async function createIndex(endpoint: string, indexName: string): Promise<void> {
  const url = new URL(`/${indexName}`, endpoint);
  const body = JSON.stringify({
    settings: {
      'index.knn': true,
      number_of_shards: 2,
      number_of_replicas: 0,
    },
    mappings: {
      properties: {
        vector: {
          type: 'knn_vector',
          dimension: 1024,
          method: {
            engine: 'faiss',
            name: 'hnsw',
            space_type: 'l2',
            parameters: {},
          },
        },
        text: { type: 'text' },
        metadata: { type: 'text' },
      },
    },
  });

  const request = new HttpRequest({
    method: 'PUT',
    hostname: url.hostname,
    path: url.pathname,
    port: 443,
    protocol: 'https:',
    headers: {
      host: url.hostname,
      'content-type': 'application/json',
      'content-length': String(Buffer.byteLength(body)),
    },
    body,
  });

  const signer = new SignatureV4({
    service: 'aoss',
    region: REGION,
    credentials: defaultProvider(),
    sha256: Sha256,
  });

  const signed = await signer.sign(request);
  const response = await fetch(`https://${signed.hostname}${signed.path}`, {
    method: signed.method,
    headers: signed.headers as Record<string, string>,
    body: signed.body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create index: ${response.status} ${response.statusText}\n${text}`);
  }

  console.log(`✅ Index '${indexName}' created successfully.`);
}

async function waitForAccess(
  endpoint: string,
  indexName: string,
  maxRetries = 30,
  intervalMs = 10000,
): Promise<void> {
  for (let i = 1; i <= maxRetries; i++) {
    try {
      const exists = await indexExists(endpoint, indexName);
      if (exists) {
        console.log(`✅ Index '${indexName}' already exists. Skipping creation.`);
        return;
      }
      // If we get here, index doesn't exist but we have access — create it
      await createIndex(endpoint, indexName);
      return;
    } catch (err: any) {
      if (err?.message?.includes('403') || err?.cause?.code === 'ERR_TLS') {
        console.log(
          `⏳ [${i}/${maxRetries}] Data access policy not yet propagated, retrying in ${intervalMs / 1000}s...`,
        );
        await new Promise((r) => setTimeout(r, intervalMs));
      } else {
        throw err;
      }
    }
  }
  throw new Error(`Data access policy did not propagate after ${maxRetries} retries.`);
}

async function main() {
  console.log(`🔍 Reading stack outputs from ${STACK_NAME}...`);
  const outputs = await getStackOutputs();

  const endpoint = outputs['CollectionEndpoint'];
  const indexName = outputs['IndexName'];

  if (!endpoint || !indexName) {
    throw new Error(`Missing stack outputs. Got: ${JSON.stringify(outputs, null, 2)}`);
  }

  console.log(`📡 Collection endpoint: ${endpoint}`);
  console.log(`📝 Target index: ${indexName}`);

  await waitForAccess(endpoint, indexName);
}

main().catch((err) => {
  console.error('❌', err.message || err);
  process.exit(1);
});
