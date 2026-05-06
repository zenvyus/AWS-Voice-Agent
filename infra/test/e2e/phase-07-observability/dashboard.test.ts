/**
 * Phase 7 E2E Tests: Dashboard
 * Verifies the CloudWatch dashboard is deployed with expected widgets.
 * Maps to: Story 7.1 AC1-AC6
 */
import { CloudWatchClient, GetDashboardCommand } from '@aws-sdk/client-cloudwatch';
import { AWS_REGION, ENV_NAME } from '../../helpers/aws-config';

const cw = new CloudWatchClient({ region: AWS_REGION });

describe('Phase 7 E2E: CloudWatch Dashboard', () => {
  let dashboardBody: any;

  beforeAll(async () => {
    const res = await cw.send(
      new GetDashboardCommand({
        DashboardName: `airline-voice-agent-${ENV_NAME}`,
      }),
    );
    expect(res.DashboardBody).toBeDefined();
    dashboardBody = JSON.parse(res.DashboardBody!);
  });

  // Story 7.1 AC1: Dashboard exists per environment
  test('dashboard exists with correct name', () => {
    expect(dashboardBody).toBeDefined();
    expect(dashboardBody.widgets).toBeDefined();
    expect(dashboardBody.widgets.length).toBeGreaterThan(0);
  });

  // Story 7.1 AC2: Dashboard includes Lambda widgets
  test('dashboard includes Lambda widgets for all functions', () => {
    const widgetTexts = JSON.stringify(dashboardBody.widgets);
    expect(widgetTexts).toContain('speech-quality-gate');
    expect(widgetTexts).toContain('agent-tools');
    expect(widgetTexts).toContain('session-bootstrap');
    expect(widgetTexts).toContain('AWS/Lambda');
    expect(widgetTexts).toContain('Invocations');
    expect(widgetTexts).toContain('Errors');
    expect(widgetTexts).toContain('Duration');
    expect(widgetTexts).toContain('Throttles');
  });

  // Story 7.1 AC3: Dashboard includes Step Functions widget
  test('dashboard includes Step Functions widget', () => {
    const widgetTexts = JSON.stringify(dashboardBody.widgets);
    expect(widgetTexts).toContain('noise-monitor');
    expect(widgetTexts).toContain('AWS/States');
    expect(widgetTexts).toContain('ExecutionsStarted');
    expect(widgetTexts).toContain('ExecutionsFailed');
    expect(widgetTexts).toContain('ExecutionTime');
  });

  // Story 7.1 AC4: Dashboard includes Fargate widget
  test('dashboard includes Fargate widget', () => {
    const widgetTexts = JSON.stringify(dashboardBody.widgets);
    expect(widgetTexts).toContain('orchestrator');
    expect(widgetTexts).toContain('CPUUtilization');
    expect(widgetTexts).toContain('MemoryUtilization');
    expect(widgetTexts).toContain('RunningTaskCount');
  });

  // Story 7.1 AC5: Dashboard includes DynamoDB widgets
  test('dashboard includes DynamoDB widgets', () => {
    const widgetTexts = JSON.stringify(dashboardBody.widgets);
    expect(widgetTexts).toContain('AWS/DynamoDB');
    expect(widgetTexts).toContain('ConsumedReadCapacityUnits');
    expect(widgetTexts).toContain('ConsumedWriteCapacityUnits');
    expect(widgetTexts).toContain('ThrottledRequests');
  });

  // Story 7.1 AC6: Dashboard includes custom business metrics
  test('dashboard includes custom business metrics', () => {
    const widgetTexts = JSON.stringify(dashboardBody.widgets);
    expect(widgetTexts).toContain('AirlineVoiceAgent');
    expect(widgetTexts).toContain('SpeechGateOutcome');
  });
});
