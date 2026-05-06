import * as cdk from 'aws-cdk-lib';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as fs from 'fs';
import * as path from 'path';

export interface BedrockAgentProps {
  environmentName: string;
  region: string;
  accountId: string;
  actionGroupLambda: lambda.IFunction;
  knowledgeBaseId: string;
  foundationModel?: string;
}

export class BedrockAgent extends Construct {
  public readonly agent: bedrock.CfnAgent;
  public readonly agentAlias: bedrock.CfnAgentAlias;

  constructor(scope: Construct, id: string, props: BedrockAgentProps) {
    super(scope, id);

    const modelId = props.foundationModel ?? 'anthropic.claude-3-sonnet-20240229-v1:0';

    const instruction = [
      'You are Rachel, a professional airline customer service representative.',
      'You help callers with flight searches, bookings, seat selection, and general airline policy questions.',
      'Be concise, friendly, and professional.',
      'Always confirm details with the caller before making changes.',
      'Use the available tools to look up flights, create bookings, retrieve booking details, and assign seats.',
      'If you are unsure about a policy question, use the knowledge base to find the answer.',
      'Never fabricate flight numbers, prices, or booking details — always use tool results.',
      `Environment: ${props.environmentName}.`,
    ].join(' ');

    // IAM role for the Bedrock Agent
    const agentRole = new iam.Role(this, 'AgentRole', {
      roleName: `airline-voice-agent-bedrock-${props.environmentName}`,
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
      inlinePolicies: {
        invokeModel: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
              resources: [`arn:aws:bedrock:${props.region}::foundation-model/${modelId}`],
            }),
          ],
        }),
        knowledgeBase: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ['bedrock:Retrieve'],
              resources: [`arn:aws:bedrock:${props.region}:${props.accountId}:knowledge-base/*`],
            }),
          ],
        }),
        lambda: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ['lambda:InvokeFunction'],
              resources: [props.actionGroupLambda.functionArn],
            }),
          ],
        }),
      },
    });

    // Read OpenAPI schema for action group
    const apiSchemaBody = fs.readFileSync(
      path.join(__dirname, 'agent-tools-lambda', 'api-schema.json'),
      'utf-8',
    );

    // Bedrock Agent
    this.agent = new bedrock.CfnAgent(this, 'Agent', {
      agentName: `airline-voice-agent-${props.environmentName}`,
      agentResourceRoleArn: agentRole.roleArn,
      foundationModel: modelId,
      instruction,
      idleSessionTtlInSeconds: 600,
      autoPrepare: true,
      knowledgeBases: [
        {
          knowledgeBaseId: props.knowledgeBaseId,
          description:
            'Airline policies, FAQs, and procedural documents for grounding agent responses.',
          knowledgeBaseState: 'ENABLED',
        },
      ],
      actionGroups: [
        {
          actionGroupName: `airline-tools-${props.environmentName}`,
          actionGroupExecutor: {
            lambda: props.actionGroupLambda.functionArn,
          },
          apiSchema: {
            payload: apiSchemaBody,
          },
          description: 'Airline domain tools: flight search, booking, seat selection.',
        },
      ],
    });

    // Grant Bedrock permission to invoke the Lambda
    props.actionGroupLambda.addPermission('BedrockInvoke', {
      principal: new iam.ServicePrincipal('bedrock.amazonaws.com'),
      sourceArn: this.agent.attrAgentArn,
    });

    // Agent Alias
    this.agentAlias = new bedrock.CfnAgentAlias(this, 'AgentAlias', {
      agentId: this.agent.attrAgentId,
      agentAliasName: 'live',
      description: `Production-ready alias for orchestrator invocation (${props.environmentName})`,
    });

    this.agentAlias.addDependency(this.agent);
  }
}
