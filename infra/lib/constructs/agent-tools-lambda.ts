import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';

export interface AgentToolsLambdaProps {
  environmentName: string;
  vpc: ec2.IVpc;
  encryptionKey: kms.IKey;
  sessionsTableArn: string;
  sessionsTableName: string;
}

export class AgentToolsLambda extends Construct {
  public readonly fn: lambda.Function;

  constructor(scope: Construct, id: string, props: AgentToolsLambdaProps) {
    super(scope, id);

    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/lambda/agent-tools-${props.environmentName}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.fn = new lambda.Function(this, 'Function', {
      functionName: `agent-tools-${props.environmentName}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, 'agent-tools-lambda')),
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      environment: {
        ENVIRONMENT: props.environmentName,
        SESSIONS_TABLE: props.sessionsTableName,
      },
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      logGroup,
    });

    // DynamoDB permissions for future tool implementations
    this.fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:PutItem'],
        resources: [props.sessionsTableArn],
      }),
    );

    // KMS permissions
    props.encryptionKey.grantEncryptDecrypt(this.fn);
  }
}
