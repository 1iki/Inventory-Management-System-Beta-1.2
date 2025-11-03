# Inventory Management System

Sistem manajemen inventory berbasis QR Code dengan teknologi modern.

## 🚀 Fitur Utama

- **QR Code Scanning**: Scan in/out inventory dengan QR code
- **Real-time Dashboard**: Monitor inventory secara real-time
- **Offline Support**: Bekerja offline dengan sync otomatis
- **Role-based Access**: Multi-level user management
- **Audit Trail**: Tracking lengkap semua aktivitas
- **PWA Support**: Install sebagai aplikasi mobile/desktop
- **Export Reports**: Export data ke Excel/PDF

## 🛠 Tech Stack

### Backend
- **Next.js 16** - Full-stack React framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **QRCode** - QR code generation

### Frontend
- **React 19** - UI library
- **Vite** - Build tool
- **Zustand** - State management
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **React Hook Form** - Form handling
- **Axios** - HTTP client

## 📋 Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- **MongoDB** >= 6.0

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone <repository-url>
cd inventory-system
```

### 2. Backend Setup
```bash
cd inventory-backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit environment variables
nano .env.local

# Setup database
npm run seed

# Start development server
npm run dev
```

### 3. Frontend Setup
```bash
cd inventory-frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit environment variables
nano .env.local

# Start development server
npm run dev
```

### 4. Access Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api

## ⚙️ Environment Variables

### Backend (.env.local)
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/inventory_system

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Application
NODE_ENV=development
PORT=3001

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Frontend (.env.local)
```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:3001/api
VITE_API_TIMEOUT=30000

# Development
VITE_AUTO_LOGIN=false
VITE_DEFAULT_USERNAME=
VITE_DEFAULT_PASSWORD=

# Features
VITE_ENABLE_QR_SCANNER=true
VITE_ENABLE_OFFLINE_MODE=true
VITE_ENABLE_PWA=true
```

## 👥 Default Users

Setelah menjalankan `npm run seed`:

| Username | Password | Role | Akses |
|----------|----------|------|--------|
| direktur_budi | password123 | direktur | Full access |
| manager_sari | password123 | manager | Management access |
| admin_dedi | password123 | admin | Admin access |
| staff_dian | password123 | staff | Basic access |

## 📱 User Roles & Permissions

### Direktur
- Dashboard overview
- Semua reports
- User management
- Master data management
- Approve delete requests

### Manager
- Dashboard overview
- Reports (limited)
- Master data view/edit
- Approve delete requests

### Admin
- Dashboard
- Master data CRUD
- Inventory management
- User management (limited)

### Staff
- Scan in/out inventory
- View own activities
- Request item deletion

## 🔧 Development Commands

### Backend
```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run seed         # Seed database
npm run test-db      # Test database connection
```

### Frontend
```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## 📊 Database Schema

### Collections
- **users** - User management
- **customers** - Customer data
- **parts** - Part/product data
- **purchaseorders** - Purchase orders
- **inventoryitems** - Inventory items with QR codes
- **auditlogs** - Activity logs

## 🔒 Security Features

- **JWT Authentication** with refresh tokens
- **Rate limiting** for API endpoints
- **Input validation** and sanitization
- **CORS protection**
- **Password hashing** with bcrypt
- **SQL injection prevention**
- **XSS protection**

## 📱 PWA Features

- **Offline functionality** with service worker
- **Install prompt** for mobile/desktop
- **Background sync** when online
- **Cache strategies** for optimal performance
- **Push notifications** (configurable)

## 🚀 Deployment

### Production Environment

1. **Database Setup**
```bash
# MongoDB Atlas or self-hosted
# Update MONGODB_URI in production
```

2. **Backend Deployment**
```bash
# Build
npm run build

# Set production environment variables
# Deploy to Vercel/Netlify/VPS
```

3. **Frontend Deployment**
```bash
# Build
npm run build

# Deploy dist/ folder to CDN/hosting
```

### Docker Deployment (Optional)
```bash
# Build containers
docker-compose build

# Start services
docker-compose up -d

# Access at http://localhost:3000
```

## 🧪 Testing

### Backend Testing
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# API tests
npm run test:api
```

### Frontend Testing
```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

## 📈 Monitoring & Analytics

- **Error tracking** with Sentry (optional)
- **Performance monitoring** with Web Vitals
- **User analytics** with Google Analytics (optional)
- **API monitoring** with health checks

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Error**
```bash
# Check MongoDB is running
mongosh
# Verify connection string in .env.local
```

2. **CORS Error**
```bash
# Check CORS_ORIGINS in backend .env.local
# Verify frontend URL is included
```

3. **Build Errors**
```bash
# Clear cache
npm run clean
rm -rf node_modules package-lock.json
npm install
```

4. **QR Scanner Not Working**
```bash
# Check browser permissions for camera
# Ensure HTTPS in production
# Verify VITE_ENABLE_QR_SCANNER=true
```

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 Changelog

### v1.0.0 (Current)
- Initial release
- QR code scanning
- Offline support
- PWA implementation
- Role-based access control
- Comprehensive audit logging

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README
- **Issues**: Create GitHub issue
- **Email**: support@company.com

## 🙏 Acknowledgments

- React team for React 19
- Vercel team for Next.js
- MongoDB team for database
- All open source contributors
