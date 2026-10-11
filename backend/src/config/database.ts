import mongoose from 'mongoose';

import { env } from './env.js';

export async function connectDatabase(): Promise<void> {
  mongoose.set('autoIndex', env.nodeEnv !== 'production');

  try {
    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    console.log('MongoDB connected');
    console.log(`MongoDB host: ${mongoose.connection.host}`);
    console.log(`MongoDB database: ${mongoose.connection.name}`);

    mongoose.connection.on('error', (error) => {
      console.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    throw error;
  }
}

