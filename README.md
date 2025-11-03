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

### ⚡ Super Quick (Recommended)

```bash
# Setup and deploy in one command
make init && make deploy
```

**Access:**
- Frontend: http://10.0.10.141
- Backend API: http://10.0.10.141:3001

### 📝 Step by Step

#### 1. Setup Environment
```bash
# Copy and configure environment files
make setup-env

# Edit MongoDB URI and other settings
nano inventory-backend/.env.local
nano inventory-frontend/.env.local
```

#### 2. Choose Deployment Method

**Option A: Docker (Easiest)**
```bash
./quick-deploy.sh deploy
```

**Option B: Production with PM2**
```bash
./production-deploy.sh
```

**Option C: Development Mode**
```bash
make dev
```

#### 3. Verify Deployment
```bash
./health-check.sh
```

### 📚 Full Documentation
- **Quick Start**: See [QUICKSTART.md](QUICKSTART.md)
- **Complete Guide**: See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- **Status Check**: Run `./deployment-status.sh`

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

### Deployment Methods

#### Method 1: Docker (Recommended) 🐳
```bash
# Test configuration
./test-deployment.sh

# Deploy
./quick-deploy.sh deploy

# Check status
./health-check.sh
```

#### Method 2: Production (PM2 + Nginx) 🚀
```bash
# Full production deployment with PM2
./production-deploy.sh

# Monitor
pm2 monit
pm2 logs inventory-backend
```

#### Method 3: Using Makefile ⚡
```bash
make help           # Show all commands
make deploy         # Deploy with Docker
make deploy-prod    # Production deployment
make health         # Health check
make logs           # View logs
make backup         # Create backup
```

### Quick Commands Reference

```bash
# Deployment
./quick-deploy.sh deploy        # Docker deployment
./production-deploy.sh          # Production with PM2
make deploy                     # Makefile deploy

# Monitoring
./health-check.sh               # Health check
./deployment-status.sh          # System status
docker-compose logs -f          # View logs

# Management
docker-compose up -d            # Start services
docker-compose down             # Stop services
docker-compose restart          # Restart services
pm2 restart inventory-backend   # Restart backend
```

### Complete Deployment Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - 5-minute quick start
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Comprehensive guide
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Step-by-step checklist
- **[DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md)** - Overview and reference

### Production Checklist

- [ ] Configure MongoDB URI in `inventory-backend/.env.local`
- [ ] Change JWT_SECRET to strong random string
- [ ] Update CORS origins with production domain
- [ ] Setup SSL/HTTPS certificates
- [ ] Configure domain name
- [ ] Setup monitoring and backups
- [ ] Review security settings
- [ ] Test all functionality

### CI/CD Pipeline

GitHub Actions workflow included in `.github/workflows/deploy.yml`:
- Automated testing
- Docker image building
- Deployment to production
- Health checks

### Kubernetes Deployment (Optional)

For advanced scaling, see `k8s-deployment.yaml` for Kubernetes manifests.

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