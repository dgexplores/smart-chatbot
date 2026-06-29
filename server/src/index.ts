import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import { seedDatabase } from './utils/seed.js';
import { initializeQdrant } from './services/rag.js';
import authRoutes from './routes/auth.js';
import knowledgeRoutes from './routes/knowledge.js';
import leadRoutes from './routes/leads.js';
import { rateLimiter } from './middleware/rateLimiter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Connect to Database
await connectDB();
// Seed Database
await seedDatabase();
// Initialize Qdrant
await initializeQdrant();

const app = express();
const port = process.env.PORT || 5001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Global Rate Limiting: max 100 requests per minute
app.use(rateLimiter(100, 60 * 1000));

// Mount Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/knowledge', knowledgeRoutes);
app.use('/api/v1/leads', leadRoutes);

// Static Assets
app.use('/proposals', express.static(path.join(__dirname, '../public/proposals')));

// Basic Routes
app.get('/', (req, res) => {
  res.json({ success: true, message: 'ASEP API is online.' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create Server
const server = http.createServer(app);

// Initialize Sockets
import { initSocket } from './sockets/socket.js';
initSocket(server);

server.listen(port, () => {
  console.log(`[Server] ASEP backend listening at http://localhost:${port}`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV}`);
});
