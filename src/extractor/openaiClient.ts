import OpenAI, { AzureOpenAI } from 'openai';
import type { PDFormerAIConfig } from '../types';

/**
 * Returns an OpenAI-compatible client configured for either standard
 * OpenAI or Azure OpenAI, depending on config.isAzure.
 */
export function createOpenAIClient(config: PDFormerAIConfig): OpenAI {
  if (config.isAzure) {
    return new AzureOpenAI({
      apiKey: config.apiKey,
      endpoint: config.endpoint,
      deployment: config.azureDeploymentName ?? config.model ?? 'gpt-4o',
      apiVersion: config.azureApiVersion ?? '2024-02-01',
    });
  }

  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.endpoint, // undefined → default OpenAI base URL
  });
}

/**
 * Calls chat completions and forces a JSON object response format.
 */
export async function callChatCompletion(
  client: OpenAI,
  config: PDFormerAIConfig,
  systemPrompt: string,
  userContent: string,
): Promise<string> {
  const response = await client.chat.completions.create({
    model: config.model ?? 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    response_format: { type: 'json_object' },
    max_tokens: config.maxTokens ?? 4096,
    temperature: config.temperature ?? 0,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI returned an empty response.');
  }
  return content;
}
