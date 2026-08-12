import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import { seedDatabase } from './utils/seed.js';
import { seedDemoData } from './utils/seedDemo.js';
import { initializeQdrant } from './services/rag.js';
import authRoutes from './routes/auth.js';
import knowledgeRoutes from './routes/knowledge.js';
import leadRoutes from './routes/leads.js';
import proposalRoutes from './routes/proposals.js';
import competitorRoutes from './routes/competitors.js';
import pricingRoutes from './routes/pricing.js';
import marketTargetRoutes from './routes/marketTargets.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { config } from './config/env.js';
import { ensurePricingConfig, startPricingJob } from './services/pricing.js';
import { startMarketScanner } from './services/marketScanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to Database
await connectDB();
// Seed Database
await seedDatabase();
// Seed showcase demo data (SEED_DEMO_DATA=true)
if (config.seedDemoData) {
  await seedDemoData();
}
// Initialize Qdrant
await initializeQdrant();
// Seed + schedule adaptive pricing
await ensurePricingConfig();
startPricingJob();
// Schedule market-rate scanning (competitor pricing pages)
startMarketScanner();

const app = express();
const port = config.port;

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.clientUrl,
  credentials: true
}));
app.use(express.json());

// Global Rate Limiting: max 100 requests per minute
app.use(rateLimiter(100, 60 * 1000));

// Mount Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/knowledge', knowledgeRoutes);
app.use('/api/v1/leads', leadRoutes);
app.use('/api/v1/proposals', proposalRoutes);
app.use('/api/v1/competitors', competitorRoutes);
app.use('/api/v1/pricing', pricingRoutes);
app.use('/api/v1/market-targets', marketTargetRoutes);

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
  console.log(`[Server] Environment: ${config.nodeEnv}`);
});
