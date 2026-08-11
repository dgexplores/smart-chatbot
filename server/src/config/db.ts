import mongoose from 'mongoose';
import { config } from './env.js';

export const connectDB = async (): Promise<void> => {
  const mongoUri = config.mongoUri;

  try {
    console.log(`[Database] Connecting to MongoDB...`);
    await mongoose.connect(mongoUri);
    console.log(`[Database] MongoDB connected successfully.`);
  } catch (error) {
    console.error(`[Database] MongoDB connection error:`, error);
    process.exit(1);
  }
};
