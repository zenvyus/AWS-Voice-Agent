import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

export interface ObservabilityAlarmsProps {
  environmentName: string;
  lambdaFunctionNames: string[];
  existingAlarmArns: string[];
  errorRateThresholdPercent?: number;
  evaluationPeriodMinutes?: number;
}

export class ObservabilityAlarms extends Construct {
  public readonly alarmTopic: sns.Topic;
  public readonly lambdaErrorAlarms: cloudwatch.Alarm[];
  public readonly compositeAlarm: cloudwatch.CompositeAlarm;

  constructor(scope: Construct, id: string, props: ObservabilityAlarmsProps) {
    super(scope, id);

    const errorThreshold = props.errorRateThresholdPercent ?? 5;
    const evalPeriod = props.evaluationPeriodMinutes ?? 5;

    // SNS Topic for alarm notifications
    this.alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      topicName: `airline-voice-agent-${props.environmentName}-alarms`,
      displayName: `Airline Voice Agent Alarms (${props.environmentName})`,
    });

    // Per-Lambda error alarms
    this.lambdaErrorAlarms = props.lambdaFunctionNames.map((fnName) => {
      const errorsMetric = new cloudwatch.Metric({
        namespace: 'AWS/Lambda',
        metricName: 'Errors',
        dimensionsMap: { FunctionName: fnName },
        statistic: 'Sum',
        period: cdk.Duration.minutes(evalPeriod),
      });

      const invocationsMetric = new cloudwatch.Metric({
        namespace: 'AWS/Lambda',
        metricName: 'Invocations',
        dimensionsMap: { FunctionName: fnName },
        statistic: 'Sum',
        period: cdk.Duration.minutes(evalPeriod),
      });

      const errorRateMetric = new cloudwatch.MathExpression({
        expression: 'IF(invocations > 0, (errors / invocations) * 100, 0)',
        usingMetrics: {
          errors: errorsMetric,
          invocations: invocationsMetric,
        },
        period: cdk.Duration.minutes(evalPeriod),
        label: `${fnName} Error Rate %`,
      });

      const alarm = new cloudwatch.Alarm(this, `ErrorAlarm-${fnName}`, {
        alarmName: `${fnName}-error-rate-${props.environmentName}`,
        alarmDescription: `Error rate for ${fnName} exceeds ${errorThreshold}% over ${evalPeriod} minutes`,
        metric: errorRateMetric,
        threshold: errorThreshold,
        evaluationPeriods: 1,
        datapointsToAlarm: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });

      alarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));
      alarm.addOkAction(new cloudwatch_actions.SnsAction(this.alarmTopic));

      return alarm;
    });

    // Import existing alarms for composite
    const existingAlarms = props.existingAlarmArns.map((arn, idx) =>
      cloudwatch.Alarm.fromAlarmArn(this, `ImportedAlarm-${idx}`, arn),
    );

    // Composite alarm: OR logic across all child alarms
    const allAlarms = [...this.lambdaErrorAlarms, ...existingAlarms];

    const alarmRule = cloudwatch.AlarmRule.anyOf(
      ...allAlarms.map((a) => cloudwatch.AlarmRule.fromAlarm(a, cloudwatch.AlarmState.ALARM)),
    );

    this.compositeAlarm = new cloudwatch.CompositeAlarm(this, 'SystemHealthAlarm', {
      compositeAlarmName: `airline-voice-agent-${props.environmentName}-system-health`,
      alarmRule,
      alarmDescription: `Composite system health alarm for ${props.environmentName} - triggers when any child alarm is in ALARM state`,
    });

    this.compositeAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));
    this.compositeAlarm.addOkAction(new cloudwatch_actions.SnsAction(this.alarmTopic));
  }
}
