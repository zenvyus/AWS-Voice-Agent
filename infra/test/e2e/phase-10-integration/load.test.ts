/**
 * Phase 10: Lambda Load Test
 *
 * Invokes the session-bootstrap Lambda concurrently to simulate load.
 * Uses AWS SDK (pre-authenticated) — no k6 or VPC access needed.
 *
 * Run: npx jest --config jest.config.e2e.ts --testPathPattern="load/lambda-load" --no-coverage
 */

import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const ENV_NAME = process.env.ENV_NAME || 'dev';
const LAMBDA_FN = `session-bootstrap-${ENV_NAME}`;

const lambda = new LambdaClient({ region: AWS_REGION });

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function invokeOnce(i: number): Promise<{ duration: number; success: boolean }> {
  const event = {
    Details: {
      ContactData: {
        ContactId: `load-test-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 6)}`,
        Channel: 'VOICE',
        InstanceARN: `arn:aws:connect:${AWS_REGION}:000000000000:instance/load-test`,
      },
      Parameters: {},
    },
  };

  const start = Date.now();
  try {
    const res = await lambda.send(
      new InvokeCommand({
        FunctionName: LAMBDA_FN,
        Payload: Buffer.from(JSON.stringify(event)),
      }),
    );
    return { duration: Date.now() - start, success: res.StatusCode === 200 && !res.FunctionError };
  } catch {
    return { duration: Date.now() - start, success: false };
  }
}

describe('Phase 10: Lambda Load Test', () => {
  test('sustained concurrent Lambda invocations (20 VUs × 10 rounds = 200 total)', async () => {
    const concurrency = 20;
    const rounds = 10;
    const allDurations: number[] = [];
    let totalSuccess = 0;
    let totalFail = 0;

    for (let round = 0; round < rounds; round++) {
      const batch = Array.from({ length: concurrency }, (_, i) =>
        invokeOnce(round * concurrency + i),
      );
      const results = await Promise.all(batch);

      for (const r of results) {
        allDurations.push(r.duration);
        if (r.success) totalSuccess++;
        else totalFail++;
      }

      console.log(
        `Round ${round + 1}/${rounds}: ${results.filter((r) => r.success).length}/${concurrency} success, ` +
          `P50: ${percentile(
            results.map((r) => r.duration),
            50,
          )}ms, ` +
          `P95: ${percentile(
            results.map((r) => r.duration),
            95,
          )}ms`,
      );

      // Small delay between rounds to avoid throttling
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const total = totalSuccess + totalFail;
    const errorRate = totalFail / total;
    const p50 = percentile(allDurations, 50);
    const p95 = percentile(allDurations, 95);
    const p99 = percentile(allDurations, 99);

    console.log('\n=== LOAD TEST SUMMARY ===');
    console.log(`Total invocations: ${total}`);
    console.log(`Success: ${totalSuccess} | Failures: ${totalFail}`);
    console.log(`Error rate: ${(errorRate * 100).toFixed(2)}%`);
    console.log(`P50: ${p50}ms | P95: ${p95}ms | P99: ${p99}ms`);

    // Assertions
    expect(errorRate).toBeLessThan(0.05); // < 5% error rate
    expect(p95).toBeLessThan(5000); // P95 < 5s
  }, 300000); // 5 minute timeout
});
