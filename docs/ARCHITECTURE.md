# Architecture Guide

This document provides a high-level overview of the internal architecture of the `@sutraworks/client-ai-sdk` (v2.0).

## System Overview

The SDK is designed as a modular, client-side runtime for AI applications. It strictly adheres to a "Bring Your Own Key" (BYOK) architecture, ensuring that sensitive API keys never leave the client's device except when communicating directly with AI providers.

```mermaid
graph TD
    UserApp[User Application] --> Client[SutraAI Client]
    
    subgraph SDK Core
        Client --> Config[Config Manager]
        Client --> Middleware[Middleware Implementation]
        Client --> Registry[Provider Registry]
        Client --> KeyMgr[Key Manager]
    end
    
    Registry --> OpenAI[OpenAI Provider]
    Registry --> Anthropic[Anthropic Provider]
    Registry --> Others[Other Providers...]
    
    KeyMgr --> Storage[(Browser Storage)]
    
    OpenAI --> OpenAI_API((OpenAI API))
    Anthropic --> Anthropic_API((Anthropic API))
```

## Core Components

### 1. SutraAI Client (`src/core/client.ts`)
The main entry point. It orchestrates the interaction between the user's request, the middleware pipeline, and the provider registry. It manages the lifecycle of resources (events, timers) and ensures ensuring clean cleanup via `destroy()`.

### 2. Middleware Pipeline (`src/middleware/`)
All requests to the SDK pass through a middleware chain before reaching a provider. This allows for:
- **Validation**: Checking request schemas.
- **Resilience**: Retrying failed requests (exponential backoff).
- **Observability**: Logging and metrics collection.
- **Safety**: Content filtering and sanitization.

### 3. Provider Registry (`src/core/registry.ts`)
Manages the lifecycle of AI provider instances.
- **Dynamic Loading**: Providers are lazy-loaded only when requested.
- **Circuit Breakers**: Each provider is wrapped in a circuit breaker to fail fast during outages.
- **Plugin System**: Allows registering custom providers at runtime without forking the SDK.

### 4. Key Manager (`src/keys/manager.ts`)
Handles the secure storage and retrieval of API keys.
- **Storage Abstraction**: Supports `Memory`, `LocalStorage`, `SessionStorage`, and `IndexedDB`.
- **Encryption**: Uses AES-256-GCM to encrypt keys at rest using a user-provided password or ephemeral keys.
- **Race Condition Protection**: Uses an internal mutex to prevent race conditions during key reads/writes in async environments.

## Request Flow

The following sequence diagram illustrates the flow of a `chat()` completion request.

```mermaid
sequenceDiagram
    participant App as Application
    participant Client as SutraAI Client
    participant MW as Middleware Manager
    participant Reg as Provider Registry
    participant Prov as Provider Adapter
    participant KM as Key Manager
    participant API as AI Provider API

    App->>Client: chat(request)
    Client->>MW: executeRequestMiddleware(request)
    MW-->>Client: processedRequest
    
    Client->>Client: Check Deduplication & Cache
    
    Client->>Reg: getProvider(name)
    Reg-->>Client: Provider Instance
    
    Client->>Prov: chat(processedRequest)
    Prov->>KM: getApiKey(name)
    KM-->>Prov: Decrypted API Key
    
    Prov->>API: POST /v1/chat/completions
    API-->>Prov: JSON Response
    
    Prov-->>Client: ChatResponse
    
    Client->>MW: executeResponseMiddleware(response)
    MW-->>Client: finalResponse
    
    Client-->>App: finalResponse
```

## Key Storage Security Flow

How keys are securely stored and retrieved using the PBKDF2 + AES-GCM encryption scheme.

```mermaid
sequenceDiagram
    participant App as Application
    participant KM as Key Manager
    participant Enc as Encryption Util
    participant Store as Browser Storage

    note over App, Store: Setting a Key
    App->>KM: setKey("openai", "sk-...")
    KM->>Enc: encryptWithPassword("sk-...", password)
    Enc->>Enc: Derive Key (PBKDF2 600k rounds)
    Enc->>Enc: Encrypt (AES-GCM)
    Enc-->>KM: "v2|600000|salt|ciphertext"
    KM->>Store: save(data)

    note over App, Store: Using a Key
    App->>KM: getKey("openai")
    KM->>Store: load()
    Store-->>KM: "v2|600000|salt|ciphertext"
    KM->>Enc: decryptWithPassword(data, password)
    Enc->>Enc: Parse Iterations & Salt
    Enc->>Enc: Derive Key
    Enc->>Enc: Decrypt
    Enc-->>KM: "sk-..."
    KM-->>App: "sk-..."
```
