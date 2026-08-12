import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import path from 'path';
import fs from 'fs';
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

// Middleware — CSP allows same-origin plus the configured client/API origins
// (needed when the client is served from a different origin than the API).
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'connect-src': [
          "'self'",
          ...config.clientOrigins,
          config.publicBaseUrl,
          'ws:',
          'wss:'
        ]
      }
    }
  })
);
app.use(cors({
  origin: config.clientOrigins,
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

// Serve the built client (SPA) when present — enables single-origin hosting
// (client + API on one URL, no CORS). Skipped in the Docker image, which only
// contains the server.
const clientDist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/proposals') ||
      req.path.startsWith('/socket.io') ||
      req.path.startsWith('/health')
    ) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
  console.log('[Server] Serving client build from', clientDist);
}

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
