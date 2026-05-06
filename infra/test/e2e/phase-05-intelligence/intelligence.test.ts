/**
 * Phase 5 E2E Tests: Intelligence Stack
 * Verifies deployed Bedrock Agent, Knowledge Base, Action Group Lambda,
 * and S3 documents bucket against live AWS resources.
 * Maps to: T5.E1–E8
 */
import {
  BedrockAgentClient,
  GetAgentCommand,
  ListAgentAliasesCommand,
  ListAgentActionGroupsCommand,
  GetKnowledgeBaseCommand,
  ListDataSourcesCommand,
} from '@aws-sdk/client-bedrock-agent';
import { LambdaClient, GetFunctionCommand } from '@aws-sdk/client-lambda';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import { getStackOutputs } from '../../helpers/cfn-outputs';
import { AWS_REGION, ENV_NAME, STACKS } from '../../helpers/aws-config';

const bedrockAgent = new BedrockAgentClient({ region: AWS_REGION });
const lambda = new LambdaClient({ region: AWS_REGION });
const s3 = new S3Client({ region: AWS_REGION });

let intelligenceOutputs: Record<string, string>;
let vectorStoreOutputs: Record<string, string>;

describe('Phase 5 E2E: Intelligence Layer', () => {
  beforeAll(async () => {
    intelligenceOutputs = await getStackOutputs(STACKS.intelligence);
    vectorStoreOutputs = await getStackOutputs(STACKS.vectorStore);
  });

  // T5.E1: Bedrock Agent exists and is PREPARED
  test('Bedrock Agent exists and is PREPARED', async () => {
    const agentId = intelligenceOutputs['BedrockAgentId'];
    const res = await bedrockAgent.send(new GetAgentCommand({ agentId }));
    expect(res.agent?.agentStatus).toBe('PREPARED');
    expect(res.agent?.agentName).toBe(`airline-voice-agent-${ENV_NAME}`);
    // AC3: correct foundation model (Anthropic Claude)
    expect(res.agent?.foundationModel).toContain('anthropic.claude');
    // AC1: instruction contains Rachel persona
    expect(res.agent?.instruction).toContain('Rachel');
  });

  // T5.E2: Agent alias exists and is routable
  test('Agent alias exists and is routable', async () => {
    const agentId = intelligenceOutputs['BedrockAgentId'];
    const res = await bedrockAgent.send(new ListAgentAliasesCommand({ agentId }));
    expect(res.agentAliasSummaries).toBeDefined();
    expect(res.agentAliasSummaries!.length).toBeGreaterThanOrEqual(1);
    const liveAlias = res.agentAliasSummaries!.find((a) => a.agentAliasName === 'live');
    expect(liveAlias).toBeDefined();
    expect(liveAlias!.agentAliasStatus).toBe('PREPARED');
  });

  // T5.E3: Action group Lambda exists and uses Python 3.12
  test('Action group Lambda exists with Python 3.12 runtime', async () => {
    const res = await lambda.send(
      new GetFunctionCommand({ FunctionName: `agent-tools-${ENV_NAME}` }),
    );
    expect(res.Configuration?.Runtime).toBe('python3.12');
    expect(res.Configuration?.State).toBe('Active');
  });

  // T5.E4: Action group is attached to the agent
  test('Action group is attached to the agent', async () => {
    const agentId = intelligenceOutputs['BedrockAgentId'];
    // Get agent version (latest)
    const agentRes = await bedrockAgent.send(new GetAgentCommand({ agentId }));
    const agentVersion = agentRes.agent?.agentVersion || 'DRAFT';

    const res = await bedrockAgent.send(
      new ListAgentActionGroupsCommand({ agentId, agentVersion }),
    );
    expect(res.actionGroupSummaries).toBeDefined();
    const toolsGroup = res.actionGroupSummaries!.find(
      (g) => g.actionGroupName === `airline-tools-${ENV_NAME}`,
    );
    expect(toolsGroup).toBeDefined();
  });

  // T5.E5: Knowledge Base exists and is ACTIVE
  test('Knowledge Base exists and is ACTIVE', async () => {
    const knowledgeBaseId = intelligenceOutputs['KnowledgeBaseId'];
    const res = await bedrockAgent.send(new GetKnowledgeBaseCommand({ knowledgeBaseId }));
    expect(res.knowledgeBase?.status).toBe('ACTIVE');
    expect(res.knowledgeBase?.name).toBe(`airline-voice-kb-${ENV_NAME}`);
    // Verify storage type is OPENSEARCH_SERVERLESS
    expect(res.knowledgeBase?.storageConfiguration?.type).toBe('OPENSEARCH_SERVERLESS');
  });

  // T5.E7: KB documents S3 bucket exists
  test('KB documents S3 bucket exists', async () => {
    const bucketName = vectorStoreOutputs['DocsBucketName'];
    const res = await s3.send(new HeadBucketCommand({ Bucket: bucketName }));
    expect(res.$metadata.httpStatusCode).toBe(200);
  });

  // T5.E8: Stack exports agent and KB identifiers
  test('Stack exports contain valid agent and KB identifiers', () => {
    expect(intelligenceOutputs['BedrockAgentId']).toMatch(/^[A-Z0-9]{10}$/);
    expect(intelligenceOutputs['BedrockAgentAliasId']).toMatch(/^[A-Z0-9]{10}$/);
    expect(intelligenceOutputs['KnowledgeBaseId']).toMatch(/^[A-Z0-9]{10}$/);
  });
});
