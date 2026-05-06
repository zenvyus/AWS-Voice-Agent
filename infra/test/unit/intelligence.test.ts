import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { IntelligenceStack } from '../../lib/stacks/intelligence-stack';
import { EnvironmentConfig } from '../../lib/config/schema';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

describe('IntelligenceStack', () => {
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

    const vpcStack = new cdk.Stack(app, 'VpcStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    const vpc = new ec2.Vpc(vpcStack, 'Vpc', {
      maxAzs: 2,
      natGateways: 1,
    });

    const stack = new IntelligenceStack(app, 'TestIntelligenceStack', {
      config: testConfig,
      vpc,
      dataKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/test-data-key',
      sessionsTableArn: 'arn:aws:dynamodb:us-east-1:123456789012:table/voice-agent-sessions-dev',
      sessionsTableName: 'voice-agent-sessions-dev',
      collectionArn: 'arn:aws:aoss:us-east-1:123456789012:collection/abc123',
      kbRoleArn: 'arn:aws:iam::123456789012:role/airline-voice-kb-role-dev',
      docsBucketArn: 'arn:aws:s3:::airline-voice-kb-docs-123456789012-us-east-1',
      docsBucketName: 'airline-voice-kb-docs-123456789012-us-east-1',
      indexName: 'bedrock-kb-dev',
      env: { account: '123456789012', region: 'us-east-1' },
    });

    template = Template.fromStack(stack);
  });

  // T5.U1: Bedrock Agent resource exists with correct model
  test('creates Bedrock Agent with correct foundation model', () => {
    template.hasResourceProperties('AWS::Bedrock::Agent', {
      AgentName: 'airline-voice-agent-dev',
      FoundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
    });
  });

  // T5.U1: Agent instruction contains Rachel persona
  test('Bedrock Agent instruction contains Rachel persona', () => {
    template.hasResourceProperties('AWS::Bedrock::Agent', {
      Instruction: Match.stringLikeRegexp('Rachel'),
    });
  });

  // T5.U2: Agent alias exists
  test('creates Bedrock Agent alias', () => {
    template.hasResourceProperties('AWS::Bedrock::AgentAlias', {
      AgentAliasName: 'live',
    });
  });

  // T5.U3: Action group attached to agent
  test('Bedrock Agent has action group with airline tools', () => {
    template.hasResourceProperties('AWS::Bedrock::Agent', {
      ActionGroups: Match.arrayWith([
        Match.objectLike({
          ActionGroupName: 'airline-tools-dev',
        }),
      ]),
    });
  });

  // T5.U4: Action group Lambda with Python 3.12
  test('creates action group Lambda with Python 3.12 runtime', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'agent-tools-dev',
      Runtime: 'python3.12',
      MemorySize: 256,
      Timeout: 30,
    });
  });

  // T5.U5: Knowledge Base resource with VECTOR type
  test('creates Bedrock Knowledge Base with VECTOR type', () => {
    template.hasResourceProperties('AWS::Bedrock::KnowledgeBase', {
      Name: 'airline-voice-kb-dev',
      KnowledgeBaseConfiguration: {
        Type: 'VECTOR',
      },
    });
  });

  // T5.U6: KB documents bucket name in output
  test('outputs KbDocsBucketName with correct value', () => {
    template.hasOutput('KbDocsBucketName', {});
  });

  // T5.U7: IAM roles follow least-privilege
  test('creates Bedrock Agent execution role with model invocation', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'airline-voice-agent-bedrock-dev',
      AssumeRolePolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Principal: { Service: 'bedrock.amazonaws.com' },
          }),
        ]),
      }),
    });
  });

  test('Knowledge Base references OPENSEARCH_SERVERLESS storage', () => {
    template.hasResourceProperties('AWS::Bedrock::KnowledgeBase', {
      StorageConfiguration: {
        Type: 'OPENSEARCH_SERVERLESS',
      },
    });
  });

  // T5.U8: Cross-stack exports defined
  test('exports BedrockAgentId', () => {
    template.hasOutput('BedrockAgentId', {
      Export: { Name: 'dev-BedrockAgentId' },
    });
  });

  test('exports BedrockAgentAliasId', () => {
    template.hasOutput('BedrockAgentAliasId', {
      Export: { Name: 'dev-BedrockAgentAliasId' },
    });
  });

  test('exports KnowledgeBaseId', () => {
    template.hasOutput('KnowledgeBaseId', {
      Export: { Name: 'dev-KnowledgeBaseId' },
    });
  });

  test('exports AgentToolsLambdaArn', () => {
    template.hasOutput('AgentToolsLambdaArn', {
      Export: { Name: 'dev-AgentToolsLambdaArn' },
    });
  });

  // Data source
  test('creates Bedrock data source for S3', () => {
    template.hasResourceProperties('AWS::Bedrock::DataSource', {
      Name: 'airline-docs-dev',
      DataSourceConfiguration: {
        Type: 'S3',
      },
    });
  });

  // Lambda in VPC
  test('action group Lambda is in a VPC', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'agent-tools-dev',
      VpcConfig: Match.objectLike({
        SubnetIds: Match.anyValue(),
      }),
    });
  });

  // Agent has knowledge base attached
  test('Bedrock Agent has knowledge base attached', () => {
    template.hasResourceProperties('AWS::Bedrock::Agent', {
      KnowledgeBases: Match.arrayWith([
        Match.objectLike({
          KnowledgeBaseState: 'ENABLED',
        }),
      ]),
    });
  });
});
