import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Handle CORS for all API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const response = NextResponse.next();
    
    const origin = request.headers.get('origin');
    
    // ✅ FIXED: Use environment variable or default to localhost for development
    // Accept all inventory-frontend-*.vercel.app subdomains for preview deployments
    const allowedOrigins = process.env.CORS_ORIGINS 
      ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
      : [
          'http://localhost:5173',
          'http://localhost:5174',
          'http://localhost:3000',
          'http://10.0.10.141:5173'
        ];
    
    // Check if origin matches allowed origins or is a Vercel preview deployment
    const isAllowed = origin && (
      allowedOrigins.includes(origin) ||
      origin.match(/^https:\/\/inventory-frontend-[a-z0-9]+-1ikis-projects\.vercel\.app$/)
    );

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

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: response.headers });
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
