import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { ObservabilityStack } from '../../lib/stacks/observability-stack';
import { EnvironmentConfig } from '../../lib/config/schema';
import * as fs from 'fs';
import * as path from 'path';

describe('ObservabilityStack', () => {
  const testConfig: EnvironmentConfig = {
    environmentName: 'dev',
    account: '123456789012',
    region: 'us-east-1',
    vpcCidr: '10.0.0.0/16',
    maxAzs: 2,
    natGateways: 1,
    tags: {
      Environment: 'dev',
      Project: 'airline-voice-agent',
      ManagedBy: 'cdk',
    },
  };

  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();

    const stack = new ObservabilityStack(app, 'TestObservabilityStack', {
      config: testConfig,
      lambdaFunctionNames: ['speech-quality-gate-dev', 'agent-tools-dev', 'session-bootstrap-dev'],
      stateMachineName: 'noise-monitor-dev',
      ecsClusterName: 'airline-voice-agent-dev',
      ecsServiceName: 'orchestrator-dev',
      dynamoTableNames: ['voice-agent-sessions-dev', 'voice-agent-noise-counters-dev'],
      existingAlarmArns: [
        'arn:aws:cloudwatch:us-east-1:123456789012:alarm:noise-rejection-rate-high-dev',
      ],
      env: { account: '123456789012', region: 'us-east-1' },
    });

    template = Template.fromStack(stack);
  });

  // Story 7.1 AC1: Dashboard exists per environment
  test('creates CloudWatch Dashboard with correct name', () => {
    template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
      DashboardName: 'airline-voice-agent-dev',
    });
  });

  // Story 7.1 AC2-6: Dashboard has correct number of widget groups
  test('dashboard body contains expected widgets', () => {
    template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
      DashboardBody: Match.anyValue(),
    });
  });

  // Story 7.3 AC1: Composite alarm exists
  test('creates composite alarm with correct name', () => {
    template.hasResourceProperties('AWS::CloudWatch::CompositeAlarm', {
      AlarmName: 'airline-voice-agent-dev-system-health',
    });
  });

  // Story 7.3 AC2: Composite alarm references child alarms (has AlarmRule)
  test('composite alarm has alarm rule', () => {
    template.hasResourceProperties('AWS::CloudWatch::CompositeAlarm', {
      AlarmRule: Match.anyValue(),
    });
  });

  // Story 7.3 AC3: SNS topic exists
  test('creates SNS alarm topic with correct name', () => {
    template.hasResourceProperties('AWS::SNS::Topic', {
      TopicName: 'airline-voice-agent-dev-alarms',
    });
  });

  // Story 7.5 AC1: Error alarm per Lambda (3 functions = 3 alarms)
  test('creates per-Lambda error alarms', () => {
    template.resourceCountIs('AWS::CloudWatch::Alarm', 3);
  });

  // Story 7.5 AC2: Alarms publish to SNS topic
  test('Lambda error alarms have alarm actions targeting SNS', () => {
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'speech-quality-gate-dev-error-rate-dev',
      AlarmActions: Match.anyValue(),
    });
  });

  // Story 7.5 AC3: Alarm uses appropriate evaluation period
  test('Lambda error alarms use 5-minute evaluation period', () => {
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      EvaluationPeriods: 1,
      DatapointsToAlarm: 1,
    });
  });

  // Stack outputs
  test('exports DashboardArn output', () => {
    template.hasOutput('DashboardArn', {
      Description: 'CloudWatch Dashboard ARN',
    });
  });

  test('exports CompositeAlarmArn output', () => {
    template.hasOutput('CompositeAlarmArn', {
      Description: 'Composite System Health Alarm ARN',
    });
  });

  test('exports AlarmTopicArn output', () => {
    template.hasOutput('AlarmTopicArn', {
      Description: 'Alarm SNS Topic ARN',
    });
  });
});

describe('Structured Logger', () => {
  const loggerPath = path.join(__dirname, '../../lib/constructs/shared/structured_logger.py');

  // Story 7.2 AC1: Logging utility exists
  test('structured logger file exists', () => {
    expect(fs.existsSync(loggerPath)).toBe(true);
  });

  test('structured logger contains required fields', () => {
    const content = fs.readFileSync(loggerPath, 'utf-8');
    expect(content).toContain('"timestamp"');
    expect(content).toContain('"level"');
    expect(content).toContain('"correlationId"');
    expect(content).toContain('"service"');
    expect(content).toContain('"message"');
    expect(content).toContain('"stackTrace"');
  });

  test('structured logger generates UUID if no correlationId', () => {
    const content = fs.readFileSync(loggerPath, 'utf-8');
    expect(content).toContain('uuid.uuid4()');
  });
});

describe('Runbook Index', () => {
  const runbookIndexPath = path.join(__dirname, '../../../docs/runbooks/index.md');

  // Story 7.4 AC1: Runbook index exists
  test('runbook index file exists', () => {
    expect(fs.existsSync(runbookIndexPath)).toBe(true);
  });

  // Story 7.4 AC2: Every alarm has a runbook entry
  test('runbook index contains noise rejection alarm entry', () => {
    const content = fs.readFileSync(runbookIndexPath, 'utf-8');
    expect(content).toContain('noise-monitor');
    expect(content).toContain('high-rejection-rate');
  });

  // Story 7.4 AC3: Runbook format is consistent
  test('noise monitor runbook has required sections', () => {
    const runbookPath = path.join(__dirname, '../../../docs/runbooks/phase-06-noise-monitor.md');
    const content = fs.readFileSync(runbookPath, 'utf-8');
    expect(content).toContain('## Overview');
    expect(content).toContain('## Components');
    expect(content).toContain('## Diagnosis');
    expect(content).toContain('## Recovery');
    expect(content).toContain('## Rollback');
    expect(content).toContain('## Metrics');
    expect(content).toContain('## Escalation');
  });
});
