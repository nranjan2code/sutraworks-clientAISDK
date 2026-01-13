import type { ExtendedModelInfo, ProviderName } from '../../types';
import { openaiModels } from './openai';
import { anthropicModels } from './anthropic';
import { googleModels } from './google';
import { mistralModels } from './mistral';
import { groqModels } from './groq';
import { cohereModels } from './cohere';
import { togetherModels } from './together';
import { fireworksModels } from './fireworks';
import { perplexityModels } from './perplexity';
import { ollamaModels } from './ollama';
import { deepseekModels } from './deepseek';
import { xaiModels } from './xai';

export const MODEL_REGISTRY: Record<ProviderName, ExtendedModelInfo[]> = {
    openai: openaiModels,
    anthropic: anthropicModels,
    google: googleModels,
    mistral: mistralModels,
    groq: groqModels,
    cohere: cohereModels,
    together: togetherModels,
    fireworks: fireworksModels,
    perplexity: perplexityModels,
    ollama: ollamaModels,
    deepseek: deepseekModels,
    xai: xaiModels,
};

export {
    openaiModels,
    anthropicModels,
    googleModels,
    mistralModels,
    groqModels,
    cohereModels,
    togetherModels,
    fireworksModels,
    perplexityModels,
    ollamaModels,
    deepseekModels,
    xaiModels,
};
