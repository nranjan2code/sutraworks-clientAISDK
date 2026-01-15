import { SutraAI } from '../../../../src';

/**
 * Local-First "Offline" Assistant
 * 
 * Demonstrates:
 * 1. Using Ollama for Embeddings (nomic-embed-text)
 * 2. In-memory Vector Store (Simple cosine similarity)
 * 3. RAG Loop running fully locally
 */

export interface Document {
    id: string;
    content: string;
    vector: number[];
}

export class LocalAssistant {
    private client: SutraAI;
    private vectorStore: Document[] = [];
    private readonly EMBED_MODEL = 'nomic-embed-text';
    private readonly CHAT_MODEL = 'llama3';

    constructor() {
        this.client = new SutraAI();
        // No keys needed for Ollama
        this.client.setKey('ollama', 'not-needed');
    }

    /**
     * Ingest documents into the local vector store
     */
    async digest(documents: string[]): Promise<void> {
        console.log(`🧠 Digesting ${documents.length} documents...`);

        for (const doc of documents) {
            const resp = await this.client.embed({
                provider: 'ollama',
                model: this.EMBED_MODEL,
                input: doc
            });

            // Ollama returns { embedding: [...] } inside data array
            // SutraAI standardizes this to { data: [{ embedding: [...] }] }
            // Wait, my impl of SutraAI standardized it to { data: [{ embedding: ... }]}

            if (resp.data && resp.data.length > 0) {
                this.vectorStore.push({
                    id: Math.random().toString(36).substring(7),
                    content: doc,
                    vector: resp.data[0].embedding
                });
            }
        }

        console.log(`✅ Stored ${this.vectorStore.length} vectors in memory.`);
    }

    /**
     * Analyze question -> Retrieve Context -> Answer
     */
    async ask(question: string): Promise<string> {
        // 1. Embed Question
        const qResp = await this.client.embed({
            provider: 'ollama',
            model: this.EMBED_MODEL,
            input: question
        });
        const qVector = qResp.data[0].embedding;

        // 2. Retrieve (Simulate Vector Search)
        const context = this.retrieve(qVector, 2); // Get top 2 matches

        // 3. Augmented Generation
        const prompt = `Context Information is below.
---------------------
${context.map(d => d.content).join('\n---\n')}
---------------------
Given the context information and not prior knowledge, answer the query.
Query: ${question}
Answer:`;

        const response = await this.client.chat({
            provider: 'ollama',
            model: this.CHAT_MODEL,
            messages: [{ role: 'user', content: prompt }]
        });

        return response.choices[0].message.content as string;
    }

    /*
     * Simple Cosine Similarity Search
     */
    private retrieve(queryVector: number[], k: number): Document[] {
        const scoredDocs = this.vectorStore.map(doc => ({
            doc,
            score: this.cosineSimilarity(queryVector, doc.vector)
        }));

        // Sort descending
        scoredDocs.sort((a, b) => b.score - a.score);

        return scoredDocs.slice(0, k).map(s => s.doc);
    }

    private cosineSimilarity(a: number[], b: number[]): number {
        let dot = 0;
        let magA = 0;
        let magB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            magA += a[i] * a[i];
            magB += b[i] * b[i];
        }
        return dot / (Math.sqrt(magA) * Math.sqrt(magB));
    }
}
