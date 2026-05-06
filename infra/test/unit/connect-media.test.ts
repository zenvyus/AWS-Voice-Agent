import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { ConnectMediaStack } from '../../lib/stacks/connect-media-stack';
import { EnvironmentConfig } from '../../lib/config/schema';

describe('ConnectMediaStack', () => {
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
    const stack = new ConnectMediaStack(app, 'TestConnectMediaStack', {
      config: testConfig,
      dataKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/test-data-key',
      transcriptKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/test-transcript-key',
      sessionsTableName: 'voice-agent-sessions-dev',
      transcriptsBucketArn: 'arn:aws:s3:::airline-voice-transcripts-123456789012-us-east-1',
      assetsBucketArn: 'arn:aws:s3:::airline-voice-assets-123456789012-us-east-1',
      env: { account: testConfig.account, region: testConfig.region },
    });
    template = Template.fromStack(stack);
  });

  // Connect Instance
  test('creates Connect instance with correct config', () => {
    template.hasResourceProperties('AWS::Connect::Instance', {
      IdentityManagementType: 'CONNECT_MANAGED',
      InstanceAlias: 'airline-voice-agent-dev',
      Attributes: {
        InboundCalls: true,
        OutboundCalls: false,
        ContactflowLogs: true,
      },
    });
  });

  // Contact Flow
  test('creates contact flow attached to instance', () => {
    template.hasResourceProperties('AWS::Connect::ContactFlow', {
      Name: 'airline-voice-agent-flow-dev',
      Type: 'CONTACT_FLOW',
    });
  });

  test('contact flow content includes greeting message', () => {
    const flows = template.findResources('AWS::Connect::ContactFlow');
    const flowKeys = Object.keys(flows);
    expect(flowKeys.length).toBe(1);
    const contentProp = flows[flowKeys[0]].Properties.Content;
    // Content may be a string or a Fn::Join token; convert to string for inspection
    const contentStr = typeof contentProp === 'string' ? contentProp : JSON.stringify(contentProp);
    expect(contentStr).toContain('Rachel');
    expect(contentStr).toContain('MessageParticipant');
  });

  // Kinesis Video Streams
  test('creates KVS stream with 24h retention', () => {
    template.hasResourceProperties('AWS::KinesisVideo::Stream', {
      Name: 'connect-audio-dev',
      DataRetentionInHours: 24,
    });
  });

  test('KVS stream is encrypted with KMS key', () => {
    template.hasResourceProperties('AWS::KinesisVideo::Stream', {
      KmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/test-data-key',
    });
  });

  // Session Bootstrap Lambda
  test('creates session-bootstrap Lambda with Python 3.12', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'session-bootstrap-dev',
      Runtime: 'python3.12',
      MemorySize: 256,
      Timeout: 10,
    });
  });

  test('session-bootstrap Lambda has SESSIONS_TABLE_NAME env var', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'session-bootstrap-dev',
      Environment: {
        Variables: Match.objectLike({
          SESSIONS_TABLE_NAME: 'voice-agent-sessions-dev',
        }),
      },
    });
  });

  test('Connect can invoke session-bootstrap Lambda', () => {
    template.hasResourceProperties('AWS::Lambda::Permission', {
      Action: 'lambda:InvokeFunction',
      Principal: 'connect.amazonaws.com',
    });
  });

  // Transcribe Custom Vocabulary
  test('creates Transcribe custom vocabulary custom resource', () => {
    template.hasResourceProperties('Custom::AWS', {
      Create: Match.stringLikeRegexp('createVocabulary'),
    });
  });

  // Tags
  test('applies environment tags', () => {
    template.hasResourceProperties('AWS::KinesisVideo::Stream', {
      Tags: Match.arrayWith([
        Match.objectLike({ Key: 'Environment', Value: 'dev' }),
        Match.objectLike({ Key: 'Project', Value: 'airline-voice-agent' }),
      ]),
    });
  });
});
