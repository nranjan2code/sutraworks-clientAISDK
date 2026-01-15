# Browser-Based Agentic Workflow

A flexible "Agent" class that implements the ReAct (Reason + Act) loop, enabling the LLM to autonomously use tools to solve multi-step problems.

## Features

- **Auto-Loop**: Automatically handles the back-and-forth between Model -> Tool Call -> Tool Output -> Model.
- **Tool Injection**: Easily pass JS functions as tools.
- **State Management**: Maintains conversation history specifically for the agent run.

## Usage

```typescript
import { Agent } from './src';

// 1. Define Tools
const tools = {
    search_web: async (query: string) => {
        return `Results for ${query}: [Weather is Sunny]`;
    },
    calculate: async (formula: string) => {
        return "42";
    }
};

// 2. Initialize Agent
const agent = new Agent('sk-key', {
    name: 'Researcher',
    role: 'You find information and summarize it.',
    tools
});

// 3. Run
const result = await agent.run("What is the weather and what is 21 + 21?");
console.log(result);
// Agent will call search_web, then calculate, then answer:
// "The weather is Sunny and the answer is 42."
```

## Note on Tool Schemas
For this demonstration, the Agent automatically infers a simple `query` based string schema for all tools. In a real-world scenario, you would provide explicit JSON Schemas for robust argument validation.
