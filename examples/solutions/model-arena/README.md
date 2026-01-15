# Model Arena (Evaluation Tool)

An evaluation harness to run prompts against multiple LLMs simultaneously and "judge" the results using a stronger model (GPT-4o).

## Features

- **Concurrent Execution**: Uses SDK's `batch()` API to fire requests in parallel.
- **Auto-Judging**: A "Judge" LLM verifies and scores the responses (0-10).
- **Latency & Token Tracking**: Benchmarks not just quality, but speed.

## Usage

```typescript
import { ModelArena } from './src';

const arena = new ModelArena({ 
    openai: 'sk-...', 
    groq: 'gsk-...', 
    anthropic: 'sk-ant-...' 
});

const results = await arena.fight("Explain Quantum Entanglement simply", [
    { provider: 'openai', model: 'gpt-3.5-turbo' },
    { provider: 'groq', model: 'llama-3.1-8b-instant' },
    { provider: 'anthropic', model: 'claude-3-haiku-20240307' }
]);

console.table(results);
// Shows Score, Latency, and Tokens for each.
```
