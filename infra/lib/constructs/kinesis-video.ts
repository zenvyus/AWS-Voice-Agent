import * as cdk from 'aws-cdk-lib';
import * as kinesisvideo from 'aws-cdk-lib/aws-kinesisvideo';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

export interface KinesisVideoProps {
  environmentName: string;
  encryptionKey: kms.IKey;
  dataRetentionHours?: number;
}

export class KinesisVideo extends Construct {
  public readonly stream: kinesisvideo.CfnStream;

  constructor(scope: Construct, id: string, props: KinesisVideoProps) {
    super(scope, id);

    this.stream = new kinesisvideo.CfnStream(this, 'Stream', {
      name: `connect-audio-${props.environmentName}`,
      dataRetentionInHours: props.dataRetentionHours ?? 24,
      kmsKeyId: props.encryptionKey.keyArn,
    });
  }
}
