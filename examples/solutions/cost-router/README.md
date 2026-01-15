# Cost-Optimized Smart Router

An intelligent routing layer that directs user prompts to the most cost-effective model capable of handling the task.

## Features

- **Dynamic Pricing**: Uses the SDK's central pricing registry (no hardcoded costs).
- **Complexity Analysis**: Classifies prompts as Low/Medium/High complexity to select between models like Llama 3 (Groq), GPT-4o-mini, or GPT-4o.
- **Budget Enforcement**: Hard limits per user tier (Free, Pro, Enterprise).
- **Multi-Provider**: Seamlessly switches between OpenAI, Groq, and Anthropic.

## Usage

```typescript
import { CostRouter } from './src';

const router = new CostRouter({ 
    openai: 'sk-...', 
    groq: 'gsk-...', 
    anthropic: 'sk-ant-...' 
});

// A complex prompt -> Routes to GPT-4o
const res1 = await router.routeAndExecute('user1', 'PRO', 
    'Analyze the geopolitical implications of...');

// A simple prompt -> Routes to Llama-3-Instant (Groq)
const res2 = await router.routeAndExecute('user1', 'PRO', 
    'What is the capital of France?');
```
