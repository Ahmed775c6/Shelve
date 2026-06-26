import mongoose from 'mongoose';

const rawUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/Laibary';
const normalizedUri = rawUri
  .replace(/^https?:\/\//i, '')
  .replace(/^mongodb:\/\//i, '')
  .replace(/^mongodb\+srv:\/\//i, '');
const MONGODB_URI = rawUri.startsWith('mongodb://') || rawUri.startsWith('mongodb+srv://')
  ? rawUri
  : `mongodb://${normalizedUri}`;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default connectDB;