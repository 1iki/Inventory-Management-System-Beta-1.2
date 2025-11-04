// Environment variable validation and configuration
import * as dotenv from 'dotenv';
import path from 'path';

// ✅ Load .env.local only in non-production environments
// In Vercel, environment variables are automatically loaded from Dashboard
if (process.env.NODE_ENV !== 'production') {
  const envPath = path.join(process.cwd(), '.env.local');
  dotenv.config({ path: envPath });
  console.log('📁 Loaded environment from .env.local');
} else {
  console.log('☁️ Using environment variables from deployment platform');
}

// 🔥 DEVELOPMENT ONLY: Force bypass TLS validation
if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.log('⚠️  TLS Validation DISABLED for development');
}

// Required environment variables
const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'NODE_ENV'
] as const;

// Validate environment variables
function validateEnvVars() {
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('📋 Current environment:', process.env.NODE_ENV);
    console.error('🔍 Available env vars:', Object.keys(process.env).filter(k => k.includes('MONGO') || k.includes('JWT')));
    
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your environment configuration'
    );
  }
  
  console.log('✅ Environment variables loaded successfully');
  console.log('📊 MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
  console.log('🔐 JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
  console.log('🌍 NODE_ENV:', process.env.NODE_ENV);
}

// Validate on import
validateEnvVars();

export const config = {
  mongodb: {
    uri: process.env.MONGODB_URI!,
    options: {
      bufferCommands: false,
      maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE || '50'), // Increased from 10 to 50 for production
      minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE || '5'), // ✅ NEW: Minimum connection pool
      serverSelectionTimeoutMS: parseInt(process.env.DB_TIMEOUT || '30000'),
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      maxIdleTimeMS: parseInt(process.env.DB_MAX_IDLE_TIME || '30000'), // ✅ NEW: Connection idle timeout
      retryWrites: true,
      retryReads: true,
      // MongoDB Atlas specific optimizations
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Additional settings for Atlas
      heartbeatFrequencyMS: 10000,
      maxStalenessSeconds: 120,
    }
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d', // ✅ NEW: Refresh token expiry
    issuer: process.env.JWT_ISSUER || 'inventory-system', // ✅ NEW: JWT issuer
    audience: process.env.JWT_AUDIENCE || 'inventory-api' // ✅ NEW: JWT audience
  },
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3001'),
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5174'
    ],
    // ✅ NEW: Application metadata
    version: process.env.APP_VERSION || '1.0.0',
    name: process.env.APP_NAME || 'Inventory Management System'
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    skipSuccessfulRequests: false, // ✅ Changed: Count all requests
    skipFailedRequests: false, // ✅ NEW: Count failed requests too
    standardHeaders: true, // ✅ NEW: Return rate limit info in headers
    legacyHeaders: false // ✅ NEW: Disable X-RateLimit-* headers
  },
  security: {
    bcryptRounds: 12,
    maxLoginAttempts: 5,
    lockoutTime: 30 * 60 * 1000, // 30 minutes
    // ✅ NEW: Additional security settings
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireNumbers: true,
    passwordRequireSpecialChars: false,
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    allowedIPs: process.env.ALLOWED_IPS?.split(',') || [] // IP whitelist
  },
  // ✅ NEW: Cache configuration (for future Redis implementation)
  cache: {
    enabled: process.env.CACHE_ENABLED === 'true',
    ttl: parseInt(process.env.CACHE_TTL || '3600'), // 1 hour default
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  // ✅ NEW: Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    directory: process.env.LOG_DIR || './logs'
  }
} as const;