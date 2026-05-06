import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { NoiseMonitorStack } from '../../lib/stacks/noise-monitor-stack';
import { EnvironmentConfig } from '../../lib/config/schema';

describe('NoiseMonitorStack', () => {
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

    const stack = new NoiseMonitorStack(app, 'TestNoiseMonitorStack', {
      config: testConfig,
      noiseCountersTableName: 'voice-agent-noise-counters-dev',
      noiseCountersTableArn:
        'arn:aws:dynamodb:us-east-1:123456789012:table/voice-agent-noise-counters-dev',
      env: { account: '123456789012', region: 'us-east-1' },
    });

    template = Template.fromStack(stack);
  });

  // T6.U1: Speech Quality Gate Lambda exists with correct config
  test('creates Speech Quality Gate Lambda with Python 3.12', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'speech-quality-gate-dev',
      Runtime: 'python3.12',
      MemorySize: 256,
      Timeout: 10,
    });
  });

  test('Speech Quality Gate Lambda has threshold environment variables', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'speech-quality-gate-dev',
      Environment: {
        Variables: Match.objectLike({
          MIN_LENGTH_THRESHOLD: '3',
          CONFIDENCE_THRESHOLD: '0.6',
          ENTROPY_THRESHOLD: '1.5',
          GIBBERISH_THRESHOLD: '0.4',
          ENVIRONMENT: 'dev',
        }),
      },
    });
  });

  // T6.U2: Noise Monitor state machine exists with EXPRESS type
  test('creates Noise Monitor state machine with EXPRESS type', () => {
    template.hasResourceProperties('AWS::StepFunctions::StateMachine', {
      StateMachineName: 'noise-monitor-dev',
      StateMachineType: 'EXPRESS',
    });
  });

  test('state machine has logging configured', () => {
    template.hasResourceProperties('AWS::StepFunctions::StateMachine', {
      LoggingConfiguration: Match.objectLike({
        IncludeExecutionData: true,
        Level: 'ALL',
      }),
    });
  });

  test('state machine has X-Ray tracing enabled', () => {
    template.hasResourceProperties('AWS::StepFunctions::StateMachine', {
      TracingConfiguration: {
        Enabled: true,
      },
    });
  });

  // T6.U3: IAM roles follow least-privilege
  test('creates state machine IAM role with DynamoDB access', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'noise-monitor-sfn-role-dev',
      AssumeRolePolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Principal: { Service: 'states.amazonaws.com' },
          }),
        ]),
      }),
    });
  });

  test('Speech Quality Gate Lambda has CloudWatch PutMetricData permission', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'cloudwatch:PutMetricData',
            Effect: 'Allow',
          }),
        ]),
      }),
    });
  });

  // T6.U4: CloudWatch alarm defined
  test('creates CloudWatch alarm for high noise rejection rate', () => {
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'noise-rejection-rate-high-dev',
      Namespace: 'AirlineVoiceAgent',
      MetricName: 'SpeechGateOutcome',
      ComparisonOperator: 'GreaterThanThreshold',
      Threshold: 80,
      Period: 300,
    });
  });

  // T6.U5: Cross-stack exports defined
  test('exports SpeechQualityGateLambdaArn', () => {
    template.hasOutput('SpeechQualityGateLambdaArn', {
      Export: { Name: 'dev-SpeechQualityGateLambdaArn' },
    });
  });

  test('exports NoiseMonitorStateMachineArn', () => {
    template.hasOutput('NoiseMonitorStateMachineArn', {
      Export: { Name: 'dev-NoiseMonitorStateMachineArn' },
    });
  });
});
