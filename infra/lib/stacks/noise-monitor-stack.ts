import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/schema';
import { SpeechQualityGate } from '../constructs/speech-quality-gate';
import { NoiseMonitor } from '../constructs/noise-monitor';

export interface NoiseMonitorStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  noiseCountersTableName: string;
  noiseCountersTableArn: string;
}

export class NoiseMonitorStack extends cdk.Stack {
  public readonly speechQualityGate: SpeechQualityGate;
  public readonly noiseMonitor: NoiseMonitor;

  constructor(scope: Construct, id: string, props: NoiseMonitorStackProps) {
    super(scope, id, props);

    // Speech Quality Gate Lambda
    this.speechQualityGate = new SpeechQualityGate(this, 'SpeechQualityGate', {
      environmentName: props.config.environmentName,
    });

    // Noise Monitor Step Functions state machine
    this.noiseMonitor = new NoiseMonitor(this, 'NoiseMonitor', {
      environmentName: props.config.environmentName,
      noiseCountersTableName: props.noiseCountersTableName,
      noiseCountersTableArn: props.noiseCountersTableArn,
    });

    // Cross-stack exports
    new cdk.CfnOutput(this, 'SpeechQualityGateLambdaArn', {
      value: this.speechQualityGate.fn.functionArn,
      description: 'Speech Quality Gate Lambda ARN',
      exportName: `${props.config.environmentName}-SpeechQualityGateLambdaArn`,
    });

    new cdk.CfnOutput(this, 'NoiseMonitorStateMachineArn', {
      value: this.noiseMonitor.stateMachine.attrArn,
      description: 'Noise Monitor State Machine ARN',
      exportName: `${props.config.environmentName}-NoiseMonitorStateMachineArn`,
    });

    // Tags
    cdk.Tags.of(this).add('Project', 'airline-voice-agent');
    cdk.Tags.of(this).add('Phase', '06-noise-monitor');
    cdk.Tags.of(this).add('Environment', props.config.environmentName);
  }
}
