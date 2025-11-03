import {
  AppError,
  handleDatabaseError,
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  validatePasswordStrength,
  isValidEmail,
  isValidPhone,
  isValidObjectId,
  sanitizeInput,
  sanitizeMongoQuery,
  generateUniqueId,
  createPaginationMeta,
} from '../utils';

describe('Utils - Error Handling', () => {
  test('AppError should create error with correct properties', () => {
    const error = new AppError('Test error', 400, true, 'TEST_ERROR');
    
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(400);
    expect(error.isOperational).toBe(true);
    expect(error.code).toBe('TEST_ERROR');
  });

  test('handleDatabaseError should handle duplicate key error', () => {
    const dbError = {
      code: 11000,
      keyPattern: { email: 1 },
      keyValue: { email: 'test@example.com' }
    };
    
    const error = handleDatabaseError(dbError);
    
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('DUPLICATE_KEY');
    expect(error.message).toContain('email');
  });

  test('handleDatabaseError should handle validation error', () => {
    const dbError = {
      name: 'ValidationError',
      errors: {
        name: { message: 'Name is required' },
        email: { message: 'Email is invalid' }
      }
    };
    
    const error = handleDatabaseError(dbError);
    
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
  });
});

describe('Utils - JWT', () => {
  test('generateToken should create valid JWT token', () => {
    const payload = { id: '123', username: 'testuser', role: 'staff' };
    const token = generateToken(payload);
    
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
  });

  test('verifyToken should decode valid token', () => {
    const payload = { id: '123', username: 'testuser', role: 'staff' };
    const token = generateToken(payload);
    const decoded = verifyToken(token);
    
    expect(decoded.id).toBe(payload.id);
    expect(decoded.username).toBe(payload.username);
    expect(decoded.role).toBe(payload.role);
  });

  test('verifyToken should throw error for invalid token', () => {
    expect(() => verifyToken('invalid.token.here')).toThrow(AppError);
  });
});

describe('Utils - Password', () => {
  test('hashPassword should hash password correctly', async () => {
    const password = 'TestPassword123!';
    const hash = await hashPassword(password);
    
    expect(hash).toBeTruthy();
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(50);
  });

  test('hashPassword should reject weak passwords', async () => {
    await expect(hashPassword('12345')).rejects.toThrow(AppError);
  });

  test('comparePassword should return true for matching passwords', async () => {
    const password = 'TestPassword123!';
    const hash = await hashPassword(password);
    const isMatch = await comparePassword(password, hash);
    
    expect(isMatch).toBe(true);
  });

  test('comparePassword should return false for non-matching passwords', async () => {
    const password = 'TestPassword123!';
    const hash = await hashPassword(password);
    const isMatch = await comparePassword('WrongPassword', hash);
    
    expect(isMatch).toBe(false);
  });

  test('validatePasswordStrength should validate strong password', () => {
    const result = validatePasswordStrength('StrongP@ss123');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('validatePasswordStrength should reject weak password', () => {
    const result = validatePasswordStrength('weak');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('Utils - Validation', () => {
  test('isValidEmail should validate correct emails', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name+tag@example.co.uk')).toBe(true);
  });

  test('isValidEmail should reject invalid emails', () => {
    expect(isValidEmail('invalid')).toBe(false);
    expect(isValidEmail('test@')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
  });

  test('isValidPhone should validate Indonesian phone numbers', () => {
    expect(isValidPhone('+628123456789')).toBe(true);
    expect(isValidPhone('08123456789')).toBe(true);
    expect(isValidPhone('628123456789')).toBe(true);
  });

  test('isValidPhone should reject invalid phone numbers', () => {
    expect(isValidPhone('123')).toBe(false);
    expect(isValidPhone('invalid')).toBe(false);
  });

  test('isValidObjectId should validate MongoDB ObjectIds', () => {
    expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
    expect(isValidObjectId('507f1f77bcf86cd799439012')).toBe(true);
  });

  test('isValidObjectId should reject invalid ObjectIds', () => {
    expect(isValidObjectId('invalid')).toBe(false);
    expect(isValidObjectId('123')).toBe(false);
    expect(isValidObjectId('507f1f77bcf86cd79943901')).toBe(false); // Too short
  });
});

describe('Utils - Input Sanitization', () => {
  test('sanitizeInput should remove dangerous HTML', () => {
    const input = '<script>alert("xss")</script>Hello';
    const sanitized = sanitizeInput(input);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('Hello');
  });

  test('sanitizeInput should remove javascript: protocol', () => {
    const input = 'javascript:alert("xss")';
    const sanitized = sanitizeInput(input);
    expect(sanitized).not.toContain('javascript:');
  });

  test('sanitizeInput should handle objects recursively', () => {
    const input = {
      name: '<script>test</script>',
      email: 'test@example.com',
      nested: {
        value: 'javascript:alert(1)'
      }
    };
    
    const sanitized = sanitizeInput(input);
    expect(sanitized.name).not.toContain('<script>');
    expect(sanitized.nested.value).not.toContain('javascript:');
  });

  test('sanitizeMongoQuery should remove $ operators', () => {
    const query = {
      username: 'admin',
      $where: 'malicious code'
    };
    
    const sanitized = sanitizeMongoQuery(query);
    expect(sanitized.$where).toBeUndefined();
    expect(sanitized.username).toBe('admin');
  });
});

describe('Utils - ID Generation', () => {
  test('generateUniqueId should create unique IDs', () => {
    const id1 = generateUniqueId('TEST');
    const id2 = generateUniqueId('TEST');
    
    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
    expect(id1).toContain('TEST-');
  });

  test('generateUniqueId should use default prefix', () => {
    const id = generateUniqueId();
    expect(id).toContain('ID-');
  });
});

describe('Utils - Pagination', () => {
  test('createPaginationMeta should calculate correctly', () => {
    const meta = createPaginationMeta(1, 10, 95);
    
    expect(meta.page).toBe(1);
    expect(meta.limit).toBe(10);
    expect(meta.total).toBe(95);
    expect(meta.totalPages).toBe(10);
    expect(meta.hasNextPage).toBe(true);
    expect(meta.hasPrevPage).toBe(false);
  });

  test('createPaginationMeta should handle last page', () => {
    const meta = createPaginationMeta(3, 10, 25);
    
    expect(meta.totalPages).toBe(3);
    expect(meta.hasNextPage).toBe(false);
    expect(meta.hasPrevPage).toBe(true);
  });

  test('createPaginationMeta should handle single page', () => {
    const meta = createPaginationMeta(1, 10, 5);
    
    expect(meta.totalPages).toBe(1);
    expect(meta.hasNextPage).toBe(false);
    expect(meta.hasPrevPage).toBe(false);
  });
});
