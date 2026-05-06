import * as connect from 'aws-cdk-lib/aws-connect';
import { Construct } from 'constructs';

export interface ContactFlowProps {
  environmentName: string;
  connectInstanceArn: string;
  sessionBootstrapLambdaArn: string;
}

// Stable UUIDs for contact flow action identifiers
const ACTION_IDS = {
  invokeBootstrap: 'a1b2c3d4-1111-2222-3333-aaaaaaaaaaaa',
  playGreeting:    'a1b2c3d4-1111-2222-3333-bbbbbbbbbbbb',
  disconnect:      'a1b2c3d4-1111-2222-3333-cccccccccccc',
};

export class ContactFlow extends Construct {
  public readonly flow: connect.CfnContactFlow;

  constructor(scope: Construct, id: string, props: ContactFlowProps) {
    super(scope, id);

    const flowContent = JSON.stringify({
      Version: '2019-10-30',
      StartAction: ACTION_IDS.invokeBootstrap,
      Metadata: {
        EntryPointPosition: { x: 20, y: 20 },
        ActionMetadata: {
          [ACTION_IDS.invokeBootstrap]: { Position: { x: 200, y: 20 } },
          [ACTION_IDS.playGreeting]:    { Position: { x: 450, y: 20 } },
          [ACTION_IDS.disconnect]:      { Position: { x: 700, y: 20 } },
        },
      },
      Actions: [
        {
          Identifier: ACTION_IDS.invokeBootstrap,
          Type: 'InvokeLambdaFunction',
          Parameters: {
            LambdaFunctionARN: props.sessionBootstrapLambdaArn,
            InvocationTimeLimitSeconds: '8',
          },
          Transitions: {
            NextAction: ACTION_IDS.playGreeting,
            Errors: [
              { NextAction: ACTION_IDS.playGreeting, ErrorType: 'NoMatchingError' },
            ],
            Conditions: [],
          },
        },
        {
          Identifier: ACTION_IDS.playGreeting,
          Type: 'MessageParticipant',
          Parameters: {
            Text: 'Thank you for calling. My name is Rachel, and I will be assisting you today. How can I help you?',
          },
          Transitions: {
            NextAction: ACTION_IDS.disconnect,
            Errors: [],
            Conditions: [],
          },
        },
        {
          Identifier: ACTION_IDS.disconnect,
          Type: 'DisconnectParticipant',
          Parameters: {},
          Transitions: {},
        },
      ],
    });

    this.flow = new connect.CfnContactFlow(this, 'Flow', {
      instanceArn: props.connectInstanceArn,
      name: `airline-voice-agent-flow-${props.environmentName}`,
      type: 'CONTACT_FLOW',
      content: flowContent,
      description: 'Main inbound contact flow for airline voice agent',
    });
  }
}
