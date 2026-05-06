/**
 * Helper to fetch CloudFormation stack outputs.
 * Caches results per stack to avoid repeated API calls.
 */
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { AWS_REGION } from './aws-config';

const cfn = new CloudFormationClient({ region: AWS_REGION });
const cache = new Map<string, Record<string, string>>();

export async function getStackOutputs(stackName: string): Promise<Record<string, string>> {
  if (cache.has(stackName)) return cache.get(stackName)!;

  const res = await cfn.send(new DescribeStacksCommand({ StackName: stackName }));

  const outputs: Record<string, string> = {};
  for (const o of res.Stacks?.[0]?.Outputs ?? []) {
    if (o.OutputKey && o.OutputValue) {
      outputs[o.OutputKey] = o.OutputValue;
    }
  }
  cache.set(stackName, outputs);
  return outputs;
}
