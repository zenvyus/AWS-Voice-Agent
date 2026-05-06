/**
 * Phase 7 E2E Tests: Alarms
 * Verifies composite alarm, per-Lambda error alarms, and SNS topic.
 * Maps to: Story 7.3 AC1-AC4, Story 7.5 AC1-AC3
 */
import { CloudWatchClient, DescribeAlarmsCommand } from '@aws-sdk/client-cloudwatch';
import { SNSClient, GetTopicAttributesCommand } from '@aws-sdk/client-sns';
import { getStackOutputs } from '../../helpers/cfn-outputs';
import { AWS_REGION, ENV_NAME, ACCOUNT_ID, STACKS } from '../../helpers/aws-config';

const cw = new CloudWatchClient({ region: AWS_REGION });
const sns = new SNSClient({ region: AWS_REGION });

let outputs: Record<string, string>;

describe('Phase 7 E2E: Alarms & SNS', () => {
  beforeAll(async () => {
    outputs = await getStackOutputs(STACKS.observability);
  });

  // Story 7.3 AC1: Composite alarm exists
  test('composite alarm exists with correct name', async () => {
    const res = await cw.send(
      new DescribeAlarmsCommand({
        AlarmNames: [`airline-voice-agent-${ENV_NAME}-system-health`],
        AlarmTypes: ['CompositeAlarm'],
      }),
    );
    expect(res.CompositeAlarms).toHaveLength(1);
    expect(res.CompositeAlarms![0].AlarmName).toBe(`airline-voice-agent-${ENV_NAME}-system-health`);
  });

  // Story 7.3 AC2: Composite alarm references child alarms
  test('composite alarm references child alarms in rule', async () => {
    const res = await cw.send(
      new DescribeAlarmsCommand({
        AlarmNames: [`airline-voice-agent-${ENV_NAME}-system-health`],
        AlarmTypes: ['CompositeAlarm'],
      }),
    );
    const rule = res.CompositeAlarms![0].AlarmRule!;
    // Should reference at least one child alarm
    expect(rule).toContain('ALARM');
  });

  // Story 7.3 AC3: SNS topic exists
  test('SNS alarm topic exists', async () => {
    const topicArn = outputs['AlarmTopicArn'];
    expect(topicArn).toBeDefined();
    expect(topicArn).toContain(`airline-voice-agent-${ENV_NAME}-alarms`);

    const res = await sns.send(new GetTopicAttributesCommand({ TopicArn: topicArn }));
    expect(res.Attributes).toBeDefined();
  });

  // Story 7.3 AC4: Composite alarm action targets SNS topic
  test('composite alarm action targets SNS topic', async () => {
    const res = await cw.send(
      new DescribeAlarmsCommand({
        AlarmNames: [`airline-voice-agent-${ENV_NAME}-system-health`],
        AlarmTypes: ['CompositeAlarm'],
      }),
    );
    const alarm = res.CompositeAlarms![0];
    const topicArn = outputs['AlarmTopicArn'];
    expect(alarm.AlarmActions).toContain(topicArn);
  });

  // Story 7.5 AC1: Error alarm per Lambda
  test('per-Lambda error alarms exist', async () => {
    const expectedAlarms = [
      `speech-quality-gate-${ENV_NAME}-error-rate-${ENV_NAME}`,
      `agent-tools-${ENV_NAME}-error-rate-${ENV_NAME}`,
      `session-bootstrap-${ENV_NAME}-error-rate-${ENV_NAME}`,
    ];

    const res = await cw.send(
      new DescribeAlarmsCommand({
        AlarmNames: expectedAlarms,
        AlarmTypes: ['MetricAlarm'],
      }),
    );
    expect(res.MetricAlarms).toHaveLength(3);
  });

  // Story 7.5 AC2: Alarms publish to SNS topic
  test('Lambda error alarms have SNS alarm actions', async () => {
    const res = await cw.send(
      new DescribeAlarmsCommand({
        AlarmNames: [`speech-quality-gate-${ENV_NAME}-error-rate-${ENV_NAME}`],
        AlarmTypes: ['MetricAlarm'],
      }),
    );
    const alarm = res.MetricAlarms![0];
    const topicArn = outputs['AlarmTopicArn'];
    expect(alarm.AlarmActions).toContain(topicArn);
  });

  // Story 7.5 AC3: Alarm uses appropriate evaluation period
  test('Lambda error alarms use correct evaluation periods', async () => {
    const res = await cw.send(
      new DescribeAlarmsCommand({
        AlarmNames: [`speech-quality-gate-${ENV_NAME}-error-rate-${ENV_NAME}`],
        AlarmTypes: ['MetricAlarm'],
      }),
    );
    const alarm = res.MetricAlarms![0];
    expect(alarm.EvaluationPeriods).toBe(1);
    expect(alarm.DatapointsToAlarm).toBe(1);
  });
});
