import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import { User } from '../../../../lib/models';
import { comparePassword, generateToken, apiResponse, sanitizeInput, AppError } from '../../../../lib/utils';
import { loginSchema } from '../../../../lib/validations';
import bcrypt from 'bcrypt';

// Simple rate limiting store (in production, use Redis) - Reset untuk development
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

// Clear rate limiting store on startup untuk development
loginAttempts.clear();

// Fallback users untuk testing ketika database tidak tersedia
// Password untuk semua user adalah "password123"
const fallbackUsers = [
  {
    id: '1',
    username: 'direktur_budi',
    name: 'Budi Santoso',
    role: 'direktur',
    password: '$2b$12$xS/hFMC1mbpcl.8JMhyMl.9uP9pO3i6dMJV9h3lkMNICz/4wcSb0u', // password123
    department: 'Manajemen',
    email: 'budi@inventory.com',
    status: 'aktif'
  },
  {
    id: '2', 
    username: 'admin_sari',
    name: 'Sari Wulandari',
    role: 'admin',
    password: '$2b$12$xS/hFMC1mbpcl.8JMhyMl.9uP9pO3i6dMJV9h3lkMNICz/4wcSb0u', // password123
    department: 'IT',
    email: 'sari@inventory.com',
    status: 'aktif'
  },
  {
    id: '3',
    username: 'supervisor_andi',
    name: 'Andi Wijaya',
    role: 'supervisor',
    password: '$2b$12$xS/hFMC1mbpcl.8JMhyMl.9uP9pO3i6dMJV9h3lkMNICz/4wcSb0u', // password123
    department: 'Gudang',
    email: 'andi@inventory.com',
    status: 'aktif'
  }
];

function getClientIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0] ||
         req.headers.get('x-real-ip') ||
         req.headers.get('cf-connecting-ip') ||
         'unknown';
}

function checkRateLimit(ip: string): boolean {
  // Lebih longgar untuk development - 50 percobaan dalam 15 menit
  const MAX_ATTEMPTS = 50;
  const WINDOW_MS = 15 * 60 * 1000;
  
  const now = Date.now();
  const attempt = loginAttempts.get(ip);
  
  if (!attempt) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now });
    return true;
  }
  
  // Reset if more than 15 minutes passed
  if (now - attempt.lastAttempt > WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now });
    return true;
  }
  
  // Check if exceeded limit (lebih longgar untuk development)
  if (attempt.count >= MAX_ATTEMPTS) {
    return false;
  }
  
  attempt.count++;
  attempt.lastAttempt = now;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const clientIP = getClientIP(req);
    
    // Check rate limiting (lebih longgar untuk development)
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        apiResponse(false, null, 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.'),
        { status: 429 }
      );
    }

    const body = await req.json();
    const sanitizedBody = sanitizeInput(body);

    // Validate input
    try {
      await loginSchema.validate(sanitizedBody, { abortEarly: false });
    } catch (validationError: any) {
      return NextResponse.json(
        apiResponse(false, null, 'Data tidak valid', validationError.errors?.join(', ')),
        { status: 400 }
      );
    }

    const { username, password } = sanitizedBody;

    // Try database first, fallback to hardcoded users if database unavailable
    let user = null;
    let usingFallback = false;

    try {
      // Attempt database connection
      await connectDB();
      user = await User.findOne({ 
        username: { $regex: new RegExp(`^${username}$`, 'i') } 
      });
      console.log(`🔍 Database user search for '${username}':`, user ? 'Found' : 'Not found');
      
    } catch (dbError) {
      console.log('🔄 Database unavailable, using fallback authentication');
      console.log('Database error:', dbError);
      usingFallback = true;
      
      // Use fallback users for testing
      user = fallbackUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
      console.log(`🔍 Fallback user search for '${username}':`, user ? 'Found' : 'Not found');
    }

    if (!user) {
      console.log(`❌ User '${username}' not found in ${usingFallback ? 'fallback' : 'database'}`);
      return NextResponse.json(
        apiResponse(false, null, 'Username atau password salah'),
        { status: 401 }
      );
    }

    if (!usingFallback && user.status !== 'aktif') {
      return NextResponse.json(
        apiResponse(false, null, 'Akun tidak aktif. Hubungi administrator.'),
        { status: 401 }
      );
    }

    // Verify password
    let passwordValid = false;
    try {
      if (usingFallback) {
        passwordValid = await bcrypt.compare(password, user.password);
      } else {
        passwordValid = await comparePassword(password, user.password);
      }
      console.log(`🔑 Password verification for '${username}':`, passwordValid ? 'Valid' : 'Invalid');
    } catch (passwordError) {
      console.error('Password verification error:', passwordError);
      passwordValid = false;
    }

    if (!passwordValid) {
      return NextResponse.json(
        apiResponse(false, null, 'Username atau password salah'),
        { status: 401 }
      );
    }

    // Reset rate limit on successful login
    loginAttempts.delete(clientIP);

    // Generate token
    const token = generateToken({
      id: user.id || user._id,
      username: user.username,
      role: user.role
    });

    // Prepare user data (exclude password)
    const userData = {
      id: user.id || user._id,
      username: user.username,
      name: user.name,
      role: user.role,
      department: user.department,
      email: user.email,
      status: user.status || 'aktif'
    };

    const responseMessage = usingFallback 
      ? 'Login berhasil (menggunakan data testing - database tidak tersedia)'
      : 'Login berhasil';

    console.log(`✅ Login successful for user '${username}' (${usingFallback ? 'fallback' : 'database'})`);

    // Create audit log only if database is available
    if (!usingFallback) {
      try {
        const { createAuditLog } = await import('../../../../lib/utils');
        await createAuditLog(
          user._id.toString(),
          user.username,
          'LOGIN',
          `User logged in from IP: ${clientIP}`,
          'AUTH',
          user._id.toString(),
          req
        );
      } catch (auditError) {
        console.log('Audit log failed (non-critical):', auditError);
      }
    }

    return NextResponse.json(
      apiResponse(true, { user: userData, token }, responseMessage),
      { status: 200 }
    );

  } catch (error) {
    console.error('Login error:', error);
    
    if (error instanceof AppError) {
      return NextResponse.json(
        apiResponse(false, null, error.message),
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      apiResponse(false, null, 'Terjadi kesalahan server', error instanceof Error ? error.message : 'Unknown error'),
      { status: 500 }
    );
  }
}