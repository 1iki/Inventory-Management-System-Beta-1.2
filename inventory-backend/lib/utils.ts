import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import { NextRequest } from 'next/server';
import { Document } from 'mongoose';
import { config } from './config';
import { connectDB } from './db';

// ==================== ERROR HANDLING ====================

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  code?: string;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function handleDatabaseError(error: any): AppError {
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0];
    const value = error.keyValue?.[field];
    return new AppError(
      `${field} '${value}' sudah digunakan. Silakan gunakan ${field} yang berbeda.`,
      409,
      true,
      'DUPLICATE_KEY'
    );
  }

  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors as any).map((e: any) => e.message);
    return new AppError(
      `Validation error: ${errors.join(', ')}`,
      400,
      true,
      'VALIDATION_ERROR'
    );
  }

  if (error.name === 'CastError') {
    return new AppError(
      `Invalid ${error.path}: ${error.value}`,
      400,
      true,
      'INVALID_ID'
    );
  }

  if (error.name === 'MongoNetworkError') {
    return new AppError(
      'Database connection error. Please try again later.',
      503,
      true,
      'DB_NETWORK_ERROR'
    );
  }

  if (error.name === 'MongoTimeoutError') {
    return new AppError(
      'Database operation timeout. Please try again.',
      504,
      true,
      'DB_TIMEOUT'
    );
  }

  return new AppError('Database operation failed', 500, false, 'DB_ERROR');
}

// ==================== JWT UTILITIES ====================

export function generateToken(payload: { id: string; username: string; role: string }): string {
  return jwt.sign(
    {
      ...payload,
      iss: config.jwt.issuer,
      aud: config.jwt.audience,
      iat: Math.floor(Date.now() / 1000)
    },
    config.jwt.secret,
    { expiresIn: '24h' } // Use literal string instead of config value
  );
}

export function generateRefreshToken(payload: { id: string; username: string }): string {
  return jwt.sign(
    {
      id: payload.id,
      username: payload.username,
      type: 'refresh',
      iss: config.jwt.issuer,
      aud: config.jwt.audience
    },
    config.jwt.secret,
    { expiresIn: '7d' } // Use literal string instead of config value
  );
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, config.jwt.secret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience
    });
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Token expired', 401, true, 'TOKEN_EXPIRED');
    } else if (error.name === 'JsonWebTokenError') {
      throw new AppError('Invalid token', 401, true, 'INVALID_TOKEN');
    } else if (error.name === 'NotBeforeError') {
      throw new AppError('Token not active', 401, true, 'TOKEN_NOT_ACTIVE');
    }
    throw new AppError('Token verification failed', 401, true, 'TOKEN_VERIFICATION_FAILED');
  }
}

export function verifyRefreshToken(token: string): any {
  try {
    const decoded: any = jwt.verify(token, config.jwt.secret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience
    });
    
    if (decoded.type !== 'refresh') {
      throw new AppError('Invalid refresh token', 401, true, 'INVALID_REFRESH_TOKEN');
    }
    
    return decoded;
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    throw new AppError('Refresh token verification failed', 401, true, 'REFRESH_TOKEN_VERIFICATION_FAILED');
  }
}

// ==================== PASSWORD UTILITIES ====================

export async function hashPassword(password: string): Promise<string> {
  try {
    if (!password || password.length < 6) {
      throw new AppError('Password minimal 6 karakter', 400);
    }
    return await bcrypt.hash(password, config.security.bcryptRounds);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Password hashing failed', 500, false, 'HASH_ERROR');
  }
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  try {
    if (!password || !hash) {
      throw new AppError('Password atau hash tidak valid', 400);
    }
    return await bcrypt.compare(password, hash);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Password comparison failed', 500, false, 'COMPARE_ERROR');
  }
}

export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < config.security.passwordMinLength) {
    errors.push(`Password must be at least ${config.security.passwordMinLength} characters long`);
  }
  
  if (config.security.passwordRequireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (config.security.passwordRequireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (config.security.passwordRequireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// ==================== API RESPONSE ====================

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export function apiResponse<T = any>(
  success: boolean,
  data: T | null,
  message: string,
  error?: string,
  pagination?: PaginationMeta,
  metadata?: Record<string, any>
) {
  const response: any = {
    success,
    message,
    timestamp: new Date().toISOString(),
    data,
  };

  if (error && config.app.nodeEnv === 'development') {
    response.error = error;
  }

  if (pagination) {
    response.pagination = pagination;
  }

  if (metadata) {
    response.metadata = metadata;
  }

  return response;
}

export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
}

// ==================== VALIDATION ====================

export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string): boolean {
  return /^(\+62|62|0)[0-9]{8,13}$/.test(phone.replace(/[-()\s]/g, ''));
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function validatePhoneNumber(phone: string): boolean {
  return isValidPhone(phone);
}

export function validateObjectId(id: string): boolean {
  return isValidObjectId(id);
}

export function validateEmail(email: string): boolean {
  return isValidEmail(email);
}

// ==================== INPUT SANITIZATION ====================

export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input
      .trim()
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }

  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const key in input) {
      if (Object.prototype.hasOwnProperty.call(input, key)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          continue;
        }
        const sanitizedKey = sanitizeInput(key);
        sanitized[sanitizedKey] = sanitizeInput(input[key]);
      }
    }
    return sanitized;
  }

  return input;
}

export function sanitizeMongoQuery(query: any): any {
  if (typeof query !== 'object' || query === null) {
    return query;
  }

  const sanitized: any = {};
  
  for (const key in query) {
    if (Object.prototype.hasOwnProperty.call(query, key)) {
      if (key.startsWith('$')) {
        continue;
      }
      
      const value = query[key];
      
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeMongoQuery(value);
      } else {
        sanitized[key] = sanitizeInput(value);
      }
    }
  }
  
  return sanitized;
}

// ==================== UNIQUE ID GENERATION ====================

export function generateUniqueId(prefix: string = 'ID'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generate UML Unique ID with format:
 * UML-(SupplierPartNumber)-(SupplierId)-(Quantity)-(LotId)/(Year)
 * 
 * Example: UML-BRK789-SUP001-500-LOTA003/2025
 * 
 * @param supplierPartNumber - Part number dari supplier
 * @param supplierId - ID Supplier (misal: SUP-001)
 * @param quantity - Jumlah quantity
 * @param lotId - Lot ID
 * @returns Unique ID dengan format UML
 */
export function generateUMLUniqueId(
  supplierPartNumber: string,
  supplierId: string,
  quantity: number,
  lotId: string
): string {
  const currentYear = new Date().getFullYear();
  
  // Sanitize inputs - remove special characters and spaces, uppercase
  const cleanSupplierPartNo = supplierPartNumber
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .substring(0, 20); // Limit length
  
  const cleanSupplierId = supplierId
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .substring(0, 10); // Limit length
  
  const cleanLotId = lotId
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .substring(0, 15); // Limit length
  
  // Format: UML-(SupplierPartNumber)-(SupplierId)-(Quantity)-(LotId)/(Year)
  return `UML-${cleanSupplierPartNo}-${cleanSupplierId}-${quantity}-${cleanLotId}/${currentYear}`;
}

export function generateBarcode(type: string, sequence: number): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const seq = sequence.toString().padStart(6, '0');
  return `${type}${year}${month}${seq}`;
}

export function generateQRCodeData(item: {
  uniqueId: string;
  partName: string;
  poNumber: string;
  quantity: number;
  lotId: string;
}): string {
  return JSON.stringify({
    id: item.uniqueId,
    part: item.partName,
    po: item.poNumber,
    qty: item.quantity,
    lot: item.lotId,
    ts: Date.now(),
  });
}

// ==================== QR CODE ====================

export const generateQRCode = async (data: string): Promise<string> => {
  try {
    if (!data || data.trim().length === 0) {
      throw new Error('Data QR code tidak boleh kosong');
    }

    const qrCodeDataURL = await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 256
    });
    return qrCodeDataURL;
  } catch (error) {
    throw new AppError('Gagal membuat QR code: ' + (error instanceof Error ? error.message : 'Unknown error'), 500);
  }
};

// ==================== AUDIT LOGGING ====================

export async function createAuditLog(
  userId: string,
  username: string,
  action: string,
  details: string,
  resourceType?: string,
  resourceId?: string,
  request?: NextRequest
): Promise<void> {
  try {
    const { AuditLog } = await import('./models');
    
    const ipAddress = request?.headers.get('x-forwarded-for')?.split(',')[0] ||
                     request?.headers.get('x-real-ip') ||
                     request?.headers.get('cf-connecting-ip') ||
                     'unknown';
    
    const userAgent = request?.headers.get('user-agent') || 'unknown';

    await AuditLog.create({
      userId,
      username,
      action,
      details,
      resourceType,
      resourceId,
      ipAddress,
      userAgent,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

export async function createBatchAuditLogs(
  logs: Array<{
    userId: string;
    username: string;
    action: string;
    details: string;
    resourceType?: string;
    resourceId?: string;
  }>
): Promise<void> {
  try {
    const { AuditLog } = await import('./models');
    
    const auditLogs = logs.map(log => ({
      ...log,
      timestamp: new Date(),
      ipAddress: 'batch-operation',
      userAgent: 'system'
    }));
    
    await AuditLog.insertMany(auditLogs);
  } catch (error) {
    console.error('Failed to create batch audit logs:', error);
  }
}

// ==================== DATE/TIME UTILITIES ====================

export function formatDate(date: Date, locale: string = 'id-ID'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta'
  }).format(date);
}

export function formatDateID(date: Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export function parseDate(dateString: string): Date {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new AppError('Format tanggal tidak valid', 400);
  }
  return date;
}

export function getDateRange(range: 'today' | 'week' | 'month' | 'year'): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  
  switch (range) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'week':
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
      start.setMonth(start.getMonth() - 1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'year':
      start.setFullYear(start.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
      break;
  }
  
  return { start, end };
}

// ==================== QUERY HELPERS ====================

export function getPaginationParams(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));
  const skip = (page - 1) * limit;
  
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortOrder };

  return { page, limit, skip, sort };
}

export function buildSearchQuery(searchTerm: string, fields: string[]) {
  if (!searchTerm) return {};
  
  const regex = new RegExp(searchTerm, 'i');
  return {
    $or: fields.map(field => ({ [field]: regex }))
  };
}

export function buildSortQuery(sortBy?: string, sortOrder?: 'asc' | 'desc') {
  if (!sortBy) return { createdAt: -1 };
  
  return { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
}

// ==================== PERFORMANCE UTILITIES ====================

export async function measureExecutionTime<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    console.log(`⏱️  ${label} completed in ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.log(`❌ ${label} failed after ${duration}ms`);
    throw error;
  }
}

export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  
  throw lastError;
}

// ==================== RATE LIMITING ====================

export function rateLimit(options: {
  windowMs: number;
  max: number;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: any) => string;
}) {
  const requests = new Map();

  return (req: Request): boolean => {
    const keyGen = options.keyGenerator || ((r: any) => 
      r.headers.get('x-forwarded-for') || r.headers.get('x-real-ip') || 'unknown'
    );
    
    const key = keyGen(req);
    const now = Date.now();
    const windowStart = now - options.windowMs;

    if (!requests.has(key)) {
      requests.set(key, []);
    }

    const userRequests = requests.get(key);
    const validRequests = userRequests.filter((time: number) => time > windowStart);
    
    if (validRequests.length >= options.max) {
      return false;
    }

    validRequests.push(now);
    requests.set(key, validRequests);

    if (requests.size > 1000) {
      const cutoff = now - options.windowMs;
      for (const [k, v] of requests.entries()) {
        const validReqs = v.filter((time: number) => time > cutoff);
        if (validReqs.length === 0) {
          requests.delete(k);
        } else {
          requests.set(k, validReqs);
        }
      }
    }

    return true;
  };
}

export function asyncHandler(fn: Function) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ==================== PO NUMBER SYNC ====================

export const syncPONumberToReports = async (poId: string, poNumber: string): Promise<number> => {
  try {
    const { Report } = await import('./models');
    
    const result = await Report.updateMany(
      { poId },
      { $set: { poNumber } }
    );
    
    return result.modifiedCount || 0;
  } catch (error) {
    console.error('Error syncing PO Number to Reports:', error);
    throw new AppError('Gagal sinkronisasi PO Number', 500);
  }
};

export async function syncPONumberInReports(poId: string, newPONumber: string): Promise<void> {
  try {
    await connectDB();
    
    const { Report } = await import('./models');
    const reports = await Report.find({ poId }).lean();
    
    if (!reports || reports.length === 0) {
      console.log(`No reports found for PO ID: ${poId}`);
      return;
    }

    let updatedCount = 0;
    for (const report of reports) {
      const reportData = report as any;
      if (reportData.poNumber !== newPONumber) {
        await Report.updateOne(
          { _id: reportData._id },
          { $set: { poNumber: newPONumber } }
        );
        updatedCount++;
      }
    }

    console.log(`✅ Synced PO Number in ${updatedCount} reports for PO ID: ${poId}`);
  } catch (error) {
    console.error('Error syncing PO Number in reports:', error);
    throw error;
  }
}

export const syncAllPONumbersToReports = async (): Promise<{ updated: number; errors: string[] }> => {
  await connectDB();
  
  const errors: string[] = [];
  let updated = 0;

  try {
    const { PurchaseOrder, Report } = await import('./models');
    const purchaseOrders = await PurchaseOrder.find({}).select('_id poNumber').lean();
    
    console.log(`🔄 Syncing ${purchaseOrders.length} PO Numbers to Reports...`);
    
    for (const po of purchaseOrders) {
      try {
        const result = await Report.updateMany(
          { poId: po._id },
          { $set: { poNumber: po.poNumber } }
        );
        
        if (result.modifiedCount > 0) {
          updated += result.modifiedCount;
          console.log(`✅ Updated ${result.modifiedCount} reports for PO ${po.poNumber}`);
        }
      } catch (error) {
        const errorMsg = `Failed to sync PO ${po.poNumber}: ${error}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    
    console.log(`✅ Sync completed: ${updated} reports updated, ${errors.length} errors`);
    return { updated, errors };
    
  } catch (error) {
    console.error('❌ Error syncing PO Numbers:', error);
    throw new AppError('Gagal melakukan sinkronisasi PO Numbers', 500);
  }
};

export const validateAndFixPONumbers = async (): Promise<{
  checked: number;
  fixed: number;
  errors: string[];
}> => {
  try {
    const { Report, PurchaseOrder } = await import('./models');
    
    let checked = 0;
    let fixed = 0;
    const errors: string[] = [];
    
    const reports = await Report.find({ poId: { $exists: true } }).lean();
    
    for (const report of reports) {
      checked++;
      
      try {
        const reportData = report as any;
        const po = await PurchaseOrder.findById(reportData.poId).lean();
        
        if (!po) {
          errors.push(`Report ${reportData._id}: PO tidak ditemukan (${reportData.poId})`);
          continue;
        }
        
        const poData = po as any;
        
        if (reportData.poNumber !== poData.poNumber) {
          await Report.updateOne(
            { _id: reportData._id },
            { $set: { poNumber: poData.poNumber } }
          );
          fixed++;
        }
      } catch (error) {
        errors.push(`Report ${(report as any)._id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return { checked, fixed, errors };
  } catch (error) {
    throw new AppError('Gagal validasi PO Numbers', 500);
  }
};

// ==================== EXPORTS ====================

export * from './validations';

export default {
  AppError,
  handleDatabaseError,
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  hashPassword,
  comparePassword,
  validatePasswordStrength,
  apiResponse,
  createPaginationMeta,
  isValidObjectId,
  isValidEmail,
  isValidPhone,
  isValidUrl,
  sanitizeInput,
  sanitizeMongoQuery,
  generateUniqueId,
  generateUMLUniqueId, // 🆕 Export fungsi baru
  generateQRCodeData,
  createAuditLog,
  createBatchAuditLogs,
  formatDateID,
  getDateRange,
  buildSearchQuery,
  buildSortQuery,
  measureExecutionTime,
  retryOperation
};