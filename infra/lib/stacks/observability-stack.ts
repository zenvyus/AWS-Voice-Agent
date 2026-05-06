import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/schema';
import { ObservabilityDashboard } from '../constructs/observability-dashboard';
import { ObservabilityAlarms } from '../constructs/observability-alarms';

export interface ObservabilityStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  lambdaFunctionNames: string[];
  stateMachineName: string;
  ecsClusterName: string;
  ecsServiceName: string;
  dynamoTableNames: string[];
  existingAlarmArns: string[];
}

export class ObservabilityStack extends cdk.Stack {
  public readonly dashboard: ObservabilityDashboard;
  public readonly alarms: ObservabilityAlarms;

  constructor(scope: Construct, id: string, props: ObservabilityStackProps) {
    super(scope, id, props);

    const { config } = props;

    // Dashboard
    this.dashboard = new ObservabilityDashboard(this, 'Dashboard', {
      environmentName: config.environmentName,
      lambdaFunctionNames: props.lambdaFunctionNames,
      stateMachineName: props.stateMachineName,
      ecsClusterName: props.ecsClusterName,
      ecsServiceName: props.ecsServiceName,
      dynamoTableNames: props.dynamoTableNames,
      customMetricNamespace: 'AirlineVoiceAgent',
    });

    // Alarms
    this.alarms = new ObservabilityAlarms(this, 'Alarms', {
      environmentName: config.environmentName,
      lambdaFunctionNames: props.lambdaFunctionNames,
      existingAlarmArns: props.existingAlarmArns,
    });

    // Outputs
    new cdk.CfnOutput(this, 'DashboardArn', {
      value: this.dashboard.dashboard.dashboardArn,
      description: 'CloudWatch Dashboard ARN',
      exportName: `${config.environmentName}-ObservabilityDashboardArn`,
    });

    new cdk.CfnOutput(this, 'CompositeAlarmArn', {
      value: this.alarms.compositeAlarm.alarmArn,
      description: 'Composite System Health Alarm ARN',
      exportName: `${config.environmentName}-CompositeAlarmArn`,
    });

    new cdk.CfnOutput(this, 'AlarmTopicArn', {
      value: this.alarms.alarmTopic.topicArn,
      description: 'Alarm SNS Topic ARN',
      exportName: `${config.environmentName}-AlarmTopicArn`,
    });

    // Tags
    cdk.Tags.of(this).add('Project', 'airline-voice-agent');
    cdk.Tags.of(this).add('Phase', '07-observability');
    cdk.Tags.of(this).add('Environment', config.environmentName);
  }
}
