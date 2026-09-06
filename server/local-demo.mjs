import { MongoMemoryServer } from 'mongodb-memory-server';

const mongod = await MongoMemoryServer.create();
const uri = mongod.getUri('asep');
console.log(`[demo] in-memory mongo at ${uri}`);

process.env.MONGO_URI = uri;
process.env.MOCK_LLM = 'true';
process.env.SEED_DEMO_DATA = 'true';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'local-demo-only-not-for-prod-0123456789abcdef';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.PUBLIC_BASE_URL = 'http://localhost:5001';
process.env.NODE_ENV = 'development';
process.env.PORT = '5001';

await import('./dist/index.js');
