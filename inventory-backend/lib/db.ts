import mongoose from 'mongoose';
import { config } from './config';

// Track connection state
let isConnected = false;
let isConnecting = false;
let connectionAttempts = 0;
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAY_MS = 5000;

// Connection options optimized for MongoDB Atlas with SSL/TLS fixes
const connectionOptions = {
  bufferCommands: true, // ✅ CHANGED: Enable buffering untuk prevent race condition
  maxPoolSize: config.mongodb.options.maxPoolSize,
  minPoolSize: config.mongodb.options.minPoolSize || 5,
  serverSelectionTimeoutMS: config.mongodb.options.serverSelectionTimeoutMS,
  socketTimeoutMS: config.mongodb.options.socketTimeoutMS,
  connectTimeoutMS: config.mongodb.options.connectTimeoutMS,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  retryReads: true,
  w: 'majority' as const,
  family: 4, // Use IPv4
  autoIndex: true,
  maxIdleTimeMS: config.mongodb.options.maxIdleTimeMS || 30000,
  authSource: 'admin',
  // ✅ FIXED: Simplified TLS config untuk fix SSL error
  tls: true,
  tlsAllowInvalidCertificates: false,
  // ❌ REMOVED: ssl & sslValidate yang menyebabkan konflik
};

// Sleep helper for retry logic
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function connectDB() {
  // If already connected, return immediately
  if (isConnected && mongoose.connection.readyState === 1) {
    console.log('✅ Using existing MongoDB connection (ReadyState: 1)');
    return mongoose.connection;
  }

  // If connection is in progress, wait for it
  if (isConnecting) {
    console.log('⏳ Connection in progress, waiting...');
    // Wait for connection to complete (max 30 seconds)
    let waitTime = 0;
    while (isConnecting && waitTime < 30000) {
      await sleep(500);
      waitTime += 500;
      if (isConnected && mongoose.connection.readyState === 1) {
        console.log('✅ Connection completed while waiting');
        return mongoose.connection;
      }
    }
  }

  isConnecting = true;

  // Retry logic for connection
  while (connectionAttempts < MAX_RETRY_ATTEMPTS) {
    try {
      connectionAttempts++;
      console.log(`🔄 Connecting to MongoDB Atlas (Attempt ${connectionAttempts}/${MAX_RETRY_ATTEMPTS})...`);
      console.log('Connection URI:', config.mongodb.uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'));

      // Set mongoose options
      mongoose.set('strictQuery', false);
      mongoose.set('debug', config.app.nodeEnv === 'development');

      // 🆕 Ensure any existing connection is closed before reconnecting
      if (mongoose.connection.readyState !== 0) {
        console.log('🔌 Closing existing connection before retry...');
        await mongoose.connection.close();
        await sleep(1000); // Wait for clean close
      }

      // Connect to MongoDB with timeout
      const connection = await Promise.race([
        mongoose.connect(config.mongodb.uri, connectionOptions),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout after 30 seconds')), 30000)
        )
      ]) as typeof mongoose;

      // 🆕 Verify connection is actually ready
      if (mongoose.connection.readyState !== 1) {
        throw new Error('Connection established but not ready');
      }

      isConnected = true;
      isConnecting = false;
      connectionAttempts = 0; // Reset on success
      
      console.log('✅ MongoDB Atlas connected successfully!');
      if (connection.connection.db) {
        console.log('📊 Database:', connection.connection.db.databaseName);
      }
      console.log('🌐 Host:', connection.connection.host || 'N/A');
      console.log('🔌 Ready State:', mongoose.connection.readyState);
      console.log('🏊 Connection Pool Size:', connectionOptions.maxPoolSize);
      
      return connection;
    } catch (error) {
      isConnected = false;
      isConnecting = false;
      console.error(`❌ MongoDB connection error (Attempt ${connectionAttempts}):`, error);
      
      // Provide helpful error messages
      if (error instanceof Error) {
        if (error.message.includes('authentication failed')) {
          console.error('🔐 Authentication failed. Please check your username and password.');
          throw error; // Don't retry on auth errors
        } else if (error.message.includes('ENOTFOUND')) {
          console.error('🌐 Cannot find MongoDB server. Please check your connection string.');
        } else if (error.message.includes('timed out') || error.message.includes('timeout')) {
          console.error('⏱️ Connection timed out. Please check your network and firewall settings.');
        } else if (error.message.includes('ECONNREFUSED')) {
          console.error('🚫 Connection refused. Please check if MongoDB is running.');
        } else if (error.message.includes('SSL') || error.message.includes('TLS')) {
          console.error('🔒 SSL/TLS error. This may be due to Node.js version compatibility.');
          console.error('💡 Try: Update Node.js to LTS version or check MongoDB Atlas IP whitelist.');
        }
      }
      
      // Retry with exponential backoff
      if (connectionAttempts < MAX_RETRY_ATTEMPTS) {
        const delay = RETRY_DELAY_MS * connectionAttempts;
        console.log(`⏳ Retrying in ${delay/1000} seconds...`);
        await sleep(delay);
      } else {
        console.error('❌ Max retry attempts reached. Could not connect to MongoDB.');
        throw error;
      }
    }
  }
  
  isConnecting = false;
  throw new Error('Failed to connect to MongoDB after multiple attempts');
}

// Handle connection events with enhanced logging
mongoose.connection.on('connected', () => {
  isConnected = true;
  connectionAttempts = 0;
  console.log('✅ Mongoose connected to MongoDB Atlas');
});

mongoose.connection.on('error', (err) => {
  isConnected = false;
  console.error('❌ Mongoose connection error:', err);
  
  // Attempt to reconnect on error
  if (connectionAttempts < MAX_RETRY_ATTEMPTS) {
    console.log('🔄 Attempting to reconnect...');
    setTimeout(() => connectDB(), RETRY_DELAY_MS);
  }
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.log('⚠️ Mongoose disconnected from MongoDB');
  
  // Attempt to reconnect
  if (connectionAttempts < MAX_RETRY_ATTEMPTS && config.app.nodeEnv === 'production') {
    console.log('🔄 Attempting to reconnect...');
    setTimeout(() => connectDB(), RETRY_DELAY_MS);
  }
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  connectionAttempts = 0;
  console.log('✅ Mongoose reconnected to MongoDB');
});

// Graceful shutdown with enhanced cleanup
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}, closing MongoDB connection...`);
  try {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed gracefully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error);
    process.exit(1);
  }
};

// Register shutdown handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon restarts

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit, just log
});

// Export connection status checker
export const isDBConnected = () => isConnected && mongoose.connection.readyState === 1;

// 🆕 Helper function to wait for connection to be ready
export const waitForConnection = async (maxRetries = 10, delayMs = 500): Promise<boolean> => {
  let retries = 0;
  while (retries < maxRetries) {
    if (mongoose.connection.readyState === 1) {
      console.log('✅ Connection ready');
      return true;
    }
    console.log(`⏳ Waiting for connection (${retries + 1}/${maxRetries})...`);
    await sleep(delayMs);
    retries++;
  }
  console.error('❌ Connection not ready after waiting');
  return false;
};

// 🆕 Wrapper function to ensure connection before query
export const withConnection = async <T>(
  queryFn: () => Promise<T>,
  errorMessage = 'Database operation failed'
): Promise<T> => {
  try {
    // Ensure connection
    await connectDB();
    
    // Wait for connection to be ready
    const isReady = await waitForConnection();
    if (!isReady) {
      throw new Error('Database connection not ready. Please try again.');
    }
    
    // Execute query
    return await queryFn();
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    
    // Re-throw with better error message
    if (error instanceof Error && error.message.includes('bufferCommands')) {
      throw new Error('Database connection not ready. Please try again.');
    }
    
    throw error;
  }
};

// Export connection health check
export const checkDBHealth = async (): Promise<{
  connected: boolean;
  readyState: number;
  host?: string;
  database?: string;
}> => {
  return {
    connected: isDBConnected(),
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    database: mongoose.connection.db?.databaseName
  };
};

// ==================== CONNECTION POOL MONITORING ====================

export interface PoolStats {
  available: number;
  current: number;
  max: number;
  min: number;
  pending: number;
  size: number;
}

export const getConnectionPoolStats = (): PoolStats => {
  const db = mongoose.connection.db;
  
  if (!db) {
    return {
      available: 0,
      current: 0,
      max: config.mongodb.options.maxPoolSize,
      min: config.mongodb.options.minPoolSize || 5,
      pending: 0,
      size: 0
    };
  }

  // Get pool statistics from MongoDB driver
  try {
    const client = mongoose.connection.getClient();
    const topology = (client as any).topology;
    
    if (topology && topology.s && topology.s.servers) {
      const servers = Array.from(topology.s.servers.values());
      const server = servers[0] as any;
      
      if (server && server.s && server.s.pool) {
        const pool = server.s.pool;
        return {
          available: pool.availableConnectionCount || 0,
          current: pool.currentConnectionCount || 0,
          max: pool.options?.maxPoolSize || config.mongodb.options.maxPoolSize,
          min: pool.options?.minPoolSize || config.mongodb.options.minPoolSize || 5,
          pending: pool.waitQueueSize || 0,
          size: pool.totalConnectionCount || 0
        };
      }
    }
  } catch (error) {
    console.error('Error getting pool stats:', error);
  }
  
  // Fallback to config values
  return {
    available: 0,
    current: 0,
    max: config.mongodb.options.maxPoolSize,
    min: config.mongodb.options.minPoolSize || 5,
    pending: 0,
    size: 0
  };
};

export const logConnectionPoolStats = () => {
  const stats = getConnectionPoolStats();
  console.log('📊 Connection Pool Stats:', {
    available: stats.available,
    current: stats.current,
    max: stats.max,
    min: stats.min,
    pending: stats.pending,
    size: stats.size,
    utilizationPercent: stats.max > 0 ? ((stats.current / stats.max) * 100).toFixed(2) + '%' : '0%'
  });
};

// Monitor pool every 5 minutes in production
if (config.app.nodeEnv === 'production') {
  setInterval(() => {
    if (isDBConnected()) {
      logConnectionPoolStats();
    }
  }, 5 * 60 * 1000);
}

// Default export for backward compatibility
export default connectDB;