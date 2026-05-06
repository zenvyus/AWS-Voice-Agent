import * as cdk from 'aws-cdk-lib';
import * as connect from 'aws-cdk-lib/aws-connect';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface ConnectInstanceProps {
  environmentName: string;
  encryptionKey: kms.IKey;
  transcriptsBucket: s3.IBucket;
  assetsBucket: s3.IBucket;
}

export class ConnectInstance extends Construct {
  public readonly instance: connect.CfnInstance;

  constructor(scope: Construct, id: string, props: ConnectInstanceProps) {
    super(scope, id);

    this.instance = new connect.CfnInstance(this, 'Instance', {
      identityManagementType: 'CONNECT_MANAGED',
      instanceAlias: `airline-voice-agent-${props.environmentName}`,
      attributes: {
        inboundCalls: true,
        outboundCalls: false,
        contactflowLogs: true,
        autoResolveBestVoices: true,
      },
    });
  }
}
