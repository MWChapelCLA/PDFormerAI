import type { PDFormerAIConfig } from "../types";

/**
 * Creates a PDFormerAIConfig from environment variables.
 *
 * Supports Azure OpenAI with these environment variables:
 * - AZURE_OPENAI_API_KEY (required)
 * - AZURE_OPENAI_ENDPOINT (required for Azure)
 * - AZURE_OPENAI_DEPLOYMENT_ID (optional, defaults to 'gpt-4o')
 * - AZURE_OPENAI_API_VERSION (optional, defaults to '2024-02-01')
 *
 * For standard OpenAI, use:
 * - OPENAI_API_KEY (required)
 * - OPENAI_MODEL (optional, defaults to 'gpt-4o')
 *
 * @param useAzure If true, configures for Azure OpenAI. If false, uses standard OpenAI.
 * @returns A PDFormerAIConfig ready to use with extractPDFSchemaData
 *
 * @example
 * ```ts
 * // Azure OpenAI
 * const config = configFromEnv(true);
 *
 * // Standard OpenAI
 * const config = configFromEnv(false);
 * ```
 */
export function configFromEnv(useAzure: boolean = true): PDFormerAIConfig {
  if (useAzure) {
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const deploymentId = process.env.AZURE_OPENAI_DEPLOYMENT_ID || "gpt-4o";
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-02-01";

    if (!apiKey) {
      throw new Error("AZURE_OPENAI_API_KEY environment variable is required");
    }

    if (!endpoint) {
      throw new Error("AZURE_OPENAI_ENDPOINT environment variable is required");
    }

    return {
      apiKey,
      endpoint,
      model: deploymentId,
      azureDeploymentName: deploymentId,
      azureApiVersion: apiVersion,
      isAzure: true,
    };
  }

  // Standard OpenAI
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o";

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }

  return {
    apiKey,
    model,
    isAzure: false,
  };
}
