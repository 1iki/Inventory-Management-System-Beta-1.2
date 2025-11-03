import React, { useState, useEffect } from 'react';
import { useInventoryStore } from '../store/inventory';
import { LogIn, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  
  const { login, isLoading, currentUser } = useInventoryStore();

  // Auto-login for development
  useEffect(() => {
    const autoLogin = import.meta.env.VITE_AUTO_LOGIN === 'true';
    const defaultUsername = import.meta.env.VITE_DEFAULT_USERNAME;
    const defaultPassword = import.meta.env.VITE_DEFAULT_PASSWORD;
    
    if (autoLogin && defaultUsername && defaultPassword) {
      setUsername(defaultUsername);
      setPassword(defaultPassword);
    }
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser && currentUser.id !== 'guest') {
      // User is already logged in, could redirect to dashboard
      // For SPA, this would be handled by routing
    }
  }, [currentUser]);

  const validateForm = () => {
    const newErrors: { username?: string; password?: string } = {};
    
    if (!username.trim()) {
      newErrors.username = 'Username harus diisi';
    } else if (username.length < 3) {
      newErrors.username = 'Username minimal 3 karakter';
    }
    
    if (!password) {
      newErrors.password = 'Password harus diisi';
    } else if (password.length < 6) {
      newErrors.password = 'Password minimal 6 karakter';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await login(username.trim(), password);
      
      // Clear form
      setUsername('');
      setPassword('');
      setErrors({});
      
      // The store will handle the redirect via the App component
      toast.success('Login berhasil! Mengalihkan ke dashboard...');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Terjadi kesalahan saat login');
    }
  };

  const clearError = (field: 'username' | 'password') => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Default users for quick login (development only)
  const defaultUsers = [
    { username: 'direktur_budi', role: 'Direktur', password: 'password123' },
    { username: 'manager_sari', role: 'Manager', password: 'password123' },
    { username: 'admin_dedi', role: 'Admin', password: 'password123' },
    { username: 'staff_dian', role: 'Staff', password: 'password123' },
  ];

  const handleQuickLogin = (user: typeof defaultUsers[0]) => {
    setUsername(user.username);
    setPassword(user.password);
    setErrors({});
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <LogIn className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Inventory System
            </h1>
            <p className="text-gray-600">
              Masuk ke dashboard inventory Anda
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <div className="relative">
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    clearError('username');
                  }}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.username ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Masukkan username"
                  disabled={isLoading}
                />
                <AnimatePresence>
                  {errors.username && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute -bottom-6 left-0 flex items-center text-red-600 text-sm"
                    >
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.username}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearError('password');
                  }}
                  className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Masukkan password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
                <AnimatePresence>
                  {errors.password && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute -bottom-6 left-0 flex items-center text-red-600 text-sm"
                    >
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.password}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5 mr-2" />
                  Masuk
                </>
              )}
            </button>
          </form>

          {/* Development Quick Login */}
          {import.meta.env.DEV && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center mb-4">
                Development - Quick Login:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {defaultUsers.map((user) => (
                  <button
                    key={user.username}
                    onClick={() => handleQuickLogin(user)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded transition-colors"
                    disabled={isLoading}
                  >
                    {user.role}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Inventory Management System v1.0
            </p>
          </div>
        </motion.div>

        {/* System Status */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 text-center"
        >
          <div className="inline-flex items-center text-sm text-gray-600 bg-white px-4 py-2 rounded-full shadow-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            System Online
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;