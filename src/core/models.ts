/**
 * Centralized model registry for Sutraworks Client AI SDK
 * Single source of truth for all model information
 * @module core/models
 */

import type { ModelInfo, ProviderName } from '../types';

/**
 * Model pricing per 1M tokens (in USD)
 */
export interface ModelPricing {
  input: number;
  output: number;
  cached?: number;
}

/**
 * Extended model information with full metadata
 */
export interface ExtendedModelInfo extends ModelInfo {
  pricing?: ModelPricing;
  aliases?: string[];
  /** Deprecation date (ISO string) - overrides parent string type */
  deprecationDate?: string;
  successor?: string;
  releaseDate?: string;
  description?: string;
}

/**
 * Model registry data - Last updated: January 2026
 * This is the single source of truth for all model information
 */
const MODEL_REGISTRY: Record<ProviderName, ExtendedModelInfo[]> = {
  openai: [
    // GPT-4o & o1 family
    {
      id: 'o1-pro',
      name: 'o1 Pro',
      provider: 'openai',
      type: 'chat',
      context_window: 200000,
      max_output_tokens: 100000,
      supports_vision: true,
      supports_tools: true,
      supports_streaming: true,
      supports_reasoning: true,
      pricing: { input: 30, output: 120 },
      releaseDate: '2025-12-05',
      description: 'OpenAI most capable reasoning model',
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: 'openai',
      type: 'chat',
      context_window: 128000,
      max_output_tokens: 16384,
      supports_vision: true,
      supports_tools: true,
      supports_streaming: true,
      supports_json_mode: true,
      pricing: { input: 2.5, output: 10 },
      releaseDate: '2024-05-13',
      description: 'Most capable multimodal model',
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      provider: 'openai',
      type: 'chat',
      context_window: 128000,
      max_output_tokens: 16384,
      supports_vision: true,
      supports_tools: true,
      supports_streaming: true,
      supports_json_mode: true,
      pricing: { input: 0.15, output: 0.6 },
      releaseDate: '2024-07-18',
      description: 'Fast and cost-effective',
    },
    // GPT-4 Turbo
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      provider: 'openai',
      type: 'chat',
      context_window: 128000,
      max_output_tokens: 4096,
      supports_vision: true,
      supports_tools: true,
      supports_streaming: true,
      supports_json_mode: true,
      pricing: { input: 10, output: 30 },
      aliases: ['gpt-4-turbo-preview', 'gpt-4-turbo-2024-04-09'],
    },
    // GPT-4
    {
      id: 'gpt-4',
      name: 'GPT-4',
      provider: 'openai',
      type: 'chat',
      context_window: 8192,
      max_output_tokens: 8192,
      supports_vision: false,
      supports_tools: true,
      supports_streaming: true,
      supports_json_mode: true,
      pricing: { input: 30, output: 60 },
    },
    // GPT-3.5
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      provider: 'openai',
      type: 'chat',
      context_window: 16385,
      max_output_tokens: 4096,
      supports_vision: false,
      supports_tools: true,
      supports_streaming: true,
      supports_json_mode: true,
      pricing: { input: 0.5, output: 1.5 },
    },
    // o1 reasoning models
    {
      id: 'o1',
      name: 'o1',
      provider: 'openai',
      type: 'chat',
      context_window: 200000,
      max_output_tokens: 100000,
      supports_vision: true,
      supports_tools: true,
      supports_streaming: true,
      supports_reasoning: true,
      pricing: { input: 15, output: 60 },
      releaseDate: '2024-12-17',
      description: 'Advanced reasoning model',
    },
    {
      id: 'o1-mini',
      name: 'o1 Mini',
      provider: 'openai',
      type: 'chat',
      context_window: 128000,
      max_output_tokens: 65536,
      supports_vision: false,
      supports_tools: true,
      supports_streaming: true,
      supports_reasoning: true,
      pricing: { input: 3, output: 12 },
    },
    // Embeddings
    {
      id: 'text-embedding-3-large',
      name: 'Text Embedding 3 Large',
      provider: 'openai',
      type: 'embedding',
      context_window: 8191,
      pricing: { input: 0.13, output: 0 },
    },
    {
      id: 'text-embedding-3-small',
      name: 'Text Embedding 3 Small',
      provider: 'openai',
      type: 'embedding',
      context_window: 8191,
      pricing: { input: 0.02, output: 0 },
    },
  ],

  anthropic: [
    // Claude 4.5
    {
      id: 'claude-opus-4-5-20251101',
      name: 'Claude Opus 4.5',
      provider: 'anthropic',
      type: 'chat',
      context_window: 500000,
      max_output_tokens: 8192,
      supports_vision: true,
      supports_tools: true,
      supports_streaming: true,
      pricing: { input: 15, output: 75 },
      releaseDate: '2025-11-01',
      description: 'Most capable Opus model for complex tasks',
    },
    {
      id: 'claude-sonnet-4-5-20250915',
      name: 'Claude Sonnet 4.5',
      provider: 'anthropic',
      type: 'chat',
      context_window: 200000,
      max_output_tokens: 8192,
      supports_vision: true,
      supports_tools: true,
      supports_streaming: true,
      pricing: { input: 3, output: 15 },
      releaseDate: '2025-09-15',
      description: 'Balanced performance and speed',
    },
    // Claude 4
    {
      id: 'claude-sonnet-4-20250514',
      name: 'Claude Sonnet 4',
      provider: 'anthropic',
      type: 'chat',
      context_window: 200000,
      max_output_tokens: 8192,
      supports_vision: true,
      supports_tools: true,
      supports_streaming: true,
      pricing: { input: 3, output: 15 },
      releaseDate: '2025-05-14',
      aliases: ['claude-4-sonnet', 'claude-sonnet-4'],
      description: 'Latest Claude model with enhanced reasoning',
    },
    // Claude 3.5
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      type: 'chat',
      context_window: 200000,
      max_output_tokens: 8192,
      supports_vision: true,
      supports_tools: true,
      supports_streaming: true,
      pricing: { input: 3, output: 15 },
      aliases: ['claude-3.5-sonnet', 'claude-3-5-sonnet'],
    },
    {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      provider: 'anthropic',
      type: 'chat',
      context_window: 200000,
      max_output_tokens: 8192,
      supports_vision: true,
      supports_tools: true,
      supports_streaming: true,
      pricing: { input: 0.8, output: 4 },
      aliases: ['claude-3.5-haiku'],
    },
    // Claude 3
    {
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      provider: 'anthropic',
      type: 'chat',
      context_window: 200000,
      max_output_tokens: 4096,
      supports_vision: true,
      supports_tools: true,
      supports_streaming: true,
      pricing: { input: 15, output: 75 },
    },
    {
      id: 'claude-3-sonnet-20240229',
      name: 'Claude 3 Sonnet',
      provider: 'anthropic',
      type: 'chat',
      context_window: 200000,
      max_output_tokens: 4096,
      supports_vision: true,
      supports_tools: true,
      supports_streaming: true,
      pricing: { input: 3, output: 15 },
    },
    {
      id: 'claude-3-haiku-20240307',
      name: 'Claude 3 Haiku',
      provider: 'anthropic',
      type: 'chat',
      context_window: 200000,
      max_output_tokens: 4096,
      supports_vision: true,
      supports_tools: true,
      supports_streaming: true,
      pricing: { input: 0.25, output: 1.25 },
    },
  ],

  google: [
    // Gemini 3
    {
      id: 'gemini-3-flash',
      name: 'Gemini 3 Flash',
      provider: 'google',
      type: 'chat',
      context_window: 2000000,
      max_output_tokens: 8192,
      supports_vision: true,
      supports_tools: true,
      supports_streaming: true,
      supports_json_mode: true,
      pricing: { input: 0.05, output: 0.2 },
      releaseDate: '2025-11-15',
      description: 'Fastest multimodel with PhD-level reasoning',
    },
    {
      id: 'gemini-3-pro',
      name: 'Gemini 3 Pro',
      provider: 'google',
      type: 'chat',
      context_window: 2000000,
      max_output_tokens: 8192,
      supports_vision: true,
      supports_tools: true,
      supports_streaming: true,
      supports_json_mode: true,
      pricing: { input: 1.25, output: 5 },
      releaseDate: '2025-11-15',
      description: 'Best performing Google model for complex tasks',
    },
    // Gemini 2.0
    {
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash',
      provider: 'google',
      type: 'chat',
      context_window: 1000000,
      max_output_tokens: 8192,
      supports_vision: true,
      supports_tools: true,
      supports_streaming: true,
      supports_json_mode: true,
      pricing: { input: 0.075, output: 0.3 },
      releaseDate: '2024-12-11',
      description: 'Latest multimodal model with 1M context',
    },
    {
      id: 'gemini-2.0-flash-thinking',
      name: 'Gemini 2.0 Flash Thinking',
      provider: 'google',
      type: 'chat',
      context_window: 1000000,
      max_output_tokens: 8192,
      supports_vision: true,
      supports_tools: true,
      supports_streaming: true,
      supports_reasoning: true,
      pricing: { input: 0.075, output: 0.3 },
    },
    // Gemini 1.5
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      provider: 'google',
      type: 'chat',
      context_window: 2000000,
      max_output_tokens: 8192,
      supports_vision: true,
      supports_tools: true,
      supports_streaming: true,
      supports_json_mode: true,
      pricing: { input: 1.25, output: 5 },
      aliases: ['gemini-1.5-pro-latest'],
    },
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      provider: 'google',
      type: 'chat',
      context_window: 1000000,
      max_output_tokens: 8192,
      supports_vision: true,
      supports_tools: true,
      supports_streaming: true,
      supports_json_mode: true,
      pricing: { input: 0.075, output: 0.3 },
    },
    // Embeddings
    {
      id: 'text-embedding-004',
      name: 'Text Embedding 004',
      provider: 'google',
      type: 'embedding',
      context_window: 2048,
      pricing: { input: 0.0001, output: 0 },
    },
  ],

  mistral: [
    {
      id: 'mistral-large-3',
      name: 'Mistral Large 3',
      provider: 'mistral',
      type: 'chat',
      context_window: 256000,
      max_output_tokens: 8192,
      supports_vision: true,
      supports_tools: true,
      supports_streaming: true,
      supports_json_mode: true,
      pricing: { input: 2, output: 6 },
      releaseDate: '2026-01-02',
    },
    {
      id: 'ministral-3',
      name: 'Ministral 3',
      provider: 'mistral',
      type: 'chat',
      context_window: 128000,
      max_output_tokens: 8192,
      supports_vision: false,
      supports_tools: true,
      supports_streaming: true,
      pricing: { input: 0.1, output: 0.3 },
    },
    {
      id: 'mistral-large-latest',
      name: 'Mistral Large',
      provider: 'mistral',
      type: 'chat',
      context_window: 128000,
      max_output_tokens: 8192,
      supports_vision: false,
      supports_tools: true,
      supports_streaming: true,
      supports_json_mode: true,
      pricing: { input: 2, output: 6 },
    },
    {
      id: 'mistral-medium-latest',
      name: 'Mistral Medium',
      provider: 'mistral',
      type: 'chat',
      context_window: 32768,
      max_output_tokens: 8192,
      supports_vision: false,
      supports_tools: true,
      supports_streaming: true,
      pricing: { input: 2.7, output: 8.1 },
      deprecated: '2024-12-01',
    },
    {
      id: 'mistral-small-latest',
      name: 'Mistral Small',
      provider: 'mistral',
      type: 'chat',
      context_window: 32768,
      max_output_tokens: 8192,
      supports_vision: false,
      supports_tools: true,
      supports_streaming: true,
      pricing: { input: 0.2, output: 0.6 },
    },
    {
      id: 'codestral-latest',
      name: 'Codestral',
      provider: 'mistral',
      type: 'chat',
      context_window: 32768,
      max_output_tokens: 8192,
      supports_vision: false,
      supports_tools: true,
      supports_streaming: true,
      pricing: { input: 0.2, output: 0.6 },
      description: 'Specialized for code generation',
    },
    {
      id: 'mistral-embed',
      name: 'Mistral Embed',
      provider: 'mistral',
      type: 'embedding',
      context_window: 8192,
      pricing: { input: 0.1, output: 0 },
    },
    {
      id: 'mixtral-8x7b-32768',
      name: 'Mixtral 8x7B',
      provider: 'mistral',
      type: 'chat',
      context_window: 32768,
      max_output_tokens: 8192,
      supports_vision: false,
      supports_tools: true,
      supports_streaming: true,
      pricing: { input: 0.24, output: 0.24 },
    },
  ],

  groq: [
    {
      id: 'llama-3.3-70b-versatile',
      name: 'Llama 3.3 70B Versatile',
      provider: 'groq',
      type: 'chat',
      context_window: 128000,
      max_output_tokens: 32768,
      supports_vision: false,
      supports_tools: true,
      supports_streaming: true,
      pricing: { input: 0.59, output: 0.79 },
    },
    {
      id: 'llama-3.1-8b-instant',
      name: 'Llama 3.1 8B Instant',
      provider: 'groq',
      type: 'chat',
      context_window: 128000,
      max_output_tokens: 8192,
      supports_vision: false,
      supports_tools: true,
      supports_streaming: true,
      pricing: { input: 0.05, output: 0.08 },
    },

    {
      id: 'gemma2-9b-it',
      name: 'Gemma 2 9B',
      provider: 'groq',
      type: 'chat',
      context_window: 8192,
      max_output_tokens: 8192,
      supports_vision: false,
      supports_tools: false,
      supports_streaming: true,
      pricing: { input: 0.2, output: 0.2 },
    },
  ],

  cohere: [
    {
      id: 'command-a',
      name: 'Command A',
      provider: 'cohere',
      type: 'chat',
      context_window: 256000,
      max_output_tokens: 4096,
      supports_vision: false,
      supports_tools: true,
      supports_streaming: true,
      pricing: { input: 2.5, output: 10 },
      releaseDate: '2025-03-01',
      description: 'Agentic model with advanced tool use',
    },
    {
      id: 'command-r-plus',
      name: 'Command R+',
      provider: 'cohere',
      type: 'chat',
      context_window: 128000,
      max_output_tokens: 4096,
      supports_vision: false,
      supports_tools: true,
      supports_streaming: true,
      pricing: { input: 2.5, output: 10 },
    },
    {
      id: 'command-r',
      name: 'Command R',
      provider: 'cohere',
      type: 'chat',
      context_window: 128000,
      max_output_tokens: 4096,
      supports_vision: false,
      supports_tools: true,
      supports_streaming: true,
      pricing: { input: 0.15, output: 0.6 },
    },
    {
      id: 'embed-english-v3.0',
      name: 'Embed English v3',
      provider: 'cohere',
      type: 'embedding',
      context_window: 512,
      pricing: { input: 0.1, output: 0 },
    },
    {
      id: 'embed-multilingual-v3.0',
      name: 'Embed Multilingual v3',
      provider: 'cohere',
      type: 'embedding',
      context_window: 512,
      pricing: { input: 0.1, output: 0 },
    },
  ],





  together: [
    {
      id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      name: 'Llama 3.3 70B Instruct Turbo',
      provider: 'together',
      type: 'chat',
      context_window: 128000,
      max_output_tokens: 8192,
      supports_vision: false,
      supports_tools: true,
      supports_streaming: true,
      pricing: { input: 0.88, output: 0.88 },
    },
    {
      id: 'meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo',
      name: 'Llama 3.2 90B Vision',
      provider: 'together',
      type: 'chat',
      context_window: 128000,
      max_output_tokens: 8192,
      supports_vision: true,
      supports_tools: true,
      supports_streaming: true,
      pricing: { input: 1.2, output: 1.2 },
    },
    {
      id: 'Qwen/Qwen2.5-72B-Instruct-Turbo',
      name: 'Qwen 2.5 72B',
      provider: 'together',
      type: 'chat',
      context_window: 32768,
      max_output_tokens: 8192,
      supports_vision: false,
      supports_tools: true,
      supports_streaming: true,
      pricing: { input: 1.2, output: 1.2 },
    },
  ],

  fireworks: [
    {
      id: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
      name: 'Llama 3.3 70B',
      provider: 'fireworks',
      type: 'chat',
      context_window: 128000,
      max_output_tokens: 16384,
      supports_vision: false,
      supports_tools: true,
      supports_streaming: true,
      pricing: { input: 0.9, output: 0.9 },
    },
    {
      id: 'accounts/fireworks/models/llama-v3p2-90b-vision-instruct',
      name: 'Llama 3.2 90B Vision',
      provider: 'fireworks',
      type: 'chat',
      context_window: 128000,
      max_output_tokens: 16384,
      supports_vision: true,
      supports_tools: true,
      supports_streaming: true,
      pricing: { input: 0.9, output: 0.9 },
    },
    {
      id: 'accounts/fireworks/models/mixtral-8x22b-instruct',
      name: 'Mixtral 8x22B',
      provider: 'fireworks',
      type: 'chat',
      context_window: 65536,
      max_output_tokens: 8192,
      supports_vision: false,
      supports_tools: true,
      supports_streaming: true,
      pricing: { input: 0.9, output: 0.9 },
    },
  ],

  perplexity: [
    {
      id: 'llama-3.1-sonar-large-128k-online',
      name: 'Sonar Large Online',
      provider: 'perplexity',
      type: 'chat',
      context_window: 128000,
      max_output_tokens: 8192,
      supports_vision: false,
      supports_tools: false,
      supports_streaming: true,
      pricing: { input: 1, output: 1 },
      description: 'Real-time web search integrated',
    },
    {
      id: 'llama-3.1-sonar-small-128k-online',
      name: 'Sonar Small Online',
      provider: 'perplexity',
      type: 'chat',
      context_window: 128000,
      max_output_tokens: 8192,
      supports_vision: false,
      supports_tools: false,
      supports_streaming: true,
      pricing: { input: 0.2, output: 0.2 },
    },
    {
      id: 'llama-3.1-sonar-large-128k-chat',
      name: 'Sonar Large Chat',
      provider: 'perplexity',
      type: 'chat',
      context_window: 128000,
      max_output_tokens: 8192,
      supports_vision: false,
      supports_tools: false,
      supports_streaming: true,
      pricing: { input: 1, output: 1 },
    },
  ],

  ollama: [
    {
      id: 'llama3.2',
      name: 'Llama 3.2',
      provider: 'ollama',
      type: 'chat',
      context_window: 128000,
      supports_vision: true,
      supports_tools: true,
      supports_streaming: true,
      description: 'Local model - requires Ollama',
    },
    {
      id: 'llama3.1',
      name: 'Llama 3.1',
      provider: 'ollama',
      type: 'chat',
      context_window: 128000,
      supports_vision: false,
      supports_tools: true,
      supports_streaming: true,
    },
    {
      id: 'mistral',
      name: 'Mistral',
      provider: 'ollama',
      type: 'chat',
      context_window: 32768,
      supports_vision: false,
      supports_tools: false,
      supports_streaming: true,
    },
    {
      id: 'codellama',
      name: 'Code Llama',
      provider: 'ollama',
      type: 'chat',
      context_window: 16384,
      supports_vision: false,
      supports_tools: false,
      supports_streaming: true,
    },
    {
      id: 'qwen2.5',
      name: 'Qwen 2.5',
      provider: 'ollama',
      type: 'chat',
      context_window: 32768,
      supports_vision: false,
      supports_tools: true,
      supports_streaming: true,
    },
    {
      id: 'nomic-embed-text',
      name: 'Nomic Embed Text',
      provider: 'ollama',
      type: 'embedding',
      context_window: 8192,
    },
    {
      id: 'mxbai-embed-large',
      name: 'Mixedbread Embed Large',
      provider: 'ollama',
      type: 'embedding',
      context_window: 512,
    },
  ],

  deepseek: [
    {
      id: 'deepseek-v3-2',
      name: 'DeepSeek V3.2',
      provider: 'deepseek',
      type: 'chat',
      context_window: 128000,
      max_output_tokens: 8192,
      supports_vision: false,
      supports_tools: true,
      supports_streaming: true,
      supports_reasoning: true,
      pricing: { input: 0.14, output: 0.28 },
      releaseDate: '2025-12-01',
    },
    {
      id: 'deepseek-chat',
      name: 'DeepSeek Chat',
      provider: 'deepseek',
      type: 'chat',
      context_window: 64000,
      max_output_tokens: 8192,
      supports_vision: false,
      supports_tools: true,
      supports_streaming: true,
      pricing: { input: 0.14, output: 0.28 },
    },
    {
      id: 'deepseek-coder',
      name: 'DeepSeek Coder',
      provider: 'deepseek',
      type: 'chat',
      context_window: 64000,
      max_output_tokens: 8192,
      supports_vision: false,
      supports_tools: true,
      supports_streaming: true,
      pricing: { input: 0.14, output: 0.28 },
      description: 'Specialized for code generation',
    },
    {
      id: 'deepseek-reasoner',
      name: 'DeepSeek Reasoner',
      provider: 'deepseek',
      type: 'chat',
      context_window: 64000,
      max_output_tokens: 8192,
      supports_vision: false,
      supports_tools: true,
      supports_streaming: true,
      supports_reasoning: true,
      pricing: { input: 0.55, output: 2.19 },
      description: 'Chain-of-thought reasoning model',
    },
  ],

  xai: [
    {
      id: 'grok-4-1',
      name: 'Grok 4.1',
      provider: 'xai',
      type: 'chat',
      context_window: 128000,
      max_output_tokens: 8192,
      supports_vision: true,
      supports_tools: true,
      supports_streaming: true,
      pricing: { input: 2, output: 10 },
      releaseDate: '2026-01-01',
    },
    {
      id: 'grok-2',
      name: 'Grok 2',
      provider: 'xai',
      type: 'chat',
      context_window: 131072,
      max_output_tokens: 8192,
      supports_vision: false,
      supports_tools: true,
      supports_streaming: true,
      pricing: { input: 2, output: 10 },
    },
    {
      id: 'grok-2-vision',
      name: 'Grok 2 Vision',
      provider: 'xai',
      type: 'chat',
      context_window: 32768,
      max_output_tokens: 8192,
      supports_vision: true,
      supports_tools: true,
      supports_streaming: true,
      pricing: { input: 2, output: 10 },
    },
    {
      id: 'grok-beta',
      name: 'Grok Beta',
      provider: 'xai',
      type: 'chat',
      context_window: 131072,
      max_output_tokens: 8192,
      supports_vision: false,
      supports_tools: true,
      supports_streaming: true,
      pricing: { input: 5, output: 15 },
    },
  ],
};

/**
 * Model Registry class for managing model information
 */
export class ModelRegistry {
  private models: Map<string, ExtendedModelInfo> = new Map();
  private providerModels: Map<ProviderName, ExtendedModelInfo[]> = new Map();
  private lastUpdated: number = Date.now();

  constructor() {
    this.loadBuiltinModels();
  }

  /**
   * Load built-in model definitions
   */
  private loadBuiltinModels(): void {
    for (const [provider, models] of Object.entries(MODEL_REGISTRY)) {
      const providerName = provider as ProviderName;
      this.providerModels.set(providerName, [...models]);

      for (const model of models) {
        const key = `${provider}:${model.id}`;
        this.models.set(key, model);

        // Also index by aliases
        if (model.aliases) {
          for (const alias of model.aliases) {
            this.models.set(`${provider}:${alias}`, model);
          }
        }
      }
    }
  }

  /**
   * Get model information by provider and model ID
   */
  getModel(provider: ProviderName, modelId: string): ExtendedModelInfo | undefined {
    return this.models.get(`${provider}:${modelId}`);
  }

  /**
   * Get all models for a provider
   */
  getModelsForProvider(provider: ProviderName): ExtendedModelInfo[] {
    return this.providerModels.get(provider) ?? [];
  }

  /**
   * Get all models across all providers
   */
  getAllModels(): ExtendedModelInfo[] {
    const allModels: ExtendedModelInfo[] = [];
    for (const models of this.providerModels.values()) {
      allModels.push(...models);
    }
    return allModels;
  }

  /**
   * Get chat models only
   */
  getChatModels(provider?: ProviderName): ExtendedModelInfo[] {
    const models = provider ? this.getModelsForProvider(provider) : this.getAllModels();
    return models.filter((m) => m.type === 'chat');
  }

  /**
   * Get embedding models only
   */
  getEmbeddingModels(provider?: ProviderName): ExtendedModelInfo[] {
    const models = provider ? this.getModelsForProvider(provider) : this.getAllModels();
    return models.filter((m) => m.type === 'embedding');
  }

  /**
   * Get models supporting a specific feature
   */
  getModelsWithFeature(
    feature: 'vision' | 'tools' | 'streaming' | 'json_mode' | 'reasoning',
    provider?: ProviderName
  ): ExtendedModelInfo[] {
    const models = provider ? this.getModelsForProvider(provider) : this.getAllModels();
    return models.filter((m) => {
      switch (feature) {
        case 'vision':
          return m.supports_vision;
        case 'tools':
          return m.supports_tools;
        case 'streaming':
          return m.supports_streaming;
        case 'json_mode':
          return m.supports_json_mode;
        case 'reasoning':
          return m.supports_reasoning;
        default:
          return false;
      }
    });
  }

  /**
   * Get non-deprecated models
   */
  getActiveModels(provider?: ProviderName): ExtendedModelInfo[] {
    const models = provider ? this.getModelsForProvider(provider) : this.getAllModels();
    return models.filter((m) => !m.deprecated);
  }

  /**
   * Check if a model exists
   */
  hasModel(provider: ProviderName, modelId: string): boolean {
    return this.models.has(`${provider}:${modelId}`);
  }

  /**
   * Get model pricing
   */
  getModelPricing(provider: ProviderName, modelId: string): ModelPricing | undefined {
    return this.getModel(provider, modelId)?.pricing;
  }

  /**
   * Get model context window
   */
  getContextWindow(provider: ProviderName, modelId: string): number | undefined {
    return this.getModel(provider, modelId)?.context_window;
  }

  /**
   * Register a custom model
   */
  registerModel(model: ExtendedModelInfo): void {
    const key = `${model.provider}:${model.id}`;
    this.models.set(key, model);

    const providerModels = this.providerModels.get(model.provider) ?? [];
    providerModels.push(model);
    this.providerModels.set(model.provider, providerModels);

    if (model.aliases) {
      for (const alias of model.aliases) {
        this.models.set(`${model.provider}:${alias}`, model);
      }
    }
  }

  /**
   * Unregister a model
   */
  unregisterModel(provider: ProviderName, modelId: string): boolean {
    const model = this.getModel(provider, modelId);
    if (!model) return false;

    this.models.delete(`${provider}:${modelId}`);

    if (model.aliases) {
      for (const alias of model.aliases) {
        this.models.delete(`${provider}:${alias}`);
      }
    }

    const providerModels = this.providerModels.get(provider);
    if (providerModels) {
      const index = providerModels.findIndex((m) => m.id === modelId);
      if (index >= 0) {
        providerModels.splice(index, 1);
      }
    }

    return true;
  }

  /**
   * Get list of all providers
   */
  getProviders(): ProviderName[] {
    return Array.from(this.providerModels.keys());
  }

  /**
   * Get when registry was last updated
   */
  getLastUpdated(): number {
    return this.lastUpdated;
  }

  /**
   * Estimate cost for a request
   */
  estimateCost(
    provider: ProviderName,
    modelId: string,
    inputTokens: number,
    outputTokens: number
  ): { input: number; output: number; total: number } | null {
    const pricing = this.getModelPricing(provider, modelId);
    if (!pricing) return null;

    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;

    return {
      input: inputCost,
      output: outputCost,
      total: inputCost + outputCost,
    };
  }

  /**
   * Find best model for requirements
   */
  findModel(requirements: {
    provider?: ProviderName;
    minContextWindow?: number;
    maxCostPerMillion?: number;
    requireVision?: boolean;
    requireTools?: boolean;
    requireStreaming?: boolean;
    requireReasoning?: boolean;
    preferLatest?: boolean;
  }): ExtendedModelInfo | null {
    let candidates = requirements.provider
      ? this.getModelsForProvider(requirements.provider)
      : this.getAllModels();

    // Filter by requirements
    candidates = candidates.filter((m) => {
      if (m.deprecated) return false;
      if (m.type !== 'chat') return false;
      if (requirements.minContextWindow && (m.context_window ?? 0) < requirements.minContextWindow) return false;
      if (requirements.maxCostPerMillion && m.pricing && m.pricing.input > requirements.maxCostPerMillion) return false;
      if (requirements.requireVision && !m.supports_vision) return false;
      if (requirements.requireTools && !m.supports_tools) return false;
      if (requirements.requireStreaming && !m.supports_streaming) return false;
      if (requirements.requireReasoning && !m.supports_reasoning) return false;
      return true;
    });

    if (candidates.length === 0) return null;

    // Sort by preference
    if (requirements.preferLatest) {
      candidates.sort((a, b) => {
        const aDate = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
        const bDate = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
        return bDate - aDate;
      });
    } else {
      // Sort by cost (cheapest first)
      candidates.sort((a, b) => {
        const aCost = a.pricing?.input ?? Infinity;
        const bCost = b.pricing?.input ?? Infinity;
        return aCost - bCost;
      });
    }

    return candidates[0];
  }
}

// Singleton instance
let registryInstance: ModelRegistry | null = null;

/**
 * Get the global model registry instance
 */
export function getModelRegistry(): ModelRegistry {
  if (!registryInstance) {
    registryInstance = new ModelRegistry();
  }
  return registryInstance;
}

/**
 * Reset the model registry (useful for testing)
 */
export function resetModelRegistry(): void {
  registryInstance = null;
}

export { MODEL_REGISTRY };
