/**
 * Genkit AI Framework Initialization
 *
 * Provides a unified interface to Google's Genkit AI framework with
 * automatic provider selection based on environment.
 *
 * Invariants:
 * - INV-AI004: Genkit Provider Abstraction - Support Google AI Studio (dev) and Vertex AI (prod)
 */
import { genkit, type Genkit } from 'genkit';
import { retry } from 'genkit/model/middleware';
import { googleAI } from '@genkit-ai/google-genai';
import { vertexAI } from '@genkit-ai/vertexai';

/** Default retry configuration for AI calls */
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  backoffFactor: 2, // 1s → 2s → 4s
} as const;

/** Singleton AI instance */
let aiInstance: Genkit | null = null;

/** Current provider name */
let currentProvider: 'google-genai' | 'vertexai' | null = null;

/**
 * Get the initialized Genkit AI instance.
 * Uses lazy initialization with provider based on NODE_ENV.
 *
 * @throws Error if required environment variables are missing
 * @returns Initialized Genkit instance
 */
export function getAI(): Genkit {
  if (aiInstance) {
    return aiInstance;
  }

  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // Production: Use Vertex AI
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    if (!projectId) {
      throw new Error(
        'GOOGLE_CLOUD_PROJECT environment variable is required in production'
      );
    }

    aiInstance = genkit({
      plugins: [
        vertexAI({
          projectId,
          location: process.env.VERTEX_AI_LOCATION ?? 'us-central1',
        }),
      ],
    });
    currentProvider = 'vertexai';
  } else {
    // Development: Use Google AI Studio
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'GOOGLE_AI_API_KEY environment variable is required in development'
      );
    }

    aiInstance = genkit({
      plugins: [googleAI({ apiKey })],
    });
    currentProvider = 'google-genai';
  }

  return aiInstance;
}

/**
 * Get the current provider name.
 * @returns Provider name or null if not initialized
 */
export function getProviderName(): 'google-genai' | 'vertexai' | null {
  return currentProvider;
}

/** Model tiers for different use cases */
export type ModelTier = 'fast' | 'quality';

/**
 * Get the default model to use for AI operations.
 * Can be overridden via GENKIT_DEFAULT_MODEL environment variable.
 *
 * Returns provider-prefixed model name based on current environment:
 * - Development: googleai/gemini-3-pro-preview
 * - Production: vertexai/gemini-3-pro-preview
 *
 * @returns Model name string with provider prefix
 */
export function getDefaultModel(): string {
  return getModel('quality');
}

/**
 * Get a model by tier for different use cases.
 *
 * - 'fast': Gemini 3 Flash Preview - faster, good for bulk operations like context mining
 * - 'quality': Gemini 3 Pro Preview - slower but higher quality for final outputs
 *
 * @param tier - The model tier to use
 * @returns Model name string with provider prefix
 */
export function getModel(tier: ModelTier): string {
  if (process.env.GENKIT_DEFAULT_MODEL) {
    return process.env.GENKIT_DEFAULT_MODEL;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const modelName = tier === 'fast' ? 'gemini-3-flash-preview' : 'gemini-3-pro-preview';

  // Log the model being used for debugging
  console.log(`[Genkit] Using model: ${isProduction ? 'vertexai' : 'googleai'}/${modelName} (tier: ${tier})`);

  return isProduction ? `vertexai/${modelName}` : `googleai/${modelName}`;
}

/**
 * Reset the AI instance (useful for testing).
 * @internal
 */
export function resetAI(): void {
  aiInstance = null;
  currentProvider = null;
}

/**
 * Get the default retry middleware for AI operations.
 * Provides exponential backoff for transient failures.
 *
 * @param config - Optional override for retry configuration
 * @returns Retry middleware instance
 */
export function getRetryMiddleware(config?: {
  maxRetries?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
}) {
  return retry({
    maxRetries: config?.maxRetries ?? DEFAULT_RETRY_CONFIG.maxRetries,
    initialDelayMs: config?.initialDelayMs ?? DEFAULT_RETRY_CONFIG.initialDelayMs,
    backoffFactor: config?.backoffFactor ?? DEFAULT_RETRY_CONFIG.backoffFactor,
  });
}
