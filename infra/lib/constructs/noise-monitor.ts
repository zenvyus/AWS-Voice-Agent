import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';

export interface NoiseMonitorProps {
  environmentName: string;
  noiseCountersTableName: string;
  noiseCountersTableArn: string;
  interventionThreshold?: number;
  circuitBreakerThreshold?: number;
}

export class NoiseMonitor extends Construct {
  public readonly stateMachine: sfn.CfnStateMachine;
  public readonly highRejectionAlarm: cloudwatch.CfnAlarm;

  constructor(scope: Construct, id: string, props: NoiseMonitorProps) {
    super(scope, id);

    const interventionThreshold = props.interventionThreshold ?? 3;
    const circuitBreakerThreshold = props.circuitBreakerThreshold ?? 10;

    // Log group for state machine execution logs
    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/states/noise-monitor-${props.environmentName}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // IAM role for the state machine
    const role = new iam.Role(this, 'Role', {
      roleName: `noise-monitor-sfn-role-${props.environmentName}`,
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
      inlinePolicies: {
        dynamodb: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ['dynamodb:UpdateItem', 'dynamodb:GetItem'],
              resources: [props.noiseCountersTableArn],
            }),
          ],
        }),
        cloudwatch: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ['cloudwatch:PutMetricData'],
              resources: ['*'],
              conditions: {
                StringEquals: {
                  'cloudwatch:namespace': 'AirlineVoiceAgent',
                },
              },
            }),
          ],
        }),
        logs: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: [
                'logs:CreateLogDelivery',
                'logs:GetLogDelivery',
                'logs:UpdateLogDelivery',
                'logs:DeleteLogDelivery',
                'logs:ListLogDeliveries',
                'logs:PutResourcePolicy',
                'logs:DescribeResourcePolicies',
                'logs:DescribeLogGroups',
                'logs:PutLogEvents',
                'logs:CreateLogStream',
              ],
              resources: ['*'],
            }),
          ],
        }),
        xray: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: [
                'xray:PutTraceSegments',
                'xray:PutTelemetryRecords',
                'xray:GetSamplingRules',
                'xray:GetSamplingTargets',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // Step Functions state machine definition (ASL)
    const definition = {
      Comment: `Noise Monitor for ${props.environmentName}`,
      StartAt: 'DetermineAction',
      States: {
        DetermineAction: {
          Type: 'Choice',
          Choices: [
            {
              Variable: '$.event',
              StringEquals: 'PASS',
              Next: 'ResetCounter',
            },
            {
              Variable: '$.event',
              StringEquals: 'REJECT',
              Next: 'IncrementCounter',
            },
          ],
          Default: 'ReturnContinue',
        },
        ResetCounter: {
          Type: 'Task',
          Resource: 'arn:aws:states:::dynamodb:updateItem',
          Parameters: {
            TableName: props.noiseCountersTableName,
            Key: {
              contactId: { 'S.$': '$.contactId' },
            },
            UpdateExpression: 'SET noiseCount = :zero',
            ExpressionAttributeValues: {
              ':zero': { N: '0' },
            },
          },
          ResultPath: '$.dbResult',
          Next: 'ReturnContinue',
        },
        IncrementCounter: {
          Type: 'Task',
          Resource: 'arn:aws:states:::dynamodb:updateItem',
          Parameters: {
            TableName: props.noiseCountersTableName,
            Key: {
              contactId: { 'S.$': '$.contactId' },
            },
            UpdateExpression: 'SET noiseCount = if_not_exists(noiseCount, :zero) + :one',
            ExpressionAttributeValues: {
              ':zero': { N: '0' },
              ':one': { N: '1' },
            },
            ReturnValues: 'UPDATED_NEW',
          },
          ResultPath: '$.dbResult',
          Next: 'EvaluateThreshold',
        },
        EvaluateThreshold: {
          Type: 'Choice',
          Choices: [
            {
              Variable: '$.dbResult.Attributes.noiseCount.N',
              NumericGreaterThanEqualsPath: undefined,
              NumericGreaterThanEquals: circuitBreakerThreshold,
              Next: 'CircuitBreaker',
            },
            {
              Variable: '$.dbResult.Attributes.noiseCount.N',
              NumericGreaterThanEquals: interventionThreshold,
              Next: 'Intervene',
            },
          ],
          Default: 'ReturnContinue',
        },
        Intervene: {
          Type: 'Pass',
          Result: {
            action: 'INTERVENE',
            message: "I'm having trouble hearing you clearly. Could you move to a quieter area?",
          },
          ResultPath: '$.output',
          Next: 'EmitInterventionMetric',
        },
        CircuitBreaker: {
          Type: 'Pass',
          Result: {
            action: 'END_CALL',
            message:
              "I'm sorry, I'm unable to hear you clearly enough to continue. Please try calling back from a quieter location.",
          },
          ResultPath: '$.output',
          Next: 'EmitCircuitBreakerMetric',
        },
        EmitInterventionMetric: {
          Type: 'Task',
          Resource: 'arn:aws:states:::aws-sdk:cloudwatch:putMetricData',
          Parameters: {
            Namespace: 'AirlineVoiceAgent',
            MetricData: [
              {
                MetricName: 'NoiseIntervention',
                Value: 1,
                Unit: 'Count',
                Dimensions: [
                  { Name: 'Type', Value: 'INTERVENE' },
                  { Name: 'Environment', Value: props.environmentName },
                ],
              },
            ],
          },
          ResultPath: null,
          Next: 'ReturnAction',
        },
        EmitCircuitBreakerMetric: {
          Type: 'Task',
          Resource: 'arn:aws:states:::aws-sdk:cloudwatch:putMetricData',
          Parameters: {
            Namespace: 'AirlineVoiceAgent',
            MetricData: [
              {
                MetricName: 'NoiseIntervention',
                Value: 1,
                Unit: 'Count',
                Dimensions: [
                  { Name: 'Type', Value: 'END_CALL' },
                  { Name: 'Environment', Value: props.environmentName },
                ],
              },
            ],
          },
          ResultPath: null,
          Next: 'ReturnAction',
        },
        ReturnContinue: {
          Type: 'Pass',
          Result: { action: 'CONTINUE' },
          End: true,
        },
        ReturnAction: {
          Type: 'Pass',
          InputPath: '$.output',
          End: true,
        },
      },
    };

    // Remove the undefined field from EvaluateThreshold
    delete (definition.States.EvaluateThreshold as any).Choices[0].NumericGreaterThanEqualsPath;

    this.stateMachine = new sfn.CfnStateMachine(this, 'StateMachine', {
      stateMachineName: `noise-monitor-${props.environmentName}`,
      stateMachineType: 'EXPRESS',
      roleArn: role.roleArn,
      definitionString: JSON.stringify(definition),
      loggingConfiguration: {
        destinations: [
          {
            cloudWatchLogsLogGroup: {
              logGroupArn: logGroup.logGroupArn,
            },
          },
        ],
        includeExecutionData: true,
        level: 'ALL',
      },
      tracingConfiguration: {
        enabled: true,
      },
    });

    // CloudWatch alarm for high noise rejection rate
    this.highRejectionAlarm = new cloudwatch.CfnAlarm(this, 'HighRejectionAlarm', {
      alarmName: `noise-rejection-rate-high-${props.environmentName}`,
      alarmDescription: 'Noise rejection rate exceeds 80% over 5 minutes',
      namespace: 'AirlineVoiceAgent',
      metricName: 'SpeechGateOutcome',
      dimensions: [
        { name: 'Result', value: 'REJECT' },
        { name: 'Environment', value: props.environmentName },
      ],
      statistic: 'Sum',
      period: 300,
      evaluationPeriods: 1,
      threshold: 80,
      comparisonOperator: 'GreaterThanThreshold',
      treatMissingData: 'notBreaching',
    });
  }
}
