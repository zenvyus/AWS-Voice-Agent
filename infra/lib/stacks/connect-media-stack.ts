import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/schema';
import { ConnectInstance } from '../constructs/connect-instance';
import { ContactFlow } from '../constructs/contact-flow';
import { KinesisVideo } from '../constructs/kinesis-video';
import { SpeechConfig } from '../constructs/speech-config';
import { SessionBootstrap } from '../constructs/session-bootstrap';

export interface ConnectMediaStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  dataKeyArn: string;
  transcriptKeyArn: string;
  sessionsTableName: string;
  transcriptsBucketArn: string;
  assetsBucketArn: string;
}

export class ConnectMediaStack extends cdk.Stack {
  public readonly connectInstance: ConnectInstance;
  public readonly contactFlow: ContactFlow;
  public readonly kinesisVideo: KinesisVideo;
  public readonly speechConfig: SpeechConfig;
  public readonly sessionBootstrap: SessionBootstrap;

  constructor(scope: Construct, id: string, props: ConnectMediaStackProps) {
    super(scope, id, props);

    const { config } = props;

    // Import resources from previous stacks
    const vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
      tags: { Name: `airline-voice-agent-${config.environmentName}-vpc` },
    });

    const dataKey = kms.Key.fromKeyArn(this, 'DataKey', props.dataKeyArn);

    const sessionsTable = dynamodb.Table.fromTableName(
      this, 'SessionsTable', props.sessionsTableName,
    );

    const transcriptsBucket = s3.Bucket.fromBucketArn(
      this, 'TranscriptsBucket', props.transcriptsBucketArn,
    );

    const assetsBucket = s3.Bucket.fromBucketArn(
      this, 'AssetsBucket', props.assetsBucketArn,
    );

    // Connect Instance
    this.connectInstance = new ConnectInstance(this, 'Connect', {
      environmentName: config.environmentName,
      encryptionKey: dataKey,
      transcriptsBucket,
      assetsBucket,
    });

    // Session Bootstrap Lambda
    this.sessionBootstrap = new SessionBootstrap(this, 'SessionBootstrap', {
      environmentName: config.environmentName,
      vpc,
      sessionsTable,
      encryptionKey: dataKey,
    });

    // Contact Flow (depends on Connect instance and Lambda)
    this.contactFlow = new ContactFlow(this, 'ContactFlow', {
      environmentName: config.environmentName,
      connectInstanceArn: this.connectInstance.instance.attrArn,
      sessionBootstrapLambdaArn: this.sessionBootstrap.fn.functionArn,
    });

    // Kinesis Video Streams
    this.kinesisVideo = new KinesisVideo(this, 'KinesisVideo', {
      environmentName: config.environmentName,
      encryptionKey: dataKey,
    });

    // Speech Config (Transcribe vocabulary)
    this.speechConfig = new SpeechConfig(this, 'SpeechConfig', {
      environmentName: config.environmentName,
    });

    // Cross-stack exports
    new cdk.CfnOutput(this, 'ConnectInstanceArn', {
      value: this.connectInstance.instance.attrArn,
      exportName: `${config.environmentName}-ConnectInstanceArn`,
    });
    new cdk.CfnOutput(this, 'ConnectInstanceId', {
      value: this.connectInstance.instance.attrId,
      exportName: `${config.environmentName}-ConnectInstanceId`,
    });
    new cdk.CfnOutput(this, 'ContactFlowId', {
      value: this.contactFlow.flow.attrContactFlowArn,
      exportName: `${config.environmentName}-ContactFlowArn`,
    });
    new cdk.CfnOutput(this, 'KvsStreamArn', {
      value: this.kinesisVideo.stream.attrArn,
      exportName: `${config.environmentName}-KvsStreamArn`,
    });
    new cdk.CfnOutput(this, 'SessionBootstrapLambdaArn', {
      value: this.sessionBootstrap.fn.functionArn,
      exportName: `${config.environmentName}-SessionBootstrapLambdaArn`,
    });

    // Apply tags
    Object.entries(config.tags).forEach(([key, value]) => {
      cdk.Tags.of(this).add(key, value);
    });
  }
}
