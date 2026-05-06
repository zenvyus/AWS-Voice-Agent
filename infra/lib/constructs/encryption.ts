import * as cdk from 'aws-cdk-lib';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

export interface EncryptionProps {
  environmentName: string;
}

export class Encryption extends Construct {
  public readonly dataKey: kms.Key;
  public readonly transcriptKey: kms.Key;

  constructor(scope: Construct, id: string, props: EncryptionProps) {
    super(scope, id);

    this.dataKey = new kms.Key(this, 'DataKey', {
      alias: `alias/airline-voice-agent-data-key-${props.environmentName}`,
      description: 'Encrypts DynamoDB, Aurora, ElastiCache, and assets bucket',
      enableKeyRotation: true,
      pendingWindow: cdk.Duration.days(30),
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.transcriptKey = new kms.Key(this, 'TranscriptKey', {
      alias: `alias/airline-voice-agent-transcript-key-${props.environmentName}`,
      description: 'Encrypts call transcripts bucket (separate for compliance)',
      enableKeyRotation: true,
      pendingWindow: cdk.Duration.days(30),
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
  }
}
