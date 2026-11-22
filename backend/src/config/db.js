const mongoose = require('mongoose');

let memoryServer = null;
let cached = global.__mykharcha_mongoose;
if (!cached) cached = global.__mykharcha_mongoose = { conn: null, promise: null };

async function connectDB() {
  let uri = process.env.MONGODB_URI;
  if (!uri) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MONGODB_URI is required in production');
    }
    const { MongoMemoryServer } = require('mongodb-memory-server');
    if (!memoryServer) memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();
    console.log('[db] Using in-memory MongoDB');
  }
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    mongoose.set('strictQuery', true);
    cached.promise = mongoose.connect(uri).then(m => m.connection);
  }
  cached.conn = await cached.promise;
  console.log('[db] Connected to MongoDB');
  return cached.conn;
}

async function disconnectDB() {
  await mongoose.disconnect();
  cached.conn = null;
  cached.promise = null;
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

module.exports = { connectDB, disconnectDB };
