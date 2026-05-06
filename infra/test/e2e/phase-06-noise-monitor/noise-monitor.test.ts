/**
 * Phase 6 E2E Tests: Noise Monitor & Speech Quality
 * Verifies deployed Lambda, Step Functions state machine, and CloudWatch alarm.
 * Maps to: T6.E1–E5
 */
import { LambdaClient, GetFunctionCommand, InvokeCommand } from '@aws-sdk/client-lambda';
import { SFNClient, DescribeStateMachineCommand } from '@aws-sdk/client-sfn';
import { CloudWatchClient, DescribeAlarmsCommand } from '@aws-sdk/client-cloudwatch';
import { getStackOutputs } from '../../helpers/cfn-outputs';
import { AWS_REGION, ENV_NAME, STACKS } from '../../helpers/aws-config';

const lambda = new LambdaClient({ region: AWS_REGION });
const sfn = new SFNClient({ region: AWS_REGION });
const cw = new CloudWatchClient({ region: AWS_REGION });

let outputs: Record<string, string>;

describe('Phase 6 E2E: Noise Monitor & Speech Quality', () => {
  beforeAll(async () => {
    outputs = await getStackOutputs(STACKS.noiseMonitor);
  });

  // T6.E1: Speech Quality Gate Lambda exists and is invocable
  test('Speech Quality Gate Lambda exists with Python 3.12', async () => {
    const res = await lambda.send(
      new GetFunctionCommand({
        FunctionName: `speech-quality-gate-${ENV_NAME}`,
      }),
    );
    expect(res.Configuration?.Runtime).toBe('python3.12');
    expect(res.Configuration?.State).toBe('Active');
    expect(res.Configuration?.MemorySize).toBe(256);
    expect(res.Configuration?.Timeout).toBe(10);
  });

  // T6.E2: Gate rejects short/low-confidence/low-entropy/gibberish input
  test('Gate rejects transcript below minimum length', async () => {
    const payload = JSON.stringify({
      contactId: 'test-contact-001',
      transcript: 'hi',
      words: [{ word: 'hi', confidence: 0.99 }],
      timestamp: new Date().toISOString(),
    });

    const res = await lambda.send(
      new InvokeCommand({
        FunctionName: `speech-quality-gate-${ENV_NAME}`,
        Payload: new TextEncoder().encode(payload),
      }),
    );

    const result = JSON.parse(new TextDecoder().decode(res.Payload!));
    expect(result.result).toBe('REJECT');
    expect(result.reason).toBe('MIN_LENGTH');
    expect(result.gate).toBe(1);
  });

  test('Gate rejects low-confidence transcript', async () => {
    const payload = JSON.stringify({
      contactId: 'test-contact-002',
      transcript: 'mumble mumble something',
      words: [
        { word: 'mumble', confidence: 0.2 },
        { word: 'mumble', confidence: 0.3 },
        { word: 'something', confidence: 0.1 },
      ],
      timestamp: new Date().toISOString(),
    });

    const res = await lambda.send(
      new InvokeCommand({
        FunctionName: `speech-quality-gate-${ENV_NAME}`,
        Payload: new TextEncoder().encode(payload),
      }),
    );

    const result = JSON.parse(new TextDecoder().decode(res.Payload!));
    expect(result.result).toBe('REJECT');
    expect(result.reason).toBe('LOW_CONFIDENCE');
    expect(result.gate).toBe(2);
  });

  test('Gate rejects low-entropy transcript', async () => {
    const payload = JSON.stringify({
      contactId: 'test-contact-003',
      transcript: 'aaaa',
      words: [{ word: 'aaaa', confidence: 0.9 }],
      timestamp: new Date().toISOString(),
    });

    const res = await lambda.send(
      new InvokeCommand({
        FunctionName: `speech-quality-gate-${ENV_NAME}`,
        Payload: new TextEncoder().encode(payload),
      }),
    );

    const result = JSON.parse(new TextDecoder().decode(res.Payload!));
    expect(result.result).toBe('REJECT');
    expect(result.reason).toBe('LOW_ENTROPY');
    expect(result.gate).toBe(3);
  });

  test('Gate rejects gibberish transcript', async () => {
    const payload = JSON.stringify({
      contactId: 'test-contact-004',
      transcript: 'xzqwp brtlk mnvcd fghjk',
      words: [
        { word: 'xzqwp', confidence: 0.8 },
        { word: 'brtlk', confidence: 0.8 },
        { word: 'mnvcd', confidence: 0.8 },
        { word: 'fghjk', confidence: 0.8 },
      ],
      timestamp: new Date().toISOString(),
    });

    const res = await lambda.send(
      new InvokeCommand({
        FunctionName: `speech-quality-gate-${ENV_NAME}`,
        Payload: new TextEncoder().encode(payload),
      }),
    );

    const result = JSON.parse(new TextDecoder().decode(res.Payload!));
    expect(result.result).toBe('REJECT');
    expect(result.reason).toBe('GIBBERISH');
    expect(result.gate).toBe(4);
  });

  test('Gate passes valid speech', async () => {
    const payload = JSON.stringify({
      contactId: 'test-contact-005',
      transcript: 'I would like to book a flight to New York please',
      words: [
        { word: 'I', confidence: 0.99 },
        { word: 'would', confidence: 0.98 },
        { word: 'like', confidence: 0.97 },
        { word: 'to', confidence: 0.99 },
        { word: 'book', confidence: 0.96 },
        { word: 'a', confidence: 0.99 },
        { word: 'flight', confidence: 0.95 },
        { word: 'to', confidence: 0.99 },
        { word: 'New', confidence: 0.94 },
        { word: 'York', confidence: 0.93 },
        { word: 'please', confidence: 0.98 },
      ],
      timestamp: new Date().toISOString(),
    });

    const res = await lambda.send(
      new InvokeCommand({
        FunctionName: `speech-quality-gate-${ENV_NAME}`,
        Payload: new TextEncoder().encode(payload),
      }),
    );

    const result = JSON.parse(new TextDecoder().decode(res.Payload!));
    expect(result.result).toBe('PASS');
    expect(result.reason).toBeNull();
    expect(result.gate).toBeNull();
    expect(result.transcript).toContain('book a flight');
  });

  // T6.E3: Noise Monitor state machine exists and is ACTIVE
  test('Noise Monitor state machine exists and is ACTIVE', async () => {
    const arn = outputs['NoiseMonitorStateMachineArn'];
    const res = await sfn.send(new DescribeStateMachineCommand({ stateMachineArn: arn }));
    expect(res.status).toBe('ACTIVE');
    expect(res.name).toBe(`noise-monitor-${ENV_NAME}`);
    expect(res.type).toBe('EXPRESS');
  });

  // T6.E5: CloudWatch alarm exists
  test('CloudWatch alarm exists for high noise rejection rate', async () => {
    const res = await cw.send(
      new DescribeAlarmsCommand({
        AlarmNames: [`noise-rejection-rate-high-${ENV_NAME}`],
      }),
    );
    expect(res.MetricAlarms).toBeDefined();
    expect(res.MetricAlarms!.length).toBe(1);
    expect(res.MetricAlarms![0].Namespace).toBe('AirlineVoiceAgent');
    expect(res.MetricAlarms![0].MetricName).toBe('SpeechGateOutcome');
  });
});
