import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { KnowledgeBase } from '../models/KnowledgeBase.js';
import { splitText, uploadToRAG } from '../services/rag.js';

// Helper to delete points from Qdrant
const deleteFromQdrantByDocId = async (documentId: string): Promise<void> => {
  const url = process.env.QDRANT_URL || 'http://localhost:6333';
  const apiKey = process.env.QDRANT_API_KEY;

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['api-key'] = apiKey;

    await fetch(`${url}/collections/company_knowledge/points/delete`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filter: {
          must: [
            {
              key: 'documentId',
              match: {
                value: documentId
              }
            }
          ]
        }
      })
    });
    console.log(`[RAG] Deleted vectors for documentId: ${documentId} from Qdrant.`);
  } catch (error) {
    console.error(`[RAG] Error deleting vectors from Qdrant:`, error);
  }
};

export const uploadDocument = async (req: AuthenticatedRequest, res: Response) => {
  const { title, category, content, source } = req.body;

  if (!title || !category || !content) {
    return res.status(400).json({
      success: false,
      message: 'Please provide title, category, and content.'
    });
  }

  try {
    // 1. Save document to MongoDB
    const doc = new KnowledgeBase({
      title,
      category,
      content,
      sourceDocumentId: crypto.randomUUID() // Track dynamic document grouping
    });
    await doc.save();

    // 2. Split content and upload chunks to Qdrant vector store
    const chunks = splitText(content, 800, 150);
    const vectorPromises = chunks.map((chunk, index) =>
      uploadToRAG(
        doc.id,
        `${title} - Part ${index + 1}`,
        category,
        chunk,
        source || 'manual_upload'
      )
    );

    // Run parallel vector uploads
    const vectorIds = await Promise.all(vectorPromises);

    // Save one of the vector IDs as reference on the MongoDB model
    if (vectorIds.length > 0) {
      doc.embeddingId = vectorIds[0];
      await doc.save();
    }

    return res.status(201).json({
      success: true,
      message: `Document parsed and embedded into ${chunks.length} vector chunks successfully.`,
      data: doc
    });
  } catch (error: any) {
    console.error(`[Knowledge Controller] Upload error:`, error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

export const getDocuments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const docs = await KnowledgeBase.find().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      data: docs
    });
  } catch (error: any) {
    console.error(`[Knowledge Controller] getDocuments error:`, error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

export const deleteDocument = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const doc = await KnowledgeBase.findById(id);
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'Document not found.'
      });
    }

    // 1. Delete document from MongoDB
    await KnowledgeBase.findByIdAndDelete(id);

    // 2. Delete points from Qdrant vector store
    await deleteFromQdrantByDocId(id);

    return res.status(200).json({
      success: true,
      message: 'Document and its vectors deleted successfully.'
    });
  } catch (error: any) {
    console.error(`[Knowledge Controller] Delete error:`, error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};
