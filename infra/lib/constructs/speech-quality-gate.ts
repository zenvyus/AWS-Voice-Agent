import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';

export interface SpeechQualityGateProps {
  environmentName: string;
  minLengthThreshold?: number;
  confidenceThreshold?: number;
  entropyThreshold?: number;
  gibberishThreshold?: number;
}

export class SpeechQualityGate extends Construct {
  public readonly fn: lambda.Function;

  constructor(scope: Construct, id: string, props: SpeechQualityGateProps) {
    super(scope, id);

    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/lambda/speech-quality-gate-${props.environmentName}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.fn = new lambda.Function(this, 'Function', {
      functionName: `speech-quality-gate-${props.environmentName}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, 'speech-quality-gate')),
      memorySize: 256,
      timeout: cdk.Duration.seconds(10),
      environment: {
        ENVIRONMENT: props.environmentName,
        MIN_LENGTH_THRESHOLD: String(props.minLengthThreshold ?? 3),
        CONFIDENCE_THRESHOLD: String(props.confidenceThreshold ?? 0.6),
        ENTROPY_THRESHOLD: String(props.entropyThreshold ?? 1.5),
        GIBBERISH_THRESHOLD: String(props.gibberishThreshold ?? 0.4),
      },
      logGroup,
    });

    // CloudWatch PutMetricData permission
    this.fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['cloudwatch:PutMetricData'],
        resources: ['*'],
        conditions: {
          StringEquals: {
            'cloudwatch:namespace': 'AirlineVoiceAgent',
          },
        },
      }),
    );
  }
}
