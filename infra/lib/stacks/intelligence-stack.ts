import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/schema';
import { AgentToolsLambda } from '../constructs/agent-tools-lambda';
import { KnowledgeBase } from '../constructs/knowledge-base';
import { BedrockAgent } from '../constructs/bedrock-agent';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';

export interface IntelligenceStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  vpc: ec2.IVpc;
  dataKeyArn: string;
  sessionsTableArn: string;
  sessionsTableName: string;
  collectionArn: string;
  kbRoleArn: string;
  docsBucketArn: string;
  docsBucketName: string;
  indexName: string;
}

export class IntelligenceStack extends cdk.Stack {
  public readonly agentToolsLambda: AgentToolsLambda;
  public readonly knowledgeBase: KnowledgeBase;
  public readonly bedrockAgent: BedrockAgent;

  constructor(scope: Construct, id: string, props: IntelligenceStackProps) {
    super(scope, id, props);

    const dataKey = kms.Key.fromKeyArn(this, 'DataKey', props.dataKeyArn);

    // Action Group Lambda
    this.agentToolsLambda = new AgentToolsLambda(this, 'AgentToolsLambda', {
      environmentName: props.config.environmentName,
      vpc: props.vpc,
      encryptionKey: dataKey,
      sessionsTableArn: props.sessionsTableArn,
      sessionsTableName: props.sessionsTableName,
    });

    // Knowledge Base (references AOSS collection from VectorStoreStack)
    this.knowledgeBase = new KnowledgeBase(this, 'KnowledgeBase', {
      environmentName: props.config.environmentName,
      region: props.config.region,
      collectionArn: props.collectionArn,
      kbRoleArn: props.kbRoleArn,
      docsBucketArn: props.docsBucketArn,
      indexName: props.indexName,
    });

    // Bedrock Agent
    this.bedrockAgent = new BedrockAgent(this, 'BedrockAgent', {
      environmentName: props.config.environmentName,
      region: props.config.region,
      accountId: props.config.account,
      actionGroupLambda: this.agentToolsLambda.fn,
      knowledgeBaseId: this.knowledgeBase.knowledgeBase.attrKnowledgeBaseId,
    });

    // Cross-stack exports
    new cdk.CfnOutput(this, 'BedrockAgentId', {
      value: this.bedrockAgent.agent.attrAgentId,
      description: 'Bedrock Agent ID',
      exportName: `${props.config.environmentName}-BedrockAgentId`,
    });

    new cdk.CfnOutput(this, 'BedrockAgentAliasId', {
      value: this.bedrockAgent.agentAlias.attrAgentAliasId,
      description: 'Bedrock Agent Alias ID',
      exportName: `${props.config.environmentName}-BedrockAgentAliasId`,
    });

    new cdk.CfnOutput(this, 'KnowledgeBaseId', {
      value: this.knowledgeBase.knowledgeBase.attrKnowledgeBaseId,
      description: 'Bedrock Knowledge Base ID',
      exportName: `${props.config.environmentName}-KnowledgeBaseId`,
    });

    new cdk.CfnOutput(this, 'AgentToolsLambdaArn', {
      value: this.agentToolsLambda.fn.functionArn,
      description: 'Agent Tools Lambda ARN',
      exportName: `${props.config.environmentName}-AgentToolsLambdaArn`,
    });

    new cdk.CfnOutput(this, 'KbDocsBucketName', {
      value: props.docsBucketName,
      description: 'Knowledge Base documents S3 bucket (from VectorStore stack)',
    });

    // Tags
    cdk.Tags.of(this).add('Project', 'airline-voice-agent');
    cdk.Tags.of(this).add('Phase', '05-intelligence');
    cdk.Tags.of(this).add('Environment', props.config.environmentName);
  }
}
