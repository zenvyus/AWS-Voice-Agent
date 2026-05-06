/**
 * Phase 5 Integration Tests: Intelligence Stack
 * Verifies CloudFormation stack outputs and cross-stack exports.
 * Maps to: T5.I1, T5.I2, T5.I3
 */
import { getStackOutputs } from '../../helpers/cfn-outputs';
import { STACKS } from '../../helpers/aws-config';

describe('Phase 5 Integration: Intelligence Stack Outputs', () => {
  let outputs: Record<string, string>;

  beforeAll(async () => {
    outputs = await getStackOutputs(STACKS.intelligence);
  });

  // T5.I1: Stack has BedrockAgentId output
  test('stack has BedrockAgentId output', () => {
    expect(outputs['BedrockAgentId']).toBeDefined();
    expect(outputs['BedrockAgentId']).toMatch(/^[A-Z0-9]{10}$/);
  });

  // T5.I2: Stack has BedrockAgentAliasId output
  test('stack has BedrockAgentAliasId output', () => {
    expect(outputs['BedrockAgentAliasId']).toBeDefined();
    expect(outputs['BedrockAgentAliasId']).toMatch(/^[A-Z0-9]{10}$/);
  });

  // T5.I3: Stack has KnowledgeBaseId output
  test('stack has KnowledgeBaseId output', () => {
    expect(outputs['KnowledgeBaseId']).toBeDefined();
    expect(outputs['KnowledgeBaseId']).toMatch(/^[A-Z0-9]{10}$/);
  });

  test('stack has AgentToolsLambdaArn output', () => {
    expect(outputs['AgentToolsLambdaArn']).toBeDefined();
    expect(outputs['AgentToolsLambdaArn']).toMatch(/^arn:aws:lambda:/);
  });

  test('stack has KbDocsBucketName output', () => {
    expect(outputs['KbDocsBucketName']).toBeDefined();
    expect(outputs['KbDocsBucketName']).toContain('airline-voice-kb-docs');
  });
});

describe('Phase 5 Integration: VectorStore Stack Outputs', () => {
  let outputs: Record<string, string>;

  beforeAll(async () => {
    outputs = await getStackOutputs(STACKS.vectorStore);
  });

  test('stack has CollectionEndpoint output', () => {
    expect(outputs['CollectionEndpoint']).toBeDefined();
    expect(outputs['CollectionEndpoint']).toContain('.aoss.amazonaws.com');
  });

  test('stack has CollectionArn output', () => {
    expect(outputs['CollectionArn']).toBeDefined();
    expect(outputs['CollectionArn']).toMatch(/^arn:aws:aoss:/);
  });

  test('stack has KbRoleArn output', () => {
    expect(outputs['KbRoleArn']).toBeDefined();
    expect(outputs['KbRoleArn']).toMatch(/^arn:aws:iam::/);
  });

  test('stack has DocsBucketName output', () => {
    expect(outputs['DocsBucketName']).toBeDefined();
    expect(outputs['DocsBucketName']).toContain('airline-voice-kb-docs');
  });

  test('stack has IndexName output', () => {
    expect(outputs['IndexName']).toBeDefined();
    expect(outputs['IndexName']).toBe('bedrock-kb-dev');
  });
});
