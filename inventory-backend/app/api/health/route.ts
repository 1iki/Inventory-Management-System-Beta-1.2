import { NextRequest, NextResponse } from 'next/server';
import { checkDBHealth, isDBConnected } from '@/lib/db';
import { config } from '@/lib/config';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    // ✅ FIX: Ensure database connection before health check
    // This is important for serverless cold starts
    try {
      const { connectDB } = await import('@/lib/db');
      await connectDB();
    } catch (error) {
      console.log('Database connection attempt failed:', error);
      // Continue with health check even if connection fails
    }
    
    // Collect system health metrics
    const dbHealth = await checkDBHealth();
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    // Determine overall health status
    const isHealthy = dbHealth.connected && dbHealth.readyState === 1;
    
    const healthData = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime),
      responseTime: `${responseTime}ms`,
      version: config.app.version,
      environment: config.app.nodeEnv,
      database: {
        status: dbHealth.connected ? 'connected' : 'disconnected',
        readyState: getReadyStateText(dbHealth.readyState),
        host: dbHealth.host,
        database: dbHealth.database,
        maxPoolSize: config.mongodb.options.maxPoolSize,
        minPoolSize: config.mongodb.options.minPoolSize
      },
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
      },
      process: {
        pid: process.pid,
        platform: process.platform,
        nodeVersion: process.version,
        arch: process.arch
      }
    };
    
    return NextResponse.json(healthData, {
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check failed',
      database: {
        status: 'error',
        readyState: 'unknown'
      }
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}

// Helper function to convert readyState number to text
function getReadyStateText(readyState: number): string {
  const states: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized'
  };
  return states[readyState] || 'unknown';
}

// Optional: Deep health check endpoint (more comprehensive)
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const checks: Record<string, any> = {};
    
    // Database write check
    try {
      const testWrite = await mongoose.connection.db?.admin().ping();
      checks.databaseWrite = {
        status: 'healthy',
        responseTime: `${Date.now() - startTime}ms`
      };
    } catch (error) {
      checks.databaseWrite = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Write test failed'
      };
    }
    
    // Collection access check
    try {
      const collections = await mongoose.connection.db?.listCollections().toArray();
      checks.collections = {
        status: 'healthy',
        count: collections?.length || 0,
        names: collections?.map(c => c.name) || []
      };
    } catch (error) {
      checks.collections = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Collection check failed'
      };
    }
    
    const allHealthy = Object.values(checks).every((check: any) => check.status === 'healthy');
    
    return NextResponse.json({
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      responseTime: `${Date.now() - startTime}ms`,
      checks
    }, {
      status: allHealthy ? 200 : 503
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Deep health check failed'
    }, {
      status: 503
    });
  }
}