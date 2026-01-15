# Local-First Assistant (Offline RAG)

A fully offline Retrieval-Augmented Generation (RAG) assistant that runs on your machine using Ollama.

## Prerequisites

- **Ollama** installed and running (`ollama serve`).
- Models pulled: `ollama pull llama3` and `ollama pull nomic-embed-text`.

## Features

- **Offline Embeddings**: Uses `nomic-embed-text` to vectorize documents locally.
- **In-Memory Vector Store**: Zero-dependency vector search (cosine similarity).
- **Private Q&A**: Data never leaves localhost.

## Usage

```typescript
import { LocalAssistant } from './src';

const assistant = new LocalAssistant();

// 1. Digest Knowledge
await assistant.digest([
    "SutraWorks Client SDK is a TypeScript library for AI.",
    "The SDK supports BYOK (Bring Your Own Key) architecture.",
    "Ollama is used for local model inference."
]);

// 2. Ask Question
const answer = await assistant.ask("What is the SDK architecture?");
console.log(answer);
// Expected: "The SDK supports BYOK (Bring Your Own Key) architecture."
```
