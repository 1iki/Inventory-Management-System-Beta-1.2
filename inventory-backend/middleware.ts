import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Handle CORS for all API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    
    // ✅ If no origin header (direct API access, health checks, etc), allow it
    if (!origin) {
      return NextResponse.next();
    }
    
    // ✅ CRITICAL: Check if origin is allowed
    // This prevents multiple values in Access-Control-Allow-Origin header
    const isVercelPreview = origin.match(/^https:\/\/inventory-frontend-[a-z0-9]+-1ikis-projects\.vercel\.app$/);
    const isVercelProduction = origin.match(/^https:\/\/inventory-frontend-rouge\.vercel\.app$/);
    const isLocalhost = origin.startsWith('http://localhost:') || origin.startsWith('http://10.0.10.');
    
    // Only allow ONE origin at a time
    const isAllowed = isVercelPreview || isVercelProduction || isLocalhost;
    
    if (!isAllowed) {
      // Reject requests from disallowed origins
      return new Response('CORS not allowed', { status: 403 });
    }

    const response = NextResponse.next();
    
    // ✅ CRITICAL: Set SINGLE origin value (the one from the request)
    response.headers.set('Access-Control-Allow-Origin', origin);

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
