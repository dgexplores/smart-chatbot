import { GoogleGenerativeAI } from '@google/generative-ai';

export interface RAGChunk {
  id: string;
  score?: number;
  payload: {
    documentId: string;
    title: string;
    category: string;
    content: string;
    source: string;
  };
}

// Collection configuration
const COLLECTION_NAME = 'company_knowledge';
const VECTOR_SIZE = 768; // Size for gemini text-embedding-004

// Helper to get Gemini embeddings natively
const getEmbedding = async (text: string): Promise<number[]> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Return a dummy vector of 768 size for testing/mocking
    return new Array(VECTOR_SIZE).fill(0).map(() => Math.random());
  }

  try {
    const ai = new GoogleGenerativeAI(apiKey);
    // In Google Gen AI SDK, embeddings are generated via text-embedding-004
    const model = ai.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(text);
    const embedding = result.embedding.values;
    return embedding;
  } catch (error) {
    console.error('[RAG] Error generating Gemini embedding, returning dummy vector:', error);
    return new Array(VECTOR_SIZE).fill(0).map(() => Math.random());
  }
};

// Check if Qdrant is responsive, or if we should run in mock RAG mode
const isQdrantActive = async (): Promise<boolean> => {
  const url = process.env.QDRANT_URL || 'http://localhost:6333';
  try {
    const response = await fetch(`${url}/readyz`, { signal: AbortSignal.timeout(1000) });
    return response.ok;
  } catch (e) {
    return false;
  }
};

// Helper for Qdrant API requests
const qdrantFetch = async (path: string, options: RequestInit = {}): Promise<any> => {
  const baseUrl = process.env.QDRANT_URL || 'http://localhost:6333';
  const apiKey = process.env.QDRANT_API_KEY;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  };

  if (apiKey) {
    headers['api-key'] = apiKey;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`[Qdrant Error] ${response.statusText}: ${text}`);
  }

  return response.json();
};

export const initializeQdrant = async (): Promise<void> => {
  try {
    const active = await isQdrantActive();
    if (!active) {
      console.log('[RAG] Qdrant is offline. Running RAG in Mock Mode.');
      return;
    }

    // Check if collection exists
    const collectionsRes = await qdrantFetch('/collections');
    const exists = collectionsRes.result.collections.some(
      (c: any) => c.name === COLLECTION_NAME
    );

    if (!exists) {
      console.log(`[RAG] Creating Qdrant collection: ${COLLECTION_NAME}...`);
      await qdrantFetch(`/collections/${COLLECTION_NAME}`, {
        method: 'PUT',
        body: JSON.stringify({
          vectors: {
            size: VECTOR_SIZE,
            distance: 'Cosine'
          }
        })
      });
      console.log(`[RAG] Qdrant collection created successfully.`);
    } else {
      console.log(`[RAG] Qdrant collection ${COLLECTION_NAME} ready.`);
    }
  } catch (error) {
    console.error('[RAG] Failed to initialize Qdrant:', error);
  }
};

/**
 * Splits document content into chunks based on character/token sizes
 */
export const splitText = (text: string, chunkSize = 800, overlap = 150): string[] => {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let currentWords: string[] = [];
  let currentCount = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    currentWords.push(word);
    currentCount += word.length + 1; // Approx characters/tokens

    if (currentCount >= chunkSize) {
      chunks.push(currentWords.join(' '));
      // Overlap logic
      const overlapWords = currentWords.slice(-Math.floor(overlap / 5)); // Approx 5 chars per word
      currentWords = [...overlapWords];
      currentCount = currentWords.join(' ').length;
    }
  }

  if (currentWords.length > 0) {
    chunks.push(currentWords.join(' '));
  }

  return chunks;
};

/**
 * Upserts a knowledge base chunk to Qdrant and returns its vector details
 */
export const uploadToRAG = async (
  documentId: string,
  title: string,
  category: string,
  content: string,
  source: string
): Promise<string> => {
  const active = await isQdrantActive();
  const vectorId = crypto.randomUUID();

  if (!active) {
    console.log(`[RAG] Qdrant offline. Simulating upsert of point: ${vectorId}`);
    return vectorId;
  }

  try {
    const vector = await getEmbedding(content);

    await qdrantFetch(`/collections/${COLLECTION_NAME}/points`, {
      method: 'PUT',
      body: JSON.stringify({
        points: [
          {
            id: vectorId,
            vector,
            payload: {
              documentId,
              title,
              category,
              content,
              source
            }
          }
        ]
      })
    });

    console.log(`[RAG] Successfully upserted point: ${vectorId} to Qdrant.`);
    return vectorId;
  } catch (error) {
    console.error(`[RAG] Error upserting point to Qdrant:`, error);
    return vectorId;
  }
};

/**
 * Retrieves the top K semantically matching document chunks for a query
 */
export const retrieveFromRAG = async (
  query: string,
  category?: string,
  limit = 5
): Promise<RAGChunk[]> => {
  const active = await isQdrantActive();

  if (!active) {
    console.log(`[RAG] Qdrant offline. Returning mock RAG chunks for query: "${query}"`);
    return getMockRAGChunks(query, category, limit);
  }

  try {
    const vector = await getEmbedding(query);

    const body: any = {
      vector,
      limit,
      with_payload: true
    };

    // Apply metadata category filter if specified
    if (category) {
      body.filter = {
        must: [
          {
            key: 'category',
            match: {
              value: category
            }
          }
        ]
      };
    }

    const searchRes = await qdrantFetch(`/collections/${COLLECTION_NAME}/points/search`, {
      method: 'POST',
      body: JSON.stringify(body)
    });

    return searchRes.result.map((point: any) => ({
      id: point.id,
      score: point.score,
      payload: point.payload
    }));
  } catch (error) {
    console.error(`[RAG] Error searching Qdrant:`, error);
    return getMockRAGChunks(query, category, limit);
  }
};

// Clean mock data generator for offline RAG development
const getMockRAGChunks = (query: string, category?: string, limit = 5): RAGChunk[] => {
  const sampleKnowledge = [
    {
      title: 'Company Background',
      category: 'SERVICES',
      content: 'XYZ Technologies is a full-service digital consulting agency specializing in modern web design, React/Next.js client applications, scalable Node.js backend services, and automated AI platform integrations.'
    },
    {
      title: 'Core Development Pricing',
      category: 'PRICING',
      content: 'Our core pricing packages are structured as: 1) Starter Package starts at ₹75,000 for simple landing pages; 2) Professional Package starts at ₹2,500,000 adding advanced dashboards and Stripe payments; 3) Enterprise Package starts at ₹7,500,000 for custom API, CRM integrations, and full voice features.'
    },
    {
      title: 'Delivery Schedule FAQ',
      category: 'FAQ',
      content: 'Most web development projects are completed within 4 to 12 weeks. Starter packages take 2-4 weeks. Professional packages take 6-8 weeks. Custom enterprise portals take 12 weeks or more depending on scoping.'
    },
    {
      title: 'Stripe Payment Gateway Integration',
      category: 'TECH_STACK',
      content: 'We integrate secure Stripe checkout and invoice billing platforms. All custom subscription billing, card validations, and currency translations are handled securely through Stripe SDK configurations.'
    }
  ];

  return sampleKnowledge
    .filter((k) => !category || k.category === category)
    .slice(0, limit)
    .map((k) => ({
      id: crypto.randomUUID(),
      score: 0.85,
      payload: {
        documentId: 'mock-doc-123',
        title: k.title,
        category: k.category,
        content: k.content,
        source: 'seed-document.md'
      }
    }));
};
