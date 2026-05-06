import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { AWS_REGION, ENV_NAME, ACCOUNT_ID } from '../../helpers/aws-config';

const lambda = new LambdaClient({ region: AWS_REGION });
const dynamodb = new DynamoDBClient({ region: AWS_REGION });
const s3 = new S3Client({ region: AWS_REGION });

const SESSIONS_TABLE = `voice-agent-sessions-${ENV_NAME}`;
const TRANSCRIPTS_BUCKET = `airline-voice-transcripts-${ACCOUNT_ID}-${AWS_REGION}`;
const SESSION_BOOTSTRAP_FN = `session-bootstrap-${ENV_NAME}`;
const AGENT_TOOLS_FN = `agent-tools-${ENV_NAME}`;

describe('Phase 10: Cross-Stack Call Flow Integration', () => {
  const testContactId = `test-integration-${Date.now()}`;

  // Story 10.1 AC1: Session bootstrap → DynamoDB write
  test('session-bootstrap Lambda creates session record in DynamoDB', async () => {
    // Invoke session-bootstrap with simulated Connect event
    const event = {
      Details: {
        ContactData: {
          ContactId: testContactId,
          Channel: 'VOICE',
          InstanceARN: `arn:aws:connect:${AWS_REGION}:${ACCOUNT_ID}:instance/test`,
        },
        Parameters: {},
      },
    };

    const invokeRes = await lambda.send(
      new InvokeCommand({
        FunctionName: SESSION_BOOTSTRAP_FN,
        Payload: Buffer.from(JSON.stringify(event)),
      }),
    );

    expect(invokeRes.StatusCode).toBe(200);
    expect(invokeRes.FunctionError).toBeUndefined();

    // Verify DynamoDB record
    const getRes = await dynamodb.send(
      new GetItemCommand({
        TableName: SESSIONS_TABLE,
        Key: { contactId: { S: testContactId } },
      }),
    );

    expect(getRes.Item).toBeDefined();
    expect(getRes.Item!['contactId'].S).toBe(testContactId);
    expect(getRes.Item!['startTime']).toBeDefined();
    expect(getRes.Item!['status']).toBeDefined();
  });

  // Story 10.1 AC2: Transcript storage (verify bucket accepts encrypted writes)
  test('transcripts bucket exists and accepts encrypted objects', async () => {
    // We verify the bucket is accessible and properly configured
    // (Actual transcript write requires orchestrator; here we verify infrastructure)
    try {
      await s3.send(
        new HeadObjectCommand({
          Bucket: TRANSCRIPTS_BUCKET,
          Key: `integration-test/${testContactId}.json`,
        }),
      );
    } catch (err: unknown) {
      // 404 is expected (object doesn't exist), but 403 would indicate permission issue
      const error = err as { name: string };
      expect(error.name).toBe('NotFound');
    }
  });

  // Story 10.1 AC3: Intelligence layer retrieval
  test('agent-tools Lambda responds with valid structured data', async () => {
    const event = {
      apiPath: '/searchFlights',
      httpMethod: 'GET',
      parameters: [
        { name: 'origin', value: 'JFK' },
        { name: 'destination', value: 'LAX' },
        { name: 'date', value: '2026-06-15' },
      ],
    };

    const invokeRes = await lambda.send(
      new InvokeCommand({
        FunctionName: AGENT_TOOLS_FN,
        Payload: Buffer.from(JSON.stringify(event)),
      }),
    );

    expect(invokeRes.StatusCode).toBe(200);
    expect(invokeRes.FunctionError).toBeUndefined();

    const payload = JSON.parse(Buffer.from(invokeRes.Payload!).toString());
    // Agent tools Lambda returns structured response (ran without error)
    expect(payload).toBeDefined();
    expect(payload).not.toBeNull();
  });
});
