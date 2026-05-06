import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { Construct } from 'constructs';

export interface SessionBootstrapProps {
  environmentName: string;
  vpc: ec2.IVpc;
  sessionsTable: dynamodb.ITable;
  encryptionKey: kms.IKey;
}

export class SessionBootstrap extends Construct {
  public readonly fn: lambda.Function;

  constructor(scope: Construct, id: string, props: SessionBootstrapProps) {
    super(scope, id);

    this.fn = new lambda.Function(this, 'Function', {
      functionName: `session-bootstrap-${props.environmentName}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda', 'session-bootstrap')),
      memorySize: 256,
      timeout: cdk.Duration.seconds(10),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      environment: {
        SESSIONS_TABLE_NAME: props.sessionsTable.tableName,
      },
    });

    // Grant DynamoDB write access
    props.sessionsTable.grantWriteData(this.fn);

    // Grant KMS decrypt
    props.encryptionKey.grantDecrypt(this.fn);

    // Allow Connect to invoke this Lambda
    this.fn.addPermission('ConnectInvoke', {
      principal: new iam.ServicePrincipal('connect.amazonaws.com'),
      action: 'lambda:InvokeFunction',
    });
  }
}
