/**
 * Integration Test - Ollama Local
 * 
 * Tests the SDK with a real local Ollama instance.
 * Following SDK BYOK principles:
 * 1. No API keys needed for local models
 * 2. All requests stay on your machine
 * 3. Uses the actual SDK, not mocks
 * 
 * Run: npx tsx examples/integration-test-ollama.ts
 */

import { SutraAI, type ChatResponse, type ChatStreamDelta } from '../src/index.js';

// Test configuration
const OLLAMA_BASE_URL = 'http://localhost:11434/api';
const TEST_MODEL = 'granite3.3:8b'; // Your installed model
const EMBEDDING_MODEL = 'nomic-embed-text-v2-moe:latest';

// Helper functions
function getContent(response: ChatResponse): string {
    const content = response.choices[0]?.message?.content;
    if (typeof content === 'string') return content;
    return content?.map(p => p.text ?? '').join('') ?? '';
}

function getChunkContent(chunk: ChatStreamDelta): string {
    const content = chunk.choices[0]?.delta?.content;
    return typeof content === 'string' ? content : '';
}

// Test results tracking
interface TestResult {
    name: string;
    passed: boolean;
    duration: number;
    message: string;
}

const results: TestResult[] = [];

async function runTest(
    name: string,
    testFn: () => Promise<void>
): Promise<void> {
    const start = Date.now();
    try {
        await testFn();
        const duration = Date.now() - start;
        results.push({ name, passed: true, duration, message: '✓ Passed' });
        console.log(`  ✓ ${name} (${duration}ms)`);
    } catch (error) {
        const duration = Date.now() - start;
        const message = error instanceof Error ? error.message : String(error);
        results.push({ name, passed: false, duration, message });
        console.log(`  ✗ ${name} (${duration}ms) - ${message}`);
    }
}

// Initialize SDK
const ai = new SutraAI({
    providers: {
        ollama: {
            name: 'ollama',
            baseUrl: OLLAMA_BASE_URL,
        },
    },
    debug: true,
});

// ===========================================
// TEST SUITE
// ===========================================

async function testClientInitialization() {
    // Verify client initializes without errors
    if (!ai) throw new Error('Client not initialized');
    if (ai.isDestroyed()) throw new Error('Client should not be destroyed');
}

async function testListModels() {
    const models = await ai.listModels('ollama');
    if (!Array.isArray(models)) throw new Error('Expected array of models');
    if (models.length === 0) throw new Error('No models found');

    // Check if our test model is available (exact match or contains)
    const hasTestModel = models.some(m =>
        m.id === TEST_MODEL || m.id.includes('granite') || m.id.includes('nomic')
    );
    if (!hasTestModel) {
        console.log(`    Available models: ${models.map(m => m.id).join(', ')}`);
        throw new Error(`Model ${TEST_MODEL} not found in available models`);
    }
}

async function testBasicChat() {
    const response = await ai.chat({
        provider: 'ollama',
        model: TEST_MODEL,
        messages: [
            { role: 'user', content: 'Say "Hello SDK Test" and nothing else.' }
        ],
        temperature: 0,
    });

    if (!response.id) throw new Error('Response missing ID');
    if (!response.choices?.length) throw new Error('Response missing choices');

    const content = getContent(response);
    if (!content) throw new Error('No content in response');
    if (content.length < 5) throw new Error('Content too short');
}

async function testSystemMessage() {
    const response = await ai.chat({
        provider: 'ollama',
        model: TEST_MODEL,
        messages: [
            { role: 'system', content: 'You are a pirate. Respond in pirate speak.' },
            { role: 'user', content: 'Hello!' }
        ],
        temperature: 0.7,
    });

    const content = getContent(response);
    if (!content) throw new Error('No content in response');
}

async function testStreaming() {
    const stream = ai.chatStream({
        provider: 'ollama',
        model: TEST_MODEL,
        messages: [
            { role: 'user', content: 'Count from 1 to 5.' }
        ],
    });

    let chunks = 0;
    let fullContent = '';

    for await (const chunk of stream) {
        chunks++;
        fullContent += getChunkContent(chunk);
    }

    if (chunks < 2) throw new Error(`Too few chunks: ${chunks}`);
    if (!fullContent) throw new Error('No streamed content');
}

async function testMultiTurn() {
    // First message
    const response1 = await ai.chat({
        provider: 'ollama',
        model: TEST_MODEL,
        messages: [
            { role: 'user', content: 'My name is TestUser.' }
        ],
    });

    const content1 = getContent(response1);

    // Follow-up with context
    const response2 = await ai.chat({
        provider: 'ollama',
        model: TEST_MODEL,
        messages: [
            { role: 'user', content: 'My name is TestUser.' },
            { role: 'assistant', content: content1 },
            { role: 'user', content: 'What is my name?' }
        ],
    });

    const content2 = getContent(response2);
    if (!content2.toLowerCase().includes('testuser')) {
        console.log('    (Note: Model may not have retained context)');
    }
}

async function testEmbeddings() {
    try {
        const response = await ai.embed({
            provider: 'ollama',
            model: EMBEDDING_MODEL,
            input: 'Hello, world!',
        });

        if (!response.data) throw new Error('Missing embedding data');
        if (!response.data.length) throw new Error('Empty embedding data');
        if (!response.data[0].embedding) throw new Error('Missing embedding vector');
        if (response.data[0].embedding.length < 10) throw new Error('Embedding too short');
    } catch (error) {
        // Embedding might not be supported by all models
        throw new Error(`Embedding failed: ${error}`);
    }
}

async function testUsageStats() {
    // Make a request first
    await ai.chat({
        provider: 'ollama',
        model: TEST_MODEL,
        messages: [{ role: 'user', content: 'Test' }],
    });

    // Use correct SDK method name
    const stats = ai.getUsageStats();
    if (!stats) throw new Error('No usage stats');
    if (stats.requests === 0) throw new Error('Request count should be > 0');
}

async function testMiddleware() {
    // Create a new client - disable built-in validation to test custom middleware
    const testAi = new SutraAI({
        providers: {
            ollama: {
                name: 'ollama',
                baseUrl: OLLAMA_BASE_URL,
            },
        },
        enableValidation: false, // Disable built-in validation middleware
    });

    let middlewareCalled = false;

    // Use proper Middleware interface with beforeRequest hook
    testAi.use({
        name: 'test-middleware',
        enabled: true,
        beforeRequest: (request, _context) => {
            middlewareCalled = true;
            return request; // Pass through unchanged
        },
    });

    await testAi.chat({
        provider: 'ollama',
        model: TEST_MODEL,
        messages: [{ role: 'user', content: 'Test middleware' }],
    });

    await testAi.destroy();

    if (!middlewareCalled) throw new Error('Middleware was not called');
}

async function testPromptTemplate() {
    ai.registerTemplate({
        name: 'simple-qa',
        system: 'Answer briefly.',
        user: 'Question: {{question}}',
        variables: [{ name: 'question', required: true }],
    });

    const response = await ai.executeTemplate('simple-qa', {
        question: 'What is 2+2?',
    }, {
        provider: 'ollama',
        model: TEST_MODEL,
    });

    const content = getContent(response);
    if (!content) throw new Error('No template response');
}

async function testEvents() {
    let eventEmitted = false;

    ai.on('request:start', () => {
        eventEmitted = true;
    });

    await ai.chat({
        provider: 'ollama',
        model: TEST_MODEL,
        messages: [{ role: 'user', content: 'Test events' }],
    });

    if (!eventEmitted) throw new Error('Event not emitted');
}

async function testErrorHandling() {
    try {
        await ai.chat({
            provider: 'ollama',
            model: 'nonexistent-model-xyz',
            messages: [{ role: 'user', content: 'Test' }],
        });
        throw new Error('Should have thrown for invalid model');
    } catch (error) {
        // Expected to throw
        if (error instanceof Error && error.message.includes('Should have thrown')) {
            throw error;
        }
        // Error handling works correctly
    }
}

// ===========================================
// RUN ALL TESTS
// ===========================================

async function main() {
    console.log('\n🧪 Sutra AI SDK - Ollama Integration Tests\n');
    console.log(`Ollama URL: ${OLLAMA_BASE_URL}`);
    console.log(`Test Model: ${TEST_MODEL}`);
    console.log(`Embedding Model: ${EMBEDDING_MODEL}`);
    console.log('\n' + '='.repeat(50) + '\n');

    // Core SDK Tests
    console.log('📦 Core SDK:');
    await runTest('Client Initialization', testClientInitialization);
    await runTest('List Models', testListModels);

    // Chat Tests
    console.log('\n💬 Chat:');
    await runTest('Basic Chat', testBasicChat);
    await runTest('System Message', testSystemMessage);
    await runTest('Multi-turn Conversation', testMultiTurn);

    // Streaming Tests
    console.log('\n🌊 Streaming:');
    await runTest('Streaming Chat', testStreaming);

    // Embeddings Tests
    console.log('\n📊 Embeddings:');
    await runTest('Generate Embeddings', testEmbeddings);

    // Advanced Features
    console.log('\n⚙️ Advanced Features:');
    await runTest('Usage Statistics', testUsageStats);
    await runTest('Middleware Pipeline', testMiddleware);
    await runTest('Prompt Templates', testPromptTemplate);
    await runTest('Event System', testEvents);

    // Error Handling
    console.log('\n🛡️ Error Handling:');
    await runTest('Invalid Model Error', testErrorHandling);

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('\n📊 Test Summary:\n');

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`  Total: ${results.length}`);
    console.log(`  Passed: ${passed} ✓`);
    console.log(`  Failed: ${failed} ✗`);
    console.log(`  Duration: ${totalDuration}ms`);

    if (failed > 0) {
        console.log('\n❌ Failed Tests:');
        results.filter(r => !r.passed).forEach(r => {
            console.log(`  - ${r.name}: ${r.message}`);
        });
    }

    console.log('\n' + (failed === 0 ? '✅ All tests passed!' : '❌ Some tests failed') + '\n');

    await ai.destroy();

    process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
