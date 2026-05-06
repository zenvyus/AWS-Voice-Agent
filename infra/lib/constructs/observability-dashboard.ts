import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';

export interface ObservabilityDashboardProps {
  environmentName: string;
  lambdaFunctionNames: string[];
  stateMachineName: string;
  ecsClusterName: string;
  ecsServiceName: string;
  dynamoTableNames: string[];
  customMetricNamespace: string;
}

export class ObservabilityDashboard extends Construct {
  public readonly dashboard: cloudwatch.Dashboard;

  constructor(scope: Construct, id: string, props: ObservabilityDashboardProps) {
    super(scope, id);

    this.dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `airline-voice-agent-${props.environmentName}`,
    });

    // Lambda widgets
    const lambdaWidgets = props.lambdaFunctionNames.map(
      (fnName) =>
        new cloudwatch.GraphWidget({
          title: `Lambda: ${fnName}`,
          width: 12,
          left: [
            new cloudwatch.Metric({
              namespace: 'AWS/Lambda',
              metricName: 'Invocations',
              dimensionsMap: { FunctionName: fnName },
              statistic: 'Sum',
            }),
            new cloudwatch.Metric({
              namespace: 'AWS/Lambda',
              metricName: 'Errors',
              dimensionsMap: { FunctionName: fnName },
              statistic: 'Sum',
            }),
          ],
          right: [
            new cloudwatch.Metric({
              namespace: 'AWS/Lambda',
              metricName: 'Duration',
              dimensionsMap: { FunctionName: fnName },
              statistic: 'Average',
            }),
            new cloudwatch.Metric({
              namespace: 'AWS/Lambda',
              metricName: 'Throttles',
              dimensionsMap: { FunctionName: fnName },
              statistic: 'Sum',
            }),
          ],
        }),
    );

    // Step Functions widget
    const sfnWidget = new cloudwatch.GraphWidget({
      title: `StepFunctions: ${props.stateMachineName}`,
      width: 12,
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/States',
          metricName: 'ExecutionsStarted',
          dimensionsMap: { StateMachineArn: `*${props.stateMachineName}*` },
          statistic: 'Sum',
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/States',
          metricName: 'ExecutionsFailed',
          dimensionsMap: { StateMachineArn: `*${props.stateMachineName}*` },
          statistic: 'Sum',
        }),
      ],
      right: [
        new cloudwatch.Metric({
          namespace: 'AWS/States',
          metricName: 'ExecutionTime',
          dimensionsMap: { StateMachineArn: `*${props.stateMachineName}*` },
          statistic: 'Average',
        }),
      ],
    });

    // Fargate widget
    const fargateWidget = new cloudwatch.GraphWidget({
      title: `Fargate: ${props.ecsServiceName}`,
      width: 12,
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/ECS',
          metricName: 'CPUUtilization',
          dimensionsMap: {
            ClusterName: props.ecsClusterName,
            ServiceName: props.ecsServiceName,
          },
          statistic: 'Average',
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/ECS',
          metricName: 'MemoryUtilization',
          dimensionsMap: {
            ClusterName: props.ecsClusterName,
            ServiceName: props.ecsServiceName,
          },
          statistic: 'Average',
        }),
      ],
      right: [
        new cloudwatch.Metric({
          namespace: 'ECS/ContainerInsights',
          metricName: 'RunningTaskCount',
          dimensionsMap: {
            ClusterName: props.ecsClusterName,
            ServiceName: props.ecsServiceName,
          },
          statistic: 'Average',
        }),
      ],
    });

    // DynamoDB widgets
    const dynamoWidgets = props.dynamoTableNames.map(
      (tableName) =>
        new cloudwatch.GraphWidget({
          title: `DynamoDB: ${tableName}`,
          width: 12,
          left: [
            new cloudwatch.Metric({
              namespace: 'AWS/DynamoDB',
              metricName: 'ConsumedReadCapacityUnits',
              dimensionsMap: { TableName: tableName },
              statistic: 'Sum',
            }),
            new cloudwatch.Metric({
              namespace: 'AWS/DynamoDB',
              metricName: 'ConsumedWriteCapacityUnits',
              dimensionsMap: { TableName: tableName },
              statistic: 'Sum',
            }),
          ],
          right: [
            new cloudwatch.Metric({
              namespace: 'AWS/DynamoDB',
              metricName: 'ThrottledRequests',
              dimensionsMap: { TableName: tableName },
              statistic: 'Sum',
            }),
          ],
        }),
    );

    // Custom business metrics widget
    const customMetricsWidget = new cloudwatch.GraphWidget({
      title: 'Business Metrics: Speech Quality',
      width: 24,
      left: [
        new cloudwatch.Metric({
          namespace: props.customMetricNamespace,
          metricName: 'SpeechGateOutcome',
          dimensionsMap: {
            Result: 'REJECT',
            Environment: props.environmentName,
          },
          statistic: 'Sum',
          label: 'NoiseRejectionCount',
        }),
        new cloudwatch.Metric({
          namespace: props.customMetricNamespace,
          metricName: 'SpeechGateOutcome',
          dimensionsMap: {
            Result: 'PASS',
            Environment: props.environmentName,
          },
          statistic: 'Sum',
          label: 'SpeechPassCount',
        }),
      ],
    });

    // Assemble dashboard
    this.dashboard.addWidgets(...lambdaWidgets);
    this.dashboard.addWidgets(sfnWidget, fargateWidget);
    this.dashboard.addWidgets(...dynamoWidgets);
    this.dashboard.addWidgets(customMetricsWidget);
  }
}
