import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, AppError, apiResponse } from './utils';
import { connectDB } from './db';
import { User } from './models';

export interface AuthenticatedUser {
  id: string;
  username: string;
  name: string;
  role: 'staff' | 'manager' | 'admin' | 'direktur';
  email?: string;
}

export interface AuthenticatedRequest extends NextRequest {
  user?: AuthenticatedUser;
}

// Rate limiting in-memory store (untuk development, di production gunakan Redis)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

// Enhanced rate limiting middleware
export function rateLimit(options: { windowMs: number; max: number; message?: string }) {
  return (request: NextRequest): NextResponse | null => {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               request.headers.get('cf-connecting-ip') ||
               'unknown';
    
    const now = Date.now();
    const windowStart = now - options.windowMs;
    
    // Clean up old entries
    for (const [key, value] of requestCounts.entries()) {
      if (value.resetTime < windowStart) {
        requestCounts.delete(key);
      }
    }
    
    const current = requestCounts.get(ip) || { count: 0, resetTime: now + options.windowMs };
    
    if (current.resetTime < now) {
      // Reset window
      current.count = 1;
      current.resetTime = now + options.windowMs;
    } else {
      current.count++;
    }
    
    requestCounts.set(ip, current);
    
    if (current.count > options.max) {
      return NextResponse.json(
        apiResponse(false, null, options.message || 'Terlalu banyak request, coba lagi nanti'),
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil(options.windowMs / 1000).toString(),
            'X-RateLimit-Limit': options.max.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(current.resetTime).toISOString()
          }
        }
      );
    }
    
    return null; // Continue processing
  };
}

// Rate limiter instances
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // requests per window
  message: 'Terlalu banyak request, coba lagi dalam 15 menit'
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // increased from 50 to 100 for development
  message: 'Terlalu banyak percobaan login, coba lagi dalam 15 menit'
});

export const strictLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 200, // increased from 100 to 200
  message: 'Rate limit exceeded untuk operasi sensitif'
});

// CORS middleware dengan konfigurasi yang lebih aman
export async function corsMiddleware(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next();
  
  const origin = request.headers.get('origin');
  
  // ✅ FIXED: Use environment variable with proper parsing
  // Accept all inventory-frontend-*.vercel.app subdomains for preview deployments
  const allowedOrigins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
    : [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:5174',
        'http://10.0.10.141:5173'
      ];
  
  // Check if origin matches allowed origins or is a Vercel preview deployment
  const isAllowed = origin && (
    allowedOrigins.includes(origin) ||
    origin.match(/^https:\/\/inventory-frontend-[a-z0-9]+-1ikis-projects\.vercel\.app$/)
  );

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    if (isAllowed) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET,DELETE,PATCH,POST,PUT,OPTIONS'
    );
    response.headers.set(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );
    response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
    return new NextResponse(null, { status: 200, headers: response.headers });
  }

  // Set CORS headers for actual requests
  if (isAllowed) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  response.headers.set('Access-Control-Allow-Credentials', 'true');

  return response;
}

// Enhanced authentication middleware
export async function authMiddleware(request: NextRequest): Promise<NextResponse | AuthenticatedUser> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Token tidak ditemukan', 401);
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      throw new AppError('Token kosong', 401);
    }

    const decoded = verifyToken(token) as any;
    
    if (!decoded || !decoded.id) {
      throw new AppError('Token tidak valid', 401);
    }

    // Validate token structure
    if (!decoded.username || !decoded.role) {
      throw new AppError('Token tidak lengkap', 401);
    }

    // Try to get fresh user data from database
    let user: AuthenticatedUser;
    
    try {
      await connectDB();
      const dbUser = await User.findById(decoded.id).select('-password');
      
      if (!dbUser) {
        throw new AppError('User tidak ditemukan', 401);
      }

      if (dbUser.status !== 'aktif') {
        throw new AppError('Akun tidak aktif', 401);
      }

      user = {
        id: dbUser._id.toString(),
        username: dbUser.username,
        name: dbUser.name,
        role: dbUser.role as 'staff' | 'manager' | 'admin' | 'direktur',
        email: dbUser.email
      };
    } catch (dbError) {
      // Database unavailable, use token data with validation
      console.log('🔄 Database unavailable for authentication, using token data');
      
      // Validate role
      if (!['staff', 'manager', 'admin', 'direktur'].includes(decoded.role)) {
        throw new AppError('Role tidak valid', 401);
      }
      
      user = {
        id: decoded.id,
        username: decoded.username,
        name: decoded.name || decoded.username,
        role: decoded.role as 'staff' | 'manager' | 'admin' | 'direktur',
        email: decoded.email
      };
    }

    return user;
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        apiResponse(false, null, error.message),
        { status: error.statusCode }
      );
    }
    
    return NextResponse.json(
      apiResponse(false, null, 'Authentication failed'),
      { status: 401 }
    );
  }
}

// Role-based authorization middleware
export function authorize(allowedRoles: string[]) {
  return (userRole: string): boolean => {
    if (!userRole || !allowedRoles.includes(userRole)) {
      return false;
    }
    return true;
  };
}

// Permission-based authorization
export function hasPermission(userRole: string, resource: string, action: string): boolean {
  const permissions = {
    direktur: ['*'], // Full access
    manager: ['*'], // 🔥 Full access sama seperti direktur
    admin: [
      'users.*', 'customers.*', 'parts.*', 'purchase-orders.*', 
      'inventory.*', 'reports.*', 'audit.*', 'settings.*'
    ],
    staff: [
      'customers.read', 'parts.read', 'purchase-orders.read',
      'inventory.read', 'inventory.scan', 'reports.read'
    ]
  };

  const userPermissions = permissions[userRole as keyof typeof permissions] || [];
  
  // Check for wildcard permission
  if (userPermissions.includes('*')) {
    return true;
  }
  
  // Check for specific permission
  const permission = `${resource}.${action}`;
  if (userPermissions.includes(permission)) {
    return true;
  }
  
  // Check for resource wildcard
  const resourceWildcard = `${resource}.*`;
  if (userPermissions.includes(resourceWildcard)) {
    return true;
  }
  
  return false;
}

// Input validation middleware factory
export function validateInput(schema: any) {
  return async (request: NextRequest): Promise<NextResponse | any> => {
    try {
      const contentType = request.headers.get('content-type');
      
      if (!contentType || !contentType.includes('application/json')) {
        throw new AppError('Content-Type harus application/json', 400);
      }

      const body = await request.json();
      
      if (!body || typeof body !== 'object') {
        throw new AppError('Request body harus berupa object JSON', 400);
      }

      const validatedData = await schema.validate(body, { 
        abortEarly: false,
        stripUnknown: true // Remove unknown fields
      });
      
      return validatedData;
    } catch (error: any) {
      if (error.name === 'ValidationError') {
        return NextResponse.json(
          apiResponse(false, null, 'Data tidak valid', error.errors?.join(', ')),
          { status: 400 }
        );
      }
      
      if (error instanceof AppError) {
        return NextResponse.json(
          apiResponse(false, null, error.message),
          { status: error.statusCode }
        );
      }
      
      return NextResponse.json(
        apiResponse(false, null, 'Validation error'),
        { status: 400 }
      );
    }
  };
}

// Security headers middleware
export function securityHeaders(response: NextResponse): NextResponse {
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Remove server information
  response.headers.delete('Server');
  response.headers.delete('X-Powered-By');
  
  return response;
}

// Request logging middleware
export function requestLogger(request: NextRequest, user?: AuthenticatedUser): void {
  const timestamp = new Date().toISOString();
  const method = request.method;
  const url = request.url;
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  
  console.log(`[${timestamp}] ${method} ${url} - User: ${user?.username || 'anonymous'} - IP: ${ip} - UA: ${userAgent}`);
}

// Comprehensive middleware wrapper
export function createMiddleware(options: {
  requireAuth?: boolean;
  allowedRoles?: string[];
  requiredPermission?: { resource: string; action: string };
  rateLimiter?: (req: NextRequest) => NextResponse | null;
  validationSchema?: any;
}) {
  return async (request: NextRequest): Promise<NextResponse | { user?: AuthenticatedUser; validatedData?: any }> => {
    let user: AuthenticatedUser | undefined;
    let validatedData: any;

    try {
      // Apply rate limiting
      if (options.rateLimiter) {
        const rateLimitResponse = options.rateLimiter(request);
        if (rateLimitResponse) {
          return rateLimitResponse;
        }
      }

      // Apply authentication
      if (options.requireAuth) {
        const authResult = await authMiddleware(request);
        if (authResult instanceof NextResponse) {
          return authResult;
        }
        user = authResult;

        // Apply role-based authorization
        if (options.allowedRoles && !authorize(options.allowedRoles)(user.role)) {
          return NextResponse.json(
            apiResponse(false, null, 'Akses ditolak: Role tidak memiliki izin'),
            { status: 403 }
          );
        }

        // Apply permission-based authorization
        if (options.requiredPermission) {
          const { resource, action } = options.requiredPermission;
          if (!hasPermission(user.role, resource, action)) {
            return NextResponse.json(
              apiResponse(false, null, 'Akses ditolak: Tidak memiliki permission'),
              { status: 403 }
            );
          }
        }
      }

      // Apply input validation
      if (options.validationSchema && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const validationResult = await validateInput(options.validationSchema)(request);
        if (validationResult instanceof NextResponse) {
          return validationResult;
        }
        validatedData = validationResult;
      }

      // Log request
      requestLogger(request, user);

      return { user, validatedData };
    } catch (error) {
      console.error('Middleware error:', error);
      
      if (error instanceof AppError) {
        return NextResponse.json(
          apiResponse(false, null, error.message),
          { status: error.statusCode }
        );
      }
      
      return NextResponse.json(
        apiResponse(false, null, 'Internal server error'),
        { status: 500 }
      );
    }
  };
}

// Export aliases for backward compatibility
export const authenticate = authMiddleware;

// ==================== RESPONSE COMPRESSION MIDDLEWARE ====================

export function withCompression(handler: Function) {
  return async (req: NextRequest, ...args: any[]) => {
    const response = await handler(req, ...args);
    
    // Check if client accepts gzip
    const acceptEncoding = req.headers.get('accept-encoding') || '';
    
    if (acceptEncoding.includes('gzip') && response instanceof NextResponse) {
      // Add compression hint header
      response.headers.set('Content-Encoding', 'gzip');
      response.headers.set('Vary', 'Accept-Encoding');
    }
    
    return response;
  };
}

// ==================== API VERSIONING MIDDLEWARE ====================

export function withApiVersion(version: string = 'v1') {
  return function(handler: Function) {
    return async (req: NextRequest, ...args: any[]) => {
      // Add API version to response headers
      const response = await handler(req, ...args);
      
      if (response instanceof NextResponse) {
        response.headers.set('X-API-Version', version);
        response.headers.set('X-RateLimit-Limit', '1000');
        response.headers.set('X-RateLimit-Remaining', '999');
      }
      
      return response;
    };
  };
}

// ==================== RESPONSE CACHING MIDDLEWARE ====================

const CACHE_CONTROL_HEADERS: Record<string, string> = {
  public: 'public, max-age=300, s-maxage=600', // 5 min client, 10 min CDN
  private: 'private, max-age=60', // 1 min
  noCache: 'no-cache, no-store, must-revalidate',
  immutable: 'public, max-age=31536000, immutable', // 1 year for immutable resources
};

export function withCaching(cacheType: keyof typeof CACHE_CONTROL_HEADERS = 'noCache') {
  return function(handler: Function) {
    return async (req: NextRequest, ...args: any[]) => {
      const response = await handler(req, ...args);
      
      if (response instanceof NextResponse) {
        response.headers.set('Cache-Control', CACHE_CONTROL_HEADERS[cacheType]);
        
        // Add ETag for conditional requests
        if (cacheType !== 'noCache') {
          const etag = `W/"${Date.now()}"`;
          response.headers.set('ETag', etag);
          
          // Check If-None-Match header
          const ifNoneMatch = req.headers.get('if-none-match');
          if (ifNoneMatch === etag) {
            return new NextResponse(null, { status: 304 });
          }
        }
      }
      
      return response;
    };
  };
}

// ==================== RATE LIMITING MIDDLEWARE ====================

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function withRateLimit(config: RateLimitConfig = { windowMs: 60000, maxRequests: 100 }) {
  return function(handler: Function) {
    return async (req: NextRequest, ...args: any[]) => {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                 req.headers.get('x-real-ip') || 
                 'unknown';
      
      const now = Date.now();
      const key = `${ip}-${req.url}`;
      
      let rateLimit = rateLimitStore.get(key);
      
      if (!rateLimit || now > rateLimit.resetTime) {
        rateLimit = { count: 0, resetTime: now + config.windowMs };
        rateLimitStore.set(key, rateLimit);
      }
      
      rateLimit.count++;
      
      if (rateLimit.count > config.maxRequests) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Too many requests', 
            retryAfter: Math.ceil((rateLimit.resetTime - now) / 1000) 
          },
          { 
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil((rateLimit.resetTime - now) / 1000)),
              'X-RateLimit-Limit': String(config.maxRequests),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString()
            }
          }
        );
      }
      
      const response = await handler(req, ...args);
      
      if (response instanceof NextResponse) {
        response.headers.set('X-RateLimit-Limit', String(config.maxRequests));
        response.headers.set('X-RateLimit-Remaining', String(config.maxRequests - rateLimit.count));
        response.headers.set('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString());
      }
      
      return response;
    };
  };
}

// ==================== MIDDLEWARE COMPOSER ====================

export function compose(...middlewares: Function[]) {
  return function(handler: Function) {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
}

// Example usage:
// export const GET = compose(
//   withApiVersion('v1'),
//   withRateLimit({ windowMs: 60000, maxRequests: 100 }),
//   withCaching('public'),
//   withCompression
// )(async (req: NextRequest) => {
//   // Your handler logic
// });