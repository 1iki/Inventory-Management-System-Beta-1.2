import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // ⚠️ SECURITY: This endpoint should be removed in production or protected
  
  const envCheck = {
    NODE_ENV: process.env.NODE_ENV || 'NOT SET',
    MONGODB_URI: process.env.MONGODB_URI ? 
      `SET (${process.env.MONGODB_URI.substring(0, 20)}...[REDACTED])` : 
      'NOT SET',
    JWT_SECRET: process.env.JWT_SECRET ? 
      `SET (length: ${process.env.JWT_SECRET.length})` : 
      'NOT SET',
    CORS_ORIGINS: process.env.CORS_ORIGINS || 'NOT SET',
    // Show first part of MongoDB URI to verify format
    MONGODB_URI_START: process.env.MONGODB_URI ? 
      process.env.MONGODB_URI.substring(0, 50) + '...' : 
      'NOT SET',
    // Check if URI has database name
    HAS_DATABASE_NAME: process.env.MONGODB_URI ? 
      process.env.MONGODB_URI.includes('/inventory_system') : 
      false,
    // All env vars available (just keys, no values)
    AVAILABLE_ENV_KEYS: Object.keys(process.env).filter(k => 
      k.includes('MONGO') || k.includes('JWT') || k.includes('CORS') || k.includes('NODE')
    )
  };
  
  return NextResponse.json({
    message: 'Environment Variables Check',
    timestamp: new Date().toISOString(),
    environment: envCheck
  }, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}
